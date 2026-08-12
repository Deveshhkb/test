import { Application, Container } from "pixi.js";
import { EventEmitter } from "../core/EventEmitter";

export interface ViewportMetrics {
  /** CSS pixel size of the canvas. */
  width: number;
  height: number;
  /** Scale that fits the whole design resolution on screen (letterboxed). */
  fitScale: number;
  /** Scale that covers the screen, used for the background layer. */
  coverScale: number;
  isPortrait: boolean;
}

interface ScalerEvents {
  resize: ViewportMetrics;
}

export interface StageScalerOptions {
  designWidth: number;
  designHeight: number;
  /** Layer scaled to fit; all gameplay lives here in design coordinates. */
  content: Container;
  /** Layer scaled to cover, so the felt always reaches the screen edges. */
  background: Container;
}

/**
 * Keeps a fixed design resolution usable on any screen.
 *
 * The content layer is uniformly scaled and centred, which preserves the table
 * composition and its aspect ratio instead of stretching individual objects.
 * The background layer is scaled to cover so no letterbox bars are visible.
 * Resizes are coalesced into a single animation frame.
 */
export class StageScaler extends EventEmitter<ScalerEvents> {
  private metrics: ViewportMetrics;
  private frameRequest = 0;
  private readonly onWindowResize = () => this.requestUpdate();

  constructor(
    private readonly app: Application,
    private readonly options: StageScalerOptions,
  ) {
    super();
    this.metrics = this.measure();
    window.addEventListener("resize", this.onWindowResize);
    window.addEventListener("orientationchange", this.onWindowResize);
    window.visualViewport?.addEventListener("resize", this.onWindowResize);
    this.apply();
  }

  get current(): ViewportMetrics {
    return this.metrics;
  }

  /** Converts a screen point into design-space coordinates. */
  toDesignSpace(x: number, y: number): { x: number; y: number } {
    const { content } = this.options;
    return {
      x: (x - content.x) / content.scale.x,
      y: (y - content.y) / content.scale.y,
    };
  }

  requestUpdate(): void {
    if (this.frameRequest) return;
    this.frameRequest = requestAnimationFrame(() => {
      this.frameRequest = 0;
      this.apply();
    });
  }

  destroy(): void {
    window.removeEventListener("resize", this.onWindowResize);
    window.removeEventListener("orientationchange", this.onWindowResize);
    window.visualViewport?.removeEventListener("resize", this.onWindowResize);
    if (this.frameRequest) cancelAnimationFrame(this.frameRequest);
    this.removeAllListeners();
  }

  private measure(): ViewportMetrics {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const { designWidth, designHeight } = this.options;
    const scaleX = width / designWidth;
    const scaleY = height / designHeight;

    return {
      width,
      height,
      fitScale: Math.min(scaleX, scaleY),
      coverScale: Math.max(scaleX, scaleY),
      isPortrait: height > width,
    };
  }

  private apply(): void {
    const metrics = this.measure();
    this.metrics = metrics;

    const { designWidth, designHeight, content, background } = this.options;
    this.app.renderer.resize(metrics.width, metrics.height);

    content.scale.set(metrics.fitScale);
    content.position.set(
      (metrics.width - designWidth * metrics.fitScale) / 2,
      (metrics.height - designHeight * metrics.fitScale) / 2,
    );

    background.scale.set(metrics.coverScale);
    background.position.set(
      (metrics.width - designWidth * metrics.coverScale) / 2,
      (metrics.height - designHeight * metrics.coverScale) / 2,
    );

    this.emit("resize", metrics);
  }
}
