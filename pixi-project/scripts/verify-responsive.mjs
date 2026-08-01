/**
 * Automated responsive verification sweep.
 *
 * Boots the production build in headless Chromium and, for every required
 * resolution in both orientations, asserts that:
 *
 *   - the canvas exactly fills the viewport (no letterbox / black borders)
 *   - the backing store matches the device pixel ratio (Retina sharpness)
 *   - the board keeps its 16:9 aspect ratio and is scaled uniformly
 *   - the board is fully inside its region (nothing clipped)
 *   - no two UI elements overlap
 *   - every control is inside the safe area and stays tappable
 *   - rotating the viewport re-lays out without a reload
 *
 * Usage: npm run verify:responsive [-- --shots]
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { createServer } from "node:net";

const SHOTS = process.argv.includes("--shots");
const SHOT_DIR = new URL("../.responsive-shots/", import.meta.url).pathname;

/** The required verification matrix. */
const SIZES = [
  [320, 568],
  [375, 667],
  [390, 844],
  [414, 896],
  [768, 1024],
  [1024, 768],
  [1280, 720],
  [1366, 768],
  [1920, 1080],
  [2560, 1440],
];

const DPRS = [1, 2, 3];

/** Grab a port the OS says is free, so repeat runs never collide. */
function findFreePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function startServer(port, baseUrl) {
  const child = spawn(
    "npx",
    [
      "vite",
      "preview",
      "--port",
      String(port),
      "--strictPort",
      "--host",
      "127.0.0.1",
    ],
    { cwd: new URL("..", import.meta.url).pathname, stdio: ["ignore", "pipe", "pipe"] },
  );
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return child;
    } catch {
      /* not up yet */
    }
    await delay(250);
  }
  child.kill();
  throw new Error("vite preview did not start in time");
}

/**
 * Launch Chromium, preferring a browser already present on the machine
 * (CHROMIUM_PATH, or a CI image's shared install) over Playwright's own
 * download, which may not match the installed package version.
 */
async function launchBrowser() {
  const candidates = [process.env.CHROMIUM_PATH, "/opt/pw-browsers/chromium"].filter(
    (path) => path && existsSync(path),
  );
  // SwiftShader gives headless containers a working WebGL implementation;
  // the shm/sandbox flags keep Chromium stable inside small containers.
  const args = [
    "--enable-unsafe-swiftshader",
    "--use-gl=swiftshader",
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--disable-gpu-shader-disk-cache",
  ];
  const executablePath = candidates[0];
  return chromium.launch(executablePath ? { executablePath, args } : { args });
}

function overlap(a, b) {
  const tolerance = 1; // sub-pixel rounding
  const x = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const y = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return x > tolerance && y > tolerance ? { x, y } : null;
}

/** Probes that legitimately share space: chips sitting on top of a bet zone. */
function ignorePair(a, b) {
  const pair = [a.name, b.name];
  return pair.every((name) => name.startsWith("zone."));
}

function checkSnapshot(snapshot, [width, height]) {
  const problems = [];
  const {
    context,
    regions,
    boardBounds,
    canvasSize,
    probes,
    worldScale,
    designAspect,
  } = snapshot;

  // --- canvas fills the viewport, at device resolution ----------------------
  if (Math.abs(canvasSize.css.width - width) > 1 || Math.abs(canvasSize.css.height - height) > 1) {
    problems.push(
      `canvas CSS box ${canvasSize.css.width}x${canvasSize.css.height} != viewport ${width}x${height} (black borders)`,
    );
  }
  const expectedBuffer = {
    width: Math.round(canvasSize.css.width * context.resolution),
    height: Math.round(canvasSize.css.height * context.resolution),
  };
  if (
    Math.abs(canvasSize.buffer.width - expectedBuffer.width) > 2 ||
    Math.abs(canvasSize.buffer.height - expectedBuffer.height) > 2
  ) {
    problems.push(
      `backing store ${canvasSize.buffer.width}x${canvasSize.buffer.height} != ${expectedBuffer.width}x${expectedBuffer.height} (not rendering at DPR)`,
    );
  }

  // --- board aspect ratio and containment -----------------------------------
  const aspect = boardBounds.width / boardBounds.height;
  if (Math.abs(aspect - designAspect) > 0.02) {
    problems.push(
      `board aspect ${aspect.toFixed(3)} != ${designAspect.toFixed(3)} (stretched)`,
    );
  }
  const game = regions.game;
  if (
    boardBounds.x < game.x - 1 ||
    boardBounds.y < game.y - 1 ||
    boardBounds.x + boardBounds.width > game.x + game.width + 1 ||
    boardBounds.y + boardBounds.height > game.y + game.height + 1
  ) {
    problems.push("board overflows its region (clipped content)");
  }
  if (worldScale <= 0) problems.push(`invalid world scale ${worldScale}`);

  // --- docked regions never overlap ------------------------------------------
  const docked = [
    ["topBar", regions.topBar],
    ["game", regions.game],
    ["bet", regions.bet],
  ];
  if (!regions.historyCollapsible) docked.push(["history", regions.history]);
  // The collapsed portrait dock is a real docked panel and must not overlap.
  if (regions.historyPeek) docked.push(["historyPeek", regions.historyPeek]);
  for (let i = 0; i < docked.length; i++) {
    for (let j = i + 1; j < docked.length; j++) {
      const hit = overlap(docked[i][1], docked[j][1]);
      if (hit) problems.push(`regions ${docked[i][0]} and ${docked[j][0]} overlap by ${Math.round(hit.x)}x${Math.round(hit.y)}px`);
    }
  }

  // --- UI elements: no overlap, no clipping, still tappable ------------------
  for (let i = 0; i < probes.length; i++) {
    for (let j = i + 1; j < probes.length; j++) {
      if (ignorePair(probes[i], probes[j])) continue;
      const hit = overlap(probes[i], probes[j]);
      if (hit) {
        problems.push(
          `${probes[i].name} overlaps ${probes[j].name} by ${Math.round(hit.x)}x${Math.round(hit.y)}px`,
        );
      }
    }
  }

  const safe = regions.safe;
  for (const probe of probes) {
    if (
      probe.x < safe.x - 1 ||
      probe.y < safe.y - 1 ||
      probe.x + probe.width > safe.x + safe.width + 1 ||
      probe.y + probe.height > safe.y + safe.height + 1
    ) {
      problems.push(`${probe.name} is clipped by the viewport edge`);
    }
    if (probe.touch && !probe.name.startsWith("zone.")) {
      const min = context.minTouch - 1;
      if (probe.touch.width < min || probe.touch.height < min) {
        problems.push(
          `${probe.name} touch target ${Math.round(probe.touch.width)}x${Math.round(probe.touch.height)} < ${context.minTouch}px`,
        );
      }
    }
  }

  return problems;
}

