import type { Application } from "pixi.js";
import {
  classifyDevice,
  getFoldInfo,
  getOrientation,
  getRenderResolution,
  getSafeAreaInsets,
  getViewportSize,
  isTouchDevice,
  type DeviceClass,
  type FoldInfo,
  type Insets,
  type Orientation,
} from "./DeviceInfo";
import {
  computeRegions,
  resolveMinTouchSize,
  resolveMode,
  resolveUiScale,
  type LayoutMode,
  type Regions,
} from "../config/LayoutConfig";
import { clamp } from "./geom";

/**
 * Immutable snapshot of everything a display object needs in order to place
 * itself. Handed to every `onLayout()` implementation.
 */
export interface LayoutContext {
  /** Stage size in CSS pixels. */
  width: number;
  height: number;
  /** Renderer resolution actually in use (capped device pixel ratio). */
  resolution: number;
  /** Raw window.devicePixelRatio, before capping. */
  devicePixelRatio: number;
  orientation: Orientation;
  device: DeviceClass;
  mode: LayoutMode;
  /** width / height. */
  aspect: number;
  /** Shorter and longer viewport edge. */
  short: number;
  long: number;
  safeArea: Insets;
  fold: FoldInfo | null;
  isTouch: boolean;
  /** Multiplier applied to UI sizes authored for a 1280x720 window. */
  uiScale: number;
  /** Minimum size for anything tappable. */
  minTouch: number;
  regions: Regions;
  /** Increments on every applied layout pass. */
  revision: number;

  /** Scale a design-space UI length to screen pixels. */
  px(value: number): number;
  /** Fraction (0..1) of the stage width / height. */
  wp(fraction: number): number;
  hp(fraction: number): number;
  /** Scale a font size, then clamp it so text stays legible but never huge. */
  font(size: number, min?: number, max?: number): number;
}

export interface LayoutSubscriber {
  onLayout(ctx: LayoutContext): void;
}

type LayoutCallback = (ctx: LayoutContext) => void;

interface Entry {
  fn: LayoutCallback;
  order: number;
  id: number;
}

export interface LayoutManagerOptions {
  /** Element the canvas lives in; its box drives the stage size. */
  container?: HTMLElement | null;
  /** Hard cap for the render resolution. */
  maxResolution?: number;
}

/**
 * Central responsive engine.
 *
 * Owns a single source of truth for viewport metrics and pushes it to every
 * registered object. Resize work is coalesced into one animation frame and
 * skipped entirely when nothing meaningful changed, so rotation, browser zoom,
 * fullscreen toggles and Safari's collapsing toolbar cannot cause layout
 * thrash.
 */
export class LayoutManager {
  private app: Application | null = null;
  private container: HTMLElement | null = null;
  private maxResolution: number | undefined;

  private entries: Entry[] = [];
  private nextId = 1;
  private sorted = true;

  private frameRequest = 0;
  private signature = "";
  private context: LayoutContext | null = null;
  private dprQuery: MediaQueryList | null = null;
  private disposers: Array<() => void> = [];

  /** Fired only when the layout mode or orientation actually changes. */
  private modeListeners = new Set<(ctx: LayoutContext) => void>();

  get current(): LayoutContext {
    if (!this.context)
      throw new Error(
        "LayoutManager.init() must run before reading the layout context",
      );
    return this.context;
  }

  get isReady(): boolean {
    return this.context !== null;
  }

  init(app: Application, options: LayoutManagerOptions = {}): LayoutContext {
    this.app = app;
    this.container = options.container ?? null;
    this.maxResolution = options.maxResolution;

    this.bindEvents();
    this.apply(true);
    return this.current;
  }

  /**
   * Register a layout callback. Lower `order` runs first, which lets panels
   * settle before the objects that measure them.
   * Returns an unsubscribe function.
   */
  register(fn: LayoutCallback, order = 0): () => void {
    const entry: Entry = { fn, order, id: this.nextId++ };
    this.entries.push(entry);
    this.sorted = false;
    if (this.context) fn(this.context);
    return () => this.unregister(entry.fn);
  }

  unregister(fn: LayoutCallback): void {
    const index = this.entries.findIndex((e) => e.fn === fn);
    if (index >= 0) this.entries.splice(index, 1);
  }

  onModeChange(fn: (ctx: LayoutContext) => void): () => void {
    this.modeListeners.add(fn);
    return () => this.modeListeners.delete(fn);
  }

  /** Coalesced relayout request; safe to call as often as you like. */
  requestUpdate(force = false): void {
    if (force) this.signature = "";
    if (this.frameRequest) return;
    this.frameRequest = requestAnimationFrame(() => {
      this.frameRequest = 0;
      this.apply(false);
    });
  }

  destroy(): void {
    if (this.frameRequest) cancelAnimationFrame(this.frameRequest);
    this.frameRequest = 0;
    this.disposers.forEach((d) => d());
    this.disposers = [];
    this.entries = [];
    this.modeListeners.clear();
    this.context = null;
  }

  // ---------------------------------------------------------------- internals

