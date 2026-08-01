import { useViewportStore } from '@/store/viewportStore';
import type { Breakpoint, Orientation } from '@/utils/viewport';

/**
 * Public hooks for viewport-aware components. Each selects a single
 * primitive slice, so components re-render only when that slice changes —
 * a resize that keeps the same breakpoint costs zero renders.
 */
export function useBreakpoint(): Breakpoint {
  return useViewportStore((s) => s.breakpoint);
}

export function useOrientation(): Orientation {
  return useViewportStore((s) => s.orientation);
}

export function useCoarsePointer(): boolean {
  return useViewportStore((s) => s.coarsePointer);
}

/** True when the display spans a foldable hinge (either axis). */
export function useIsSpanning(): boolean {
  return useViewportStore((s) => s.segments.horizontal > 1 || s.segments.vertical > 1);
}
