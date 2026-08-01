/**
 * Pure viewport classification helpers — no DOM access in the classifiers,
 * so they are unit-testable; the snapshot function is the single place
 * that reads browser state.
 */

/** Material-style width classes: phones / small tablets / desktop+. */
export type Breakpoint = 'compact' | 'medium' | 'expanded';

export type Orientation = 'portrait' | 'landscape';

export interface ViewportSegments {
  /** Number of horizontal segments (2 = book-posture foldable). */
  horizontal: number;
  /** Number of vertical segments (2 = laptop-posture foldable). */
  vertical: number;
}

export interface ViewportSnapshot {
  width: number;
  height: number;
  dpr: number;
  breakpoint: Breakpoint;
  orientation: Orientation;
  /** True when the primary pointer is a finger (touch UI sizing). */
  coarsePointer: boolean;
  segments: ViewportSegments;
}

export const BREAKPOINTS = {
  /** compact < medium boundary (px). */
  medium: 600,
  /** medium < expanded boundary (px). */
  expanded: 1024,
} as const;

export function getBreakpoint(width: number): Breakpoint {
  if (width < BREAKPOINTS.medium) return 'compact';
  if (width < BREAKPOINTS.expanded) return 'medium';
  return 'expanded';
}

export function getOrientation(width: number, height: number): Orientation {
  return width >= height ? 'landscape' : 'portrait';
}

/**
 * Foldable detection via the CSS Viewport Segments media features
 * (Chromium on Surface Duo / Galaxy Fold class devices). Browsers without
 * the feature simply never match, yielding 1×1 — no capability guessing.
 */
export function getViewportSegments(): ViewportSegments {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return { horizontal: 1, vertical: 1 };
  }
  let horizontal = 1;
  let vertical = 1;
  for (const n of [2, 3]) {
    if (window.matchMedia(`(horizontal-viewport-segments: ${n})`).matches) horizontal = n;
    if (window.matchMedia(`(vertical-viewport-segments: ${n})`).matches) vertical = n;
  }
  return { horizontal, vertical };
}

/** Read the live browser state into an immutable snapshot. */
export function snapshotViewport(): ViewportSnapshot {
  const width = window.innerWidth;
  const height = window.innerHeight;
  return {
    width,
    height,
    dpr: window.devicePixelRatio || 1,
    breakpoint: getBreakpoint(width),
    orientation: getOrientation(width, height),
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    segments: getViewportSegments(),
  };
}
