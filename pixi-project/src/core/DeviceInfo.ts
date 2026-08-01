/**
 * Runtime device / capability detection.
 *
 * Everything here is derived from feature detection and live viewport metrics
 * rather than user-agent sniffing wherever possible, so the same build behaves
 * correctly on desktop, laptop, tablet, phone and foldable hardware across
 * Chrome, Edge, Firefox and Safari.
 */

export type DeviceClass = "phone" | "tablet" | "desktop";
export type Orientation = "portrait" | "landscape";

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface FoldInfo {
  /** Orientation of the hinge itself. */
  hinge: "vertical" | "horizontal";
  /** Hinge rectangle in CSS pixels, relative to the viewport. */
  x: number;
  y: number;
  width: number;
  height: number;
}

interface NavigatorWithHints extends Navigator {
  userAgentData?: { mobile?: boolean; platform?: string };
  deviceMemory?: number;
}

interface ViewportSegment {
  x: number;
  y: number;
  width: number;
  height: number;
}

const nav = (): NavigatorWithHints => navigator as NavigatorWithHints;

/** True when the primary pointer is coarse (finger) rather than a mouse. */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(any-pointer: coarse)").matches) return true;
  return navigator.maxTouchPoints > 0 || "ontouchstart" in window;
}

/** iPadOS 13+ reports itself as a Mac, so touch points are the giveaway. */
export function isIpadLike(): boolean {
  return (
    /iPad/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

export function isIOS(): boolean {
  return /iPhone|iPod/.test(navigator.userAgent) || isIpadLike();
}

export function isSafari(): boolean {
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua);
}

/**
 * Coarse power estimate used to cap the render resolution so low-end Android
 * hardware keeps a smooth frame rate instead of pushing 3x pixels.
 */
export function isLowPowerDevice(): boolean {
  const n = nav();
  const memory = n.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  return memory <= 2 || cores <= 4;
}

/**
 * Effective device pixel ratio, capped for performance. Retina/high-DPI panels
 * still render sharply (>= 2x) while extreme ratios (3x-4x phones) are trimmed.
 */
export function getRenderResolution(maxRatio?: number): number {
  const dpr = window.devicePixelRatio || 1;
  const cap = maxRatio ?? (isLowPowerDevice() ? 1.5 : 2.5);
  return Math.max(1, Math.min(dpr, cap));
}

/**
 * Classify the device from its smallest viewport edge plus pointer type.
 * Using the short edge (rather than width) keeps the class stable when the
 * device rotates, which is what prevents layout "mode flapping" mid-rotation.
 */
export function classifyDevice(width: number, height: number): DeviceClass {
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  const touch = isTouchDevice();
  const uaMobile = nav().userAgentData?.mobile === true;

  if (!touch && !uaMobile) {
    // A mouse-driven small window is still a desktop browser being resized.
    return short < 500 && long < 900 ? "phone" : "desktop";
  }
  if (isIpadLike()) return "tablet";
  if (short < 600) return "phone";
  if (short < 1024) return "tablet";
  return uaMobile ? "tablet" : "desktop";
}

export function getOrientation(width: number, height: number): Orientation {
  // Derive from the actual box we render into rather than screen.orientation:
  // it is the only source that is correct in every browser, in split-screen,
  // in a resized desktop window and inside an iframe.
  return width >= height ? "landscape" : "portrait";
}

let insetProbe: HTMLDivElement | null = null;

/**
 * Reads the CSS `env(safe-area-inset-*)` values (notches, home indicators,
 * rounded corners) through a hidden probe element.
 */
export function getSafeAreaInsets(): Insets {
  if (typeof document === "undefined")
    return { top: 0, right: 0, bottom: 0, left: 0 };
  if (!insetProbe) {
    insetProbe = document.createElement("div");
    insetProbe.setAttribute("aria-hidden", "true");
    insetProbe.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "width:0",
      "height:0",
      "visibility:hidden",
      "pointer-events:none",
      "padding-top:env(safe-area-inset-top,0px)",
      "padding-right:env(safe-area-inset-right,0px)",
      "padding-bottom:env(safe-area-inset-bottom,0px)",
      "padding-left:env(safe-area-inset-left,0px)",
    ].join(";");
    document.body.appendChild(insetProbe);
  }
  const style = getComputedStyle(insetProbe);
  return {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
}

/**
 * Foldable / dual-screen support: returns the hinge rectangle when the
 * viewport spans two physical display segments.
 */
export function getFoldInfo(): FoldInfo | null {
  const vv = window.visualViewport as
    | (VisualViewport & { segments?: ViewportSegment[] })
    | undefined;
  const segments = vv?.segments;
  if (!segments || segments.length < 2) return null;

  const [a, b] = segments;
  if (a.x !== b.x) {
    const left = Math.min(a.x + a.width, b.x + b.width);
    const right = Math.max(a.x, b.x);
    return {
      hinge: "vertical",
      x: left,
      y: 0,
      width: Math.max(0, right - left),
      height: vv?.height ?? 0,
    };
  }
  const top = Math.min(a.y + a.height, b.y + b.height);
  const bottom = Math.max(a.y, b.y);
  return {
    hinge: "horizontal",
    x: 0,
    y: top,
    width: vv?.width ?? 0,
    height: Math.max(0, bottom - top),
  };
}

/** CSS-pixel size of the area the game should occupy. */
export function getViewportSize(element?: HTMLElement | null): {
  width: number;
  height: number;
} {
  if (element) {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return { width: rect.width, height: rect.height };
    }
  }
  // visualViewport excludes mobile browser chrome (Safari's collapsing toolbar),
  // which is what stops the canvas from being taller than the visible page.
  const vv = window.visualViewport;
  return {
    width: Math.max(1, Math.round(vv?.width ?? window.innerWidth)),
    height: Math.max(1, Math.round(vv?.height ?? window.innerHeight)),
  };
}
