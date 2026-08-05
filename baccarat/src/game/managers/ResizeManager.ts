import type { Application } from "pixi.js";

import type { GameConfig } from "../Config";
import {
  DESIGN_HEIGHT,
  DESIGN_HEIGHT_PORTRAIT,
  DESIGN_WIDTH,
  DESIGN_WIDTH_PORTRAIT,
} from "../Constants";
import type { GameEventMap } from "../events";
import { LayoutMode, type ViewportMetrics } from "../types";
import type { EventBus } from "../utils/EventBus";
import { devicePixelRatioCapped, resolveLayoutMode } from "../utils/Helpers";
import { Logger } from "../utils/Logger";

/**
 * Turns the host element's size into a `ViewportMetrics` every frame that
 * matters, and nothing more.
 *
 * The fit strategy is *scale-to-fit with an extended safe area*: the uniform
 * scale comes from the tighter axis (so nothing is ever stretched), but the
 * design-space viewport reported to layout code is the full visible area. Views
 * anchor to that rather than to a fixed 1920×1080 box, which is why an ultrawide
 * monitor gets a wider table instead of black bars.
 */
export class ResizeManager {
  private readonly log = Logger.create("resize");
  private readonly app: Application;
  private readonly bus: EventBus<GameEventMap>;
  private config: GameConfig;

  private host: HTMLElement | null = null;
  private observer: ResizeObserver | null = null;
  private frameHandle = 0;
  private metrics: ViewportMetrics;
  private disposed = false;

  private readonly onWindowResize = (): void => this.requestUpdate();

  constructor(app: Application, bus: EventBus<GameEventMap>, config: GameConfig) {
    this.app = app;
    this.bus = bus;
    this.config = config;
    this.metrics = this.compute(1, 1);
  }

  get current(): ViewportMetrics {
    return this.metrics;
  }

  updateConfig(config: GameConfig): void {
    this.config = config;
    this.requestUpdate();
  }

  attach(host: HTMLElement): void {
    this.host = host;

    if (typeof ResizeObserver !== "undefined") {
      this.observer = new ResizeObserver(() => this.requestUpdate());
      this.observer.observe(host);
    }
    // Orientation changes and DPR changes (dragging between monitors) do not
    // always produce an element resize, so the window events stay as a backstop.
    window.addEventListener("resize", this.onWindowResize, { passive: true });
    window.addEventListener("orientationchange", this.onWindowResize, { passive: true });

    this.update(true);
  }

  /** Coalesces bursts of resize events into one layout pass per frame. */
  requestUpdate(): void {
    if (this.disposed || this.frameHandle !== 0) return;
    this.frameHandle = requestAnimationFrame(() => {
      this.frameHandle = 0;
      this.update(false);
    });
  }

  /** Immediate, synchronous resize — used by the public `resize()` API. */
  update(force: boolean): void {
    if (this.disposed || !this.host) return;

    const rect = this.host.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || this.host.clientWidth || 1));
    const height = Math.max(1, Math.round(rect.height || this.host.clientHeight || 1));
    const resolution = devicePixelRatioCapped(this.config.renderer.maxResolution);

    const unchanged =
      !force &&
      width === this.metrics.width &&
      height === this.metrics.height &&
      resolution === this.metrics.resolution;
    if (unchanged) return;

    this.metrics = this.compute(width, height, resolution);

    const renderer = this.app.renderer;
    if (renderer.resolution !== resolution) renderer.resolution = resolution;
    renderer.resize(width, height);

    this.log.debug(`viewport ${width}x${height} @${resolution} -> ${this.metrics.mode}`);
    this.bus.emit("view:resized", { metrics: this.metrics });
  }

  private compute(width: number, height: number, resolution = 1): ViewportMetrics {
    const mode = resolveLayoutMode(width, height);
    const portrait = mode === LayoutMode.Portrait;
    const baseWidth = portrait ? DESIGN_WIDTH_PORTRAIT : DESIGN_WIDTH;
    const baseHeight = portrait ? DESIGN_HEIGHT_PORTRAIT : DESIGN_HEIGHT;

    // Contain: the tighter axis wins, so the aspect ratio is preserved exactly.
    const scale = Math.min(width / baseWidth, height / baseHeight);

    return {
      width,
      height,
      aspect: width / height,
      mode,
      isPortrait: portrait,
      scale,
      // The extra space on the looser axis is real, usable design space.
      designWidth: width / scale,
      designHeight: height / scale,
      resolution,
    };
  }

  destroy(): void {
    this.disposed = true;
    if (this.frameHandle !== 0) cancelAnimationFrame(this.frameHandle);
    this.frameHandle = 0;
    this.observer?.disconnect();
    this.observer = null;
    window.removeEventListener("resize", this.onWindowResize);
    window.removeEventListener("orientationchange", this.onWindowResize);
    this.host = null;
  }
}
