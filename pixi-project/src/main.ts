import {
  Application,
  Assets,
  Container,
  Rectangle,
  type Texture,
} from "pixi.js";
import { layout } from "./core/LayoutManager";
import { installInputGuards } from "./core/InputGuards";
import { ResponsiveBackground } from "./core/Viewport";
import { loadScaledTexture } from "./core/TextureUtils";
import { DESIGN } from "./config/LayoutConfig";
import { DebugOverlay } from "./core/DebugOverlay";
import { GameScene } from "./game/GameScene";
import { CHIPS, GameState } from "./state/GameState";
import {
  getRenderResolution,
  getViewportSize,
  isLowPowerDevice,
} from "./core/DeviceInfo";

const CONTAINER_ID = "pixi-container";

async function bootstrap(): Promise<void> {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) throw new Error(`#${CONTAINER_ID} is missing from the page`);

  const { width, height } = getViewportSize(container);
  const lowPower = isLowPowerDevice();

  const app = new Application();
  await app.init({
    width,
    height,
    background: "#05070d",
    // High-DPI: render at the device pixel ratio (capped) and let autoDensity
    // keep the CSS box at logical size, so nothing is upscaled or blurry.
    resolution: getRenderResolution(),
    autoDensity: true,
    antialias: !lowPower,
    powerPreference: lowPower ? "low-power" : "high-performance",
    // We drive resizing through the LayoutManager instead of `resizeTo`, so a
    // single coalesced pass handles the renderer and every game object at once.
  });

  container.appendChild(app.canvas);
  app.canvas.style.display = "block";
  app.canvas.setAttribute("aria-label", "Dragon Tiger game board");
  installInputGuards(app.canvas);

  // The source background is 10342x4500 - larger than GL_MAX_TEXTURE_SIZE on
  // most phones - so it is downsampled before upload. Everything else is
  // already within safe limits and loads through the normal asset pipeline.
  const [background, assets] = await Promise.all([
    loadScaledTexture("/assets/bg-image.png"),
    Assets.load<Texture>([
      "/assets/bord.png",
      "/assets/dragon.png",
      "/assets/tiger.png",
      ...CHIPS.map((chip) => chip.texture),
    ]),
  ]);

  const chips: Record<string, Texture> = {};
  for (const chip of CHIPS) {
    chips[chip.texture] = assets[chip.texture];
  }

  const state = new GameState();
  const scene = new GameScene(state, {
    board: assets["/assets/bord.png"],
    dragon: assets["/assets/dragon.png"],
    tiger: assets["/assets/tiger.png"],
    chips,
  });
  const debug = new DebugOverlay(
    new URLSearchParams(location.search).has("debug"),
  );

  app.stage.addChild(new ResponsiveBackground(background), scene, debug);

  // One init pass lays out the renderer and every registered object; from here
  // on, resize / rotate / zoom / fullscreen all funnel through the same path.
  layout.init(app, { container });

  exposeTestHooks(app, scene);
  document.body.classList.add("game-ready");
}

/**
 * Small read-only surface used by the automated responsive test sweep
 * (`npm run verify:responsive`) to assert region and content geometry.
 */
function exposeTestHooks(app: Application, scene: GameScene): void {
  Object.defineProperty(window, "__game", {
    value: {
      get ready() {
        return true;
      },
      get context() {
        const ctx = layout.current;
        return {
          width: ctx.width,
          height: ctx.height,
          mode: ctx.mode,
          device: ctx.device,
          orientation: ctx.orientation,
          resolution: ctx.resolution,
          uiScale: ctx.uiScale,
          minTouch: ctx.minTouch,
          revision: ctx.revision,
        };
      },
      get regions() {
        const r = layout.current.regions;
        const pick = (rect: {
          x: number;
          y: number;
          width: number;
          height: number;
        }) => ({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        });
        return {
          safe: pick(r.safe),
          topBar: pick(r.topBar),
          game: pick(r.game),
          bet: pick(r.bet),
          history: pick(r.history),
          historyPeek: r.historyPeek ? pick(r.historyPeek) : null,
          historyCollapsible: r.historyCollapsible,
        };
      },
      get boardBounds() {
        // The play area (design box) in stage coordinates. The board sprite
        // itself is wider than this because of its transparent padding.
        const topLeft = scene.viewport.toStage(0, 0);
        const bottomRight = scene.viewport.toStage(DESIGN.width, DESIGN.height);
        return {
          x: topLeft.x,
          y: topLeft.y,
          width: bottomRight.x - topLeft.x,
          height: bottomRight.y - topLeft.y,
        };
      },
      get designAspect() {
        return DESIGN.width / DESIGN.height;
      },
      get worldScale() {
        return scene.viewport.worldScale;
      },
      get canvasSize() {
        return {
          css: {
            width: app.canvas.clientWidth,
            height: app.canvas.clientHeight,
          },
          buffer: { width: app.canvas.width, height: app.canvas.height },
        };
      },
      get probes() {
        return collectProbes(app.stage);
      },
    },
    writable: false,
  });
}

export interface Probe {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Effective tappable size in screen pixels, when an explicit hit area is set. */
  touch: { width: number; height: number } | null;
}

/**
 * Walks the display list and reports the screen-space geometry of every object
 * tagged `probe:*`. Used by the verification sweep to assert that nothing
 * overlaps, nothing is clipped and every control stays tappable.
 */
function collectProbes(root: Container): Probe[] {
  const found: Probe[] = [];

  const walk = (node: Container) => {
    if (!node.visible || node.destroyed) return;
    if (typeof node.label === "string" && node.label.startsWith("probe:")) {
      const bounds = node.getBounds();
      const hit = node.hitArea;
      const scale = Math.abs(node.worldTransform.a) || 1;
      found.push({
        name: node.label.slice("probe:".length),
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        touch:
          hit instanceof Rectangle
            ? { width: hit.width * scale, height: hit.height * scale }
            : null,
      });
    }
    for (const child of node.children) walk(child as Container);
  };

  walk(root);
  return found;
}

bootstrap().catch((error) => {
  console.error("Failed to start the game", error);
});
