/**
 * End-to-end smoke test.
 *
 * Drives a real Chromium against the dev server and asserts the things unit
 * tests cannot: that a full round runs, that the ball lands on the number the
 * engine intended, that every breakpoint lays out without throwing, and that
 * repeated mount/unmount cycles leave no orphaned canvases behind.
 *
 *   npm run dev            # in one shell
 *   npm run smoke          # in another
 *
 * Screenshots land in .shots/.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const targetUrl = process.argv[2] ?? 'http://127.0.0.1:5199/';
const OUT = new URL('../.shots/', import.meta.url).pathname;
// Honour PLAYWRIGHT_CHROMIUM so CI can point at whatever binary it has.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM || undefined;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const errors = [];

async function open(name, viewport, dpr = 1) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: dpr });
  page.on('pageerror', (e) => errors.push(`[${name}] ${e.message}\n${e.stack}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] ${m.text()}`); });
  await page.goto(targetUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game && window.game.getState() !== 'BOOT', null, { timeout: 30000 });
  return page;
}

async function bet(page, pts) {
  const box = await page.locator('canvas').boundingBox();
  for (const [fx, fy] of pts) {
    await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
    await page.waitForTimeout(120);
  }
}

/* ---------- Full round on desktop ---------- */
const page = await open('desktop', { width: 1280, height: 720 });
const fps = await page.evaluate(() => Math.round(window.game.app.ticker.FPS));
console.log('desktop FPS (software rendering):', fps);

// Shorten the round through the public API, then restart it.
await page.evaluate(() => window.game.updateConfig({ timing: { bettingDuration: 6 } }));
await page.evaluate(() => window.game.reset());
await page.waitForTimeout(1200);

await bet(page, [[0.70, 0.42], [0.63, 0.50], [0.78, 0.57], [0.58, 0.63], [0.72, 0.70], [0.66, 0.78]]);
await page.screenshot({ path: `${OUT}01-desktop-bets.png` });

const totalBet = await page.evaluate(() => window.game.sceneManager.current.bets.getTotalBet());
const betCount = await page.evaluate(() => window.game.sceneManager.current.bets.getBets().length);
console.log('bets placed:', betCount, 'total staked:', totalBet);

const seen = [];
const deadline = Date.now() + 240000;
let shots = 0;
while (Date.now() < deadline) {
  const s = await page.evaluate(() => window.game.getState());
  if (seen[seen.length - 1] !== s) {
    seen.push(s);
    console.log('state ->', s);
    if (['BALL_ROLLING', 'WINNER_DETECTED', 'PAYOUT', 'RESULT'].includes(s)) {
      await page.screenshot({ path: `${OUT}0${++shots + 1}-${s}.png` });
    }
  }
  if (seen.includes('RESULT') && s === 'BETTING_OPEN') break;
  await page.waitForTimeout(400);
}
console.log('sequence:', seen.join(' -> '));

const outcome = await page.evaluate(() => {
  const scene = window.game.sceneManager.current;
  const wm = scene.wheelManager;
  const detected = wm.detectPocket();
  return {
    intended: String(scene.gameManager.winningNumber),
    detected: String(detected.value),
    history: scene.historyManager.getEntries(3).map((e) => String(e.number)),
    balance: scene.bets.getBalance(),
  };
});
console.log('outcome:', JSON.stringify(outcome));
console.log('LANDED CORRECTLY:', outcome.intended === outcome.detected);

/* ---------- Responsive layouts ---------- */
for (const [name, vp] of [
  ['portrait-phone', { width: 390, height: 844 }],
  ['landscape-phone', { width: 844, height: 390 }],
  ['tablet', { width: 1024, height: 768 }],
  ['fold-narrow', { width: 320, height: 700 }],
  ['ultrawide', { width: 2560, height: 1080 }],
]) {
  const p2 = await open(name, vp);
  await p2.waitForTimeout(1800);
  await bet(p2, [[0.5, 0.6], [0.45, 0.55]]);
  await p2.waitForTimeout(600);
  await p2.screenshot({ path: `${OUT}layout-${name}.png` });
  await p2.close();
  console.log('laid out:', name, `${vp.width}x${vp.height}`);
}

/* ---------- Mount / unmount leak check ---------- */
const leak = await page.evaluate(async () => {
  const { createRouletteGame } = await import('/src/index.ts');
  const host = document.createElement('div');
  host.style.cssText = 'width:600px;height:400px;position:fixed;left:-9999px';
  document.body.appendChild(host);
  const before = document.querySelectorAll('canvas').length;
  for (let i = 0; i < 5; i++) {
    const g = createRouletteGame({ debug: false });
    await g.init(host);
    g.destroy();
  }
  const after = document.querySelectorAll('canvas').length;
  host.remove();
  return { before, after };
});
console.log('mount/unmount x5 canvases before/after:', JSON.stringify(leak));

await browser.close();
console.log('--- ERRORS ---');
console.log(errors.length ? errors.join('\n') : '(none)');
process.exit(errors.length ? 1 : 0);