  private bindEvents(): void {
    const request = () => this.requestUpdate();

    const on = <K extends keyof WindowEventMap>(
      target: Window | Document | VisualViewport,
      type: K | string,
      handler: EventListener,
      opts?: AddEventListenerOptions,
    ) => {
      target.addEventListener(type, handler, opts);
      this.disposers.push(() =>
        target.removeEventListener(type, handler, opts),
      );
    };

    on(window, "resize", request);
    on(window, "orientationchange", () => {
      // Some mobile browsers report stale metrics on the event itself; a couple
      // of follow-up passes settle the final size without a page reload.
      this.requestUpdate(true);
      setTimeout(() => this.requestUpdate(true), 120);
      setTimeout(() => this.requestUpdate(true), 400);
    });
    on(document, "fullscreenchange", () => this.requestUpdate(true));
    on(document, "webkitfullscreenchange", () => this.requestUpdate(true));
    on(document, "visibilitychange", () => {
      if (!document.hidden) this.requestUpdate(true);
    });

    if (window.visualViewport) {
      // Covers pinch-zoom, browser zoom and the mobile URL bar collapsing.
      on(window.visualViewport, "resize", request);
      on(window.visualViewport, "scroll", request);
    }

    if (this.container && typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(request);
      ro.observe(this.container);
      this.disposers.push(() => ro.disconnect());
    }

    if (typeof screen !== "undefined" && screen.orientation) {
      const handler = () => this.requestUpdate(true);
      screen.orientation.addEventListener("change", handler);
      this.disposers.push(() =>
        screen.orientation.removeEventListener("change", handler),
      );
    }

    this.watchDevicePixelRatio();
  }

  /**
   * `devicePixelRatio` has no event. Watching a resolution media query catches
   * ratio changes from browser zoom or a window moving to another monitor.
   */
  private watchDevicePixelRatio(): void {
    const attach = () => {
      this.dprQuery?.removeEventListener?.("change", onChange);
      const dpr = window.devicePixelRatio || 1;
      this.dprQuery = window.matchMedia(`(resolution: ${dpr}dppx)`);
      this.dprQuery.addEventListener?.("change", onChange);
    };
    const onChange = () => {
      this.requestUpdate(true);
      attach();
    };
    attach();
    this.disposers.push(() =>
      this.dprQuery?.removeEventListener?.("change", onChange),
    );
  }

  private apply(force: boolean): void {
    if (!this.app) return;

    const { width, height } = getViewportSize(this.container);
    const resolution = getRenderResolution(this.maxResolution);
    const safeArea = getSafeAreaInsets();
    const fold = getFoldInfo();

    const signature = [
      width,
      height,
      resolution,
      safeArea.top,
      safeArea.right,
      safeArea.bottom,
      safeArea.left,
      fold
        ? `${fold.hinge}:${fold.x}:${fold.y}:${fold.width}:${fold.height}`
        : "-",
    ].join("|");

    // Bail out early: resize storms during rotation fire many identical events
    // and re-running layout for each of them is pure waste.
    if (!force && signature === this.signature) return;
    this.signature = signature;

    const ctx = this.buildContext(width, height, resolution, safeArea, fold);
    const previous = this.context;
    this.context = ctx;

    this.resizeRenderer(width, height, resolution);
    this.flush(ctx);

    if (
      !previous ||
      previous.mode !== ctx.mode ||
      previous.orientation !== ctx.orientation
    ) {
      this.modeListeners.forEach((fn) => fn(ctx));
    }
  }

  private resizeRenderer(
    width: number,
    height: number,
    resolution: number,
  ): void {
    const renderer = this.app?.renderer;
    if (!renderer) return;
    if (renderer.resolution !== resolution) renderer.resolution = resolution;
    renderer.resize(width, height, resolution);
    // Keep the backing store aligned with the CSS box so nothing is stretched.
    const canvas = this.app!.canvas;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  private buildContext(
    width: number,
    height: number,
    resolution: number,
    safeArea: Insets,
    fold: FoldInfo | null,
  ): LayoutContext {
    const orientation = getOrientation(width, height);
    const device = classifyDevice(width, height);
    const mode = resolveMode(width, height, device, orientation);
    const uiScale = resolveUiScale(width, height, device);
    const isTouch = isTouchDevice();
    const minTouch = resolveMinTouchSize(device, isTouch);
    const regions = computeRegions({
      width,
      height,
      mode,
      safeArea,
      uiScale,
      minTouch,
      fold,
    });

    return {
      width,
      height,
      resolution,
      devicePixelRatio: window.devicePixelRatio || 1,
      orientation,
      device,
      mode,
      aspect: width / height,
      short: Math.min(width, height),
      long: Math.max(width, height),
      safeArea,
      fold,
      isTouch,
      uiScale,
      minTouch,
      regions,
      revision: (this.context?.revision ?? 0) + 1,
      px: (value: number) => value * uiScale,
      wp: (fraction: number) => width * fraction,
      hp: (fraction: number) => height * fraction,
      font: (size: number, min = 10, max = 64) =>
        clamp(Math.round(size * uiScale), min, max),
    };
  }

  private flush(ctx: LayoutContext): void {
    if (!this.sorted) {
      this.entries.sort((a, b) => a.order - b.order || a.id - b.id);
      this.sorted = true;
    }
    // Copy: a callback may register or remove objects while laying out.
    for (const entry of this.entries.slice()) {
      entry.fn(ctx);
    }
  }
}

/** Shared instance used across the app. */
export const layout = new LayoutManager();
