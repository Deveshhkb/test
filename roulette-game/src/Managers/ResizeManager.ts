import type { Application } from 'pixi.js';
import { BREAKPOINTS, DESIGN } from '../Game/Constants';
import {
  Breakpoint,
  GameEvent,
  LayoutMetrics,
  Orientation,
  RenderConfig,
  SafeAreaInsets,
} from '../Types';
import { EventBus } from '../Utilities/EventBus';
import { Logger } from '../Utilities/Logger';
import { clamp } from '../Utilities/Math';
import { isTouchDevice, readSafeAreaInsets } from '../Utilities/Helpers';

/**
 * ResizeManager (the LayoutManager of the engine).
 *
 * Single source of truth for "how big is the game and what shape is it". Views
 * never read `window.innerWidth`; they receive a {@link LayoutMetrics} and
 * anchor themselves to it. That is what keeps the same code correct on a
 * 320x568 phone, a folded/unfolded Fold, a notched iPhone in landscape and a
 * 4K monitor at 150% browser zoom.
 *
 * Signals watched:
 * - `ResizeObserver` on the host element  -> covers React layout changes, split
 *   view, sidebars and CSS transitions that `window.resize` never fires for.
 * - `orientationchange` + a deferred re-measure -> iOS reports stale dimensions
 *   for a frame or two after rotating.
 * - `matchMedia('(resolution: Xdppx)')`   -> browser zoom and monitor changes
 *   alter devicePixelRatio without any resize event at all.
 */
export class ResizeManager {
  private readonly log = Logger.create('ResizeManager');

  private metrics: LayoutMetrics;
  private resizeObserver?: ResizeObserver;
  private dprQuery?: MediaQueryList;
  private pendingFrame = 0;
  private deferredTimer = 0;
  private destroyed = false;

  /** Set when the host drives sizing explicitly through `resize(w, h)`. */
  private manualSize?: { width: number; height: number };

  public constructor(
    private readonly app: Application,
    private readonly container: HTMLElement,
    private readonly bus: EventBus,
    private renderConfig: RenderConfig,
  ) {
    this.metrics = this.measure();
    this.attach();
  }

  public getMetrics(): LayoutMetrics {
    return this.metrics;
  }

  public updateRenderConfig(config: RenderConfig): void {
    this.renderConfig = config;
    this.refresh(true);
  }

  /**
   * Explicit sizing from a host application. Once called, the engine stops
   * inferring its size from the container - the host owns layout from then on.
   */
  public setSize(width: number, height: number): void {
    this.manualSize = { width: Math.max(1, width), height: Math.max(1, height) };
    this.refresh(true);
  }

  /** Hand sizing control back to the container observer. */
  public clearManualSize(): void {
    this.manualSize = undefined;
    this.refresh(true);
  }

  /**
   * Recompute and, if anything meaningful moved, resize the renderer and
   * broadcast. `force` bypasses the equality check (used after a DPR or config
   * change, where the CSS size is identical but the backing store is not).
   */
  public refresh(force = false): void {
    if (this.destroyed) return;

    const previous = this.metrics;
    const next = this.measure();

    const sizeChanged =
      Math.abs(next.width - previous.width) > 0.5 ||
      Math.abs(next.height - previous.height) > 0.5;
    const dprChanged = next.devicePixelRatio !== previous.devicePixelRatio;

    if (!force && !sizeChanged && !dprChanged) return;

    this.metrics = next;

    // Renderer resolution is only touched when it actually changed - reassigning
    // it rebuilds the backing texture and drops a frame.
    const resolution = this.resolveResolution(next.devicePixelRatio);
    if (this.app.renderer.resolution !== resolution) {
      this.app.renderer.resolution = resolution;
    }
    this.app.renderer.resize(next.width, next.height);

    if (next.orientation !== previous.orientation) {
      this.bus.emit(GameEvent.ORIENTATION_CHANGE, { orientation: next.orientation });
    }
    this.bus.emit(GameEvent.RESIZE, next);

    this.log.debug(
      `resize ${next.width}x${next.height} @${resolution}x ` +
        `${next.orientation}/${next.breakpoint} scale=${next.scale.toFixed(3)}`,
    );
  }

  public destroy(): void {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;

    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('orientationchange', this.onOrientationChange);
    this.dprQuery?.removeEventListener('change', this.onDprChange);
    this.dprQuery = undefined;

    if (this.pendingFrame) cancelAnimationFrame(this.pendingFrame);
    if (this.deferredTimer) window.clearTimeout(this.deferredTimer);
  }

  /* --------------------------------------------------------------------- */
  /* Measurement                                                           */
  /* --------------------------------------------------------------------- */

