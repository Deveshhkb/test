import { Application, Container, Assets } from "pixi.js";
import { CONFIG } from "../config";
import { manifest } from "../assets";
import type { Scene } from "./Scene";

type SceneCtor = new () => Scene;

/**
 * Universal game wrapper:
 *  - creates the Pixi Application (WebGPU/WebGL auto)
 *  - scales a fixed design resolution to ANY screen (desktop, mobile, portrait, landscape)
 *  - manages scenes
 */
class GameManager {
  readonly app = new Application();
  /** Everything is drawn inside this, in design coordinates. */
  readonly root = new Container();

  private current?: Scene;
  width = CONFIG.landscape.width;
  height = CONFIG.landscape.height;
  isPortrait = false;

  async init(parent: HTMLElement) {
    await this.app.init({
      background: CONFIG.background,
      resizeTo: parent,
      antialias: CONFIG.antialias,
      resolution: Math.min(window.devicePixelRatio || 1, CONFIG.maxResolution),
      autoDensity: true,
      preference: "webgl", // change to "webgpu" to prefer WebGPU
    });
    parent.appendChild(this.app.canvas);
    this.app.stage.addChild(this.root);

    await Assets.init({ manifest, basePath: import.meta.env.BASE_URL });

    this.app.renderer.on("resize", () => this.resize());
    this.app.ticker.add((t) => this.current?.update(t));
    this.resize();

    // handy for debugging with the PixiJS DevTools browser extension
    (globalThis as unknown as { __PIXI_APP__: Application }).__PIXI_APP__ =
      this.app;
  }

  /** Switch to another scene. */
  async goTo(SceneClass: SceneCtor) {
    if (this.current) {
      await this.current.onExit();
      this.root.removeChild(this.current);
      this.current.destroy({ children: true });
    }
    const scene = new SceneClass();
    this.current = scene;
    this.root.addChild(scene);
    scene.resize(this.width, this.height, this.isPortrait);
    await scene.onEnter();
  }

  private resize() {
    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;
    this.isPortrait = screenH > screenW;
    const design = this.isPortrait ? CONFIG.portrait : CONFIG.landscape;

    const sx = screenW / design.width;
    const sy = screenH / design.height;
    const scale =
      CONFIG.scaleMode === "contain" ? Math.min(sx, sy) : Math.max(sx, sy);

    this.width = design.width;
    this.height = design.height;
    this.root.scale.set(scale);
    // center the design area on screen
    this.root.position.set(
      (screenW - design.width * scale) / 2,
      (screenH - design.height * scale) / 2,
    );
    this.current?.resize(this.width, this.height, this.isPortrait);
  }
}

export const Game = new GameManager();