const READ_SNAPSHOT = () => ({
  context: window.__game.context,
  regions: window.__game.regions,
  boardBounds: window.__game.boardBounds,
  designAspect: window.__game.designAspect,
  canvasSize: window.__game.canvasSize,
  worldScale: window.__game.worldScale,
  probes: window.__game.probes,
});

async function run() {
  if (SHOTS) mkdirSync(SHOT_DIR, { recursive: true });
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const server = await startServer(port, baseUrl);
  console.log(`serving ${baseUrl}`);
  const browser = await launchBrowser();
  console.log(`chromium ${browser.version()}\n`);

  let failures = 0;
  let checks = 0;

  try {
    for (const [w, h] of SIZES) {
      for (const [label, size] of [
        ["portrait", [Math.min(w, h), Math.max(w, h)]],
        ["landscape", [Math.max(w, h), Math.min(w, h)]],
      ]) {
        for (const dpr of DPRS) {
          // Skip combinations no real display produces (a 2560 CSS-px viewport
          // at 3x would be a 7680px panel); they only slow the sweep down.
          if (Math.max(...size) * dpr > 4096) continue;

          const context = await browser.newContext({
            viewport: { width: size[0], height: size[1] },
            deviceScaleFactor: dpr,
            hasTouch: size[0] < 1024,
            isMobile: false,
          });
          const page = await context.newPage();
          const errors = [];
          page.on("pageerror", (error) => errors.push(error.message));

          await page.goto(baseUrl, { waitUntil: "load" });
          await page.waitForFunction(() => window.__game?.ready === true, null, {
            timeout: 20_000,
          });
          await delay(120);

          const snapshot = await page.evaluate(READ_SNAPSHOT);
          const problems = checkSnapshot(snapshot, size).concat(errors);

          // Rotate live (no reload) and re-verify: this is the orientation-change path.
          const rotated = [size[1], size[0]];
          await page.setViewportSize({ width: rotated[0], height: rotated[1] });
          await delay(200);
          const rotatedSnapshot = await page.evaluate(READ_SNAPSHOT);
          if (rotatedSnapshot.context.revision <= snapshot.context.revision) {
            problems.push("rotation did not trigger a layout pass");
          }
          problems.push(
            ...checkSnapshot(rotatedSnapshot, rotated).map((p) => `after rotation: ${p}`),
          );

          if (SHOTS && dpr === 2) {
            await page.setViewportSize({ width: size[0], height: size[1] });
            await delay(150);
            await page.screenshot({ path: `${SHOT_DIR}${size[0]}x${size[1]}-${label}.png` });
          }

          checks++;
          const tag = `${String(size[0]).padStart(4)}x${String(size[1]).padStart(4)} @${dpr}x ${label.padEnd(9)} ${snapshot.context.mode.padEnd(17)}`;
          if (problems.length) {
            failures++;
            console.log(`FAIL  ${tag}`);
            for (const problem of problems) console.log(`        - ${problem}`);
          } else {
            console.log(`ok    ${tag}`);
          }

          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
    server.kill();
  }

  console.log(`\n${checks - failures}/${checks} viewport configurations passed`);
  if (failures) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
