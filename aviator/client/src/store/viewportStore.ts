import { create } from 'zustand';
import {
  getBreakpoint,
  getOrientation,
  snapshotViewport,
  type ViewportSnapshot,
} from '@/utils/viewport';

/**
 * Live viewport state for the DOM UI layer.
 *
 * One module owns every window-level listener (resize, orientation,
 * visualViewport, DPR media-query chain); components subscribe through
 * Zustand selectors, so a resize triggers exactly one store write and only
 * components whose selected slice changed re-render. The Pixi side has its
 * own resize pipeline (ResizeObserver + renderer events inside GameEngine)
 * — the two layers observe the same reality without depending on each
 * other.
 */
interface ViewportStore extends ViewportSnapshot {
  refresh: () => void;
}

const initialSnapshot: ViewportSnapshot =
  typeof window === 'undefined'
    ? {
        width: 1280,
        height: 720,
        dpr: 1,
        breakpoint: getBreakpoint(1280),
        orientation: getOrientation(1280, 720),
        coarsePointer: false,
        segments: { horizontal: 1, vertical: 1 },
      }
    : snapshotViewport();

export const useViewportStore = create<ViewportStore>()((set) => ({
  ...initialSnapshot,
  refresh: () => set(snapshotViewport()),
}));

/**
 * Install the window listeners. Returns a cleanup that removes all of
 * them. Called once from the App shell; StrictMode-safe (idempotent
 * install/cleanup pairs).
 */
export function initViewportTracking(): () => void {
  const refresh = () => useViewportStore.getState().refresh();

  window.addEventListener('resize', refresh);
  window.addEventListener('orientationchange', refresh);
  // Pinch-zoom / on-screen keyboard on mobile change the visual viewport
  // without a window resize.
  window.visualViewport?.addEventListener('resize', refresh);
  window.visualViewport?.addEventListener('scroll', refresh);

  // DPR changes (browser zoom, moving the window between monitors) fire no
  // resize event of their own — watch a resolution media query, re-armed
  // each time it fires because the query text embeds the current DPR.
  let dprQuery: MediaQueryList | null = null;
  let disposed = false;
  const armDprWatcher = () => {
    if (disposed) return;
    dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    dprQuery.addEventListener('change', onDprChange, { once: true });
  };
  const onDprChange = () => {
    refresh();
    armDprWatcher();
  };
  armDprWatcher();

  refresh();

  return () => {
    disposed = true;
    window.removeEventListener('resize', refresh);
    window.removeEventListener('orientationchange', refresh);
    window.visualViewport?.removeEventListener('resize', refresh);
    window.visualViewport?.removeEventListener('scroll', refresh);
    dprQuery?.removeEventListener('change', onDprChange);
  };
}
