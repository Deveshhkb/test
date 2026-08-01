/**
 * Browser-level input hardening for a full-screen canvas game.
 *
 * Stops the page itself from reacting to gameplay gestures: no rubber-band
 * scrolling, no double-tap or pinch zoom, no text selection, no long-press
 * context menu, and no arrow/space key page scrolling.
 */

export interface InputGuardOptions {
  /** Allow pinch-zoom anyway (accessibility escape hatch). */
  allowPinchZoom?: boolean;
}

export function installInputGuards(
  canvas: HTMLCanvasElement,
  options: InputGuardOptions = {},
): () => void {
  const disposers: Array<() => void> = [];
  const on = <T extends EventTarget>(
    target: T,
    type: string,
    handler: EventListener,
    opts?: AddEventListenerOptions,
  ) => {
    target.addEventListener(type, handler, opts);
    disposers.push(() => target.removeEventListener(type, handler, opts));
  };

  const passiveFalse: AddEventListenerOptions = { passive: false };

  // --- scrolling / rubber banding -------------------------------------------
  on(
    document,
    "touchmove",
    (event) => {
      const touch = event as TouchEvent;
      // Multi-touch is gameplay (or a pinch we are blocking), never a scroll.
      if (touch.touches.length > 1 || isGameSurface(touch.target)) {
        if (touch.cancelable) touch.preventDefault();
      }
    },
    passiveFalse,
  );

  on(
    document,
    "wheel",
    (event) => {
      const wheel = event as WheelEvent;
      // ctrl+wheel is the desktop pinch-zoom gesture on trackpads.
      if (wheel.ctrlKey && !options.allowPinchZoom && wheel.cancelable)
        wheel.preventDefault();
    },
    passiveFalse,
  );

  // --- double-tap zoom (iOS Safari) -----------------------------------------
  let lastTouchEnd = 0;
  on(
    document,
    "touchend",
    (event) => {
      const now = Date.now();
      if (now - lastTouchEnd < 320 && event.cancelable) event.preventDefault();
      lastTouchEnd = now;
    },
    passiveFalse,
  );

  // --- pinch zoom (Safari gesture events) -----------------------------------
  if (!options.allowPinchZoom) {
    for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
      on(document, type, (event) => event.preventDefault(), passiveFalse);
    }
  }

  // --- selection / drag / long-press menu -----------------------------------
  on(document, "selectstart", (event) => {
    if (isGameSurface(event.target)) event.preventDefault();
  });
  on(document, "dragstart", (event) => {
    if (isGameSurface(event.target)) event.preventDefault();
  });
  on(canvas, "contextmenu", (event) => event.preventDefault());

  // --- keyboard page scrolling ----------------------------------------------
  const scrollKeys = new Set([
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "PageUp",
    "PageDown",
    "Home",
    "End",
    " ",
    "Spacebar",
  ]);
  on(
    window,
    "keydown",
    (event) => {
      const key = (event as KeyboardEvent).key;
      const target = event.target as HTMLElement | null;
      const typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if (!typing && scrollKeys.has(key) && event.cancelable)
        event.preventDefault();
    },
    passiveFalse,
  );

  // --- iOS: keep the document pinned so the page can never scroll ------------
  const restoreScroll = window.scrollTo.bind(window);
  const pin = () => restoreScroll(0, 0);
  on(window, "scroll", pin, { passive: true });
  pin();

  return () => disposers.forEach((dispose) => dispose());
}

function isGameSurface(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true; // document / window
  return (
    target.tagName === "CANVAS" || target.closest("#pixi-container") !== null
  );
}

/** Requests fullscreen with the vendor-prefixed fallbacks Safari still needs. */
export async function toggleFullscreen(
  element: HTMLElement = document.documentElement,
): Promise<void> {
  type LegacyElement = HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  type LegacyDocument = Document & {
    webkitExitFullscreen?: () => Promise<void> | void;
    webkitFullscreenElement?: Element | null;
  };
  const doc = document as LegacyDocument;
  const active =
    document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;

  try {
    if (active) {
      await (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
    } else {
      const el = element as LegacyElement;
      await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
    }
  } catch {
    // Fullscreen is unavailable on iPhone Safari; the layout already handles
    // running inside browser chrome, so failing here is harmless.
  }
}
