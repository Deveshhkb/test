import type { Application } from 'pixi.js';
import { Logger } from '../Utilities/Logger';

/** Semantic actions the input layer can raise. */
export enum InputAction {
  UNDO = 'UNDO',
  REPEAT = 'REPEAT',
  DOUBLE = 'DOUBLE',
  CLEAR = 'CLEAR',
  TOGGLE_MUTE = 'TOGGLE_MUTE',
  NEXT_CHIP = 'NEXT_CHIP',
  PREVIOUS_CHIP = 'PREVIOUS_CHIP',
  TOGGLE_STATS = 'TOGGLE_STATS',
}

/**
 * Keyboard, pointer-policy and page-visibility handling.
 *
 * Three jobs:
 *
 * 1. **Keyboard shortcuts** - desk players expect them, and they are the only
 *    way the game is operable without a mouse.
 * 2. **Auto-pause on hide** - a backgrounded tab throttles `requestAnimationFrame`
 *    to about once a second. Without this, returning to the tab mid-spin would
 *    resume a simulation that thinks several seconds passed in one frame.
 * 3. **Gesture suppression** - context menus and pinch-zoom on the canvas make a
 *    casino table feel like a web page. They are cancelled on the canvas only,
 *    never document-wide, so surrounding host UI keeps its normal behaviour.
 */
export class InputManager {
  private readonly log = Logger.create('InputManager');
  private readonly canvas: HTMLCanvasElement;
  private enabled = true;

  /** Raised for a recognised shortcut. */
  public onAction?: (action: InputAction) => void;
  /** Raised when the page is hidden or shown. */
  public onVisibilityChange?: (visible: boolean) => void;

  public constructor(app: Application) {
    this.canvas = app.canvas as HTMLCanvasElement;
    this.attach();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /* --------------------------------------------------------------------- */
  /* Wiring                                                                */
  /* --------------------------------------------------------------------- */

  private attach(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('visibilitychange', this.handleVisibility);

    this.canvas.addEventListener('contextmenu', this.preventDefault);
    // Non-passive is required: a passive listener cannot call preventDefault,
    // and pinch-zoom on the table is exactly what we are here to stop.
    this.canvas.addEventListener('gesturestart', this.preventDefault, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('visibilitychange', this.handleVisibility);

    this.canvas.removeEventListener('contextmenu', this.preventDefault);
    this.canvas.removeEventListener('gesturestart', this.preventDefault);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);

    this.onAction = undefined;
    this.onVisibilityChange = undefined;
  }

  /* --------------------------------------------------------------------- */
  /* Handlers                                                              */
  /* --------------------------------------------------------------------- */

  private readonly preventDefault = (event: Event): void => {
    event.preventDefault();
  };

  /** Block multi-touch scroll/zoom on the canvas, allow single-finger taps. */
  private readonly handleTouchMove = (event: TouchEvent): void => {
    if (event.touches.length > 1) event.preventDefault();
  };

  private readonly handleVisibility = (): void => {
    const visible = document.visibilityState === 'visible';
    this.log.debug(`visibility -> ${visible ? 'visible' : 'hidden'}`);
    this.onVisibilityChange?.(visible);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;

    // Never steal keys from a host application's form fields.
    const target = event.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    if (target?.isContentEditable) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const action = KEY_BINDINGS[event.key.toLowerCase()];
    if (!action) return;

    event.preventDefault();
    this.onAction?.(action);
  };
}

/**
 * Key -> action map.
 *
 * Chosen to sit under the left hand so a player can bet with the mouse and
 * manage the stake with the keyboard simultaneously.
 */
const KEY_BINDINGS: Readonly<Record<string, InputAction>> = {
  z: InputAction.UNDO,
  backspace: InputAction.UNDO,
  r: InputAction.REPEAT,
  d: InputAction.DOUBLE,
  c: InputAction.CLEAR,
  escape: InputAction.CLEAR,
  m: InputAction.TOGGLE_MUTE,
  arrowup: InputAction.NEXT_CHIP,
  arrowright: InputAction.NEXT_CHIP,
  arrowdown: InputAction.PREVIOUS_CHIP,
  arrowleft: InputAction.PREVIOUS_CHIP,
  s: InputAction.TOGGLE_STATS,
};
