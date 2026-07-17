/** Layout and gameplay constants. All Pixi layout is done in a fixed design
 *  space which is scaled to fit the viewport (see SlotGame.resize). */

export const REEL_COUNT = 5;
export const ROW_COUNT = 3;
export const PAYLINE_COUNT = 20;

/** Design-space resolution the game is authored at. */
export const DESIGN_WIDTH = 1280;
export const DESIGN_HEIGHT = 720;

/** Symbol cell size in design pixels. */
export const SYMBOL_SIZE = 150;
export const SYMBOL_PADDING = 10;
export const REEL_GAP = 8;

export const REEL_WIDTH = SYMBOL_SIZE + REEL_GAP;
export const REEL_AREA_WIDTH = REEL_COUNT * REEL_WIDTH - REEL_GAP;
export const REEL_AREA_HEIGHT = ROW_COUNT * SYMBOL_SIZE;

/** Reel physics (symbols per second unless noted). */
export const REEL_MAX_SPEED = 22;
export const REEL_MAX_SPEED_TURBO = 38;
export const REEL_ACCEL = 60; // symbols / s^2
export const REEL_STAGGER_START = 0.12; // s between reel spin-ups
export const REEL_STAGGER_STOP = 0.28; // s between reel stops
export const REEL_STAGGER_STOP_QUICK = 0.1;
export const REEL_MIN_SPIN_TIME = 0.7; // s of full-speed spinning (normal)
export const REEL_MIN_SPIN_TIME_TURBO = 0.12;
export const REEL_STOP_DURATION = 0.55; // s of the settle tween
export const REEL_OVERSHOOT = 0.35; // symbols of bounce-past on stop
export const ANTICIPATION_EXTRA_TIME = 1.6; // s slow-roll on scatter tease

/** Extra symbols rendered above/below the visible window for seamless wrap. */
export const REEL_OVERFLOW_SYMBOLS = 2;

export const DEFAULT_BALANCE = 1000;
export const COIN_VALUES = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1];
export const BET_LEVELS = [1, 2, 3, 5, 8, 10, 15, 20, 30, 50];
export const DEFAULT_COIN_INDEX = 3;
export const DEFAULT_BET_INDEX = 1;

export const AUTO_SPIN_OPTIONS = [10, 25, 50, 100, Infinity] as const;

export const HISTORY_LIMIT = 50;

export const Z = {
  background: 0,
  reels: 10,
  reelFrame: 20,
  winLines: 30,
  particles: 40,
  overlay: 50,
  bigWin: 60,
} as const;