  private measure(): LayoutMetrics {
    const rect = this.container.getBoundingClientRect();

    // Fall back to the viewport when the container has not been laid out yet
    // (display:none, or measured before the first paint inside React).
    const width = Math.max(1, Math.round(this.manualSize?.width ?? rect.width ?? 0) || window.innerWidth);
    const height = Math.max(
      1,
      Math.round(this.manualSize?.height ?? rect.height ?? 0) || window.innerHeight,
    );

    const orientation = width >= height ? Orientation.LANDSCAPE : Orientation.PORTRAIT;
    const shortEdge = Math.min(width, height);
    const breakpoint =
      shortEdge <= BREAKPOINTS.MOBILE_MAX
        ? Breakpoint.MOBILE
        : shortEdge <= BREAKPOINTS.TABLET_MAX
          ? Breakpoint.TABLET
          : Breakpoint.DESKTOP;

    const safeArea = this.resolveSafeArea();
    const safeWidth = Math.max(1, width - safeArea.left - safeArea.right);
    const safeHeight = Math.max(1, height - safeArea.top - safeArea.bottom);

    return {
      width,
      height,
      orientation,
      breakpoint,
      devicePixelRatio: window.devicePixelRatio || 1,
      safeArea,
      safeWidth,
      safeHeight,
      safeLeft: safeArea.left,
      safeTop: safeArea.top,
      scale: this.computeScale(safeWidth, safeHeight, orientation),
      isTouch: isTouchDevice(),
    };
  }

  /**
   * Uniform UI scale.
   *
   * Both axes are fitted against the design reference and the *smaller* factor
   * wins, so content is letterboxed rather than stretched - the aspect ratio of
   * every sprite is preserved on every device. The result is clamped so an
   * ultra-wide monitor does not render a comically large table and a 4-inch
   * phone still gets tappable controls.
   */
  private computeScale(width: number, height: number, orientation: Orientation): number {
    const referenceWidth =
      orientation === Orientation.LANDSCAPE ? DESIGN.LANDSCAPE_WIDTH : DESIGN.PORTRAIT_WIDTH;
    const referenceHeight =
      orientation === Orientation.LANDSCAPE ? DESIGN.LANDSCAPE_HEIGHT : DESIGN.PORTRAIT_HEIGHT;

    const fit = Math.min(width / referenceWidth, height / referenceHeight);
    return clamp(fit, DESIGN.MIN_SCALE, DESIGN.MAX_SCALE);
  }

  /**
   * Safe-area insets only apply when the game owns the viewport. Embedded in a
   * host page the surrounding layout has already handled the notch, and
   * subtracting the insets again would leave a visible gap.
   */
  private resolveSafeArea(): SafeAreaInsets {
    const isFullViewport =
      !this.manualSize &&
      this.container.getBoundingClientRect().height >= window.innerHeight - 1;

    return isFullViewport ? readSafeAreaInsets() : { top: 0, right: 0, bottom: 0, left: 0 };
  }

  /**
   * Cap the backing-store resolution. Rendering a phone at its native 3x DPR
   * triples the fragment cost for a difference almost nobody can see; 2x is the
   * industry-standard ceiling for a canvas this size.
   */
  private resolveResolution(dpr: number): number {
    if (this.renderConfig.resolution) return this.renderConfig.resolution;
    return clamp(dpr, 1, this.renderConfig.maxResolution);
  }

  /* --------------------------------------------------------------------- */
  /* Signal wiring                                                         */
  /* --------------------------------------------------------------------- */

  private attach(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.onContainerResize);
      this.resizeObserver.observe(this.container);
    }
    window.addEventListener('resize', this.onWindowResize, { passive: true });
    window.addEventListener('orientationchange', this.onOrientationChange, { passive: true });
    this.watchDevicePixelRatio();
  }

  /**
   * A DPR change fires no resize event, so we listen to a media query pinned to
   * the *current* ratio: the moment it stops matching, the ratio moved. The
   * query has to be re-armed at the new ratio after every change.
   */
  private watchDevicePixelRatio(): void {
    if (typeof window.matchMedia !== 'function') return;
    this.dprQuery?.removeEventListener('change', this.onDprChange);
    const dpr = window.devicePixelRatio || 1;
    this.dprQuery = window.matchMedia(`(resolution: ${dpr}dppx)`);
    this.dprQuery.addEventListener('change', this.onDprChange);
  }

  private readonly onDprChange = (): void => {
    this.watchDevicePixelRatio();
    this.scheduleRefresh(true);
  };

  private readonly onContainerResize = (): void => this.scheduleRefresh(false);

  private readonly onWindowResize = (): void => this.scheduleRefresh(false);

  /**
   * iOS reports pre-rotation dimensions for a frame or two after the event, so
   * we measure immediately (for responsiveness) and again shortly after (for
   * correctness).
   */
  private readonly onOrientationChange = (): void => {
    this.scheduleRefresh(true);
    if (this.deferredTimer) window.clearTimeout(this.deferredTimer);
    this.deferredTimer = window.setTimeout(() => this.refresh(true), 250);
  };

  /** Coalesce every signal into at most one measure per animation frame. */
  private scheduleRefresh(force: boolean): void {
    if (this.destroyed || this.pendingFrame) return;
    this.pendingFrame = requestAnimationFrame(() => {
      this.pendingFrame = 0;
      this.refresh(force);
    });
  }
}
