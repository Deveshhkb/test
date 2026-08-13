/**
 * Compile-time constants: values that describe the *shape* of the game rather
 * than tunable behaviour. Anything an operator might want to change per-brand
 * lives in `Config.ts` instead.
 */

/** Design space the whole layout is authored against (16:9 landscape). */
export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;

/** Portrait design space (9:16). */
export const DESIGN_WIDTH_PORTRAIT = 1080;
export const DESIGN_HEIGHT_PORTRAIT = 1920;

/** Breakpoints, measured on the short edge in CSS pixels. */
export const BREAKPOINT_MOBILE = 500;
export const BREAKPOINT_TABLET = 820;

/** Stacking order inside the game scene. Higher renders on top. */
export enum Depth {
  Background = 0,
  TableFelt = 10,
  BettingLayer = 20,
  ChipLayer = 30,
  CardLayer = 40,
  EffectLayer = 50,
  HudLayer = 60,
  RoadmapLayer = 70,
  ControlLayer = 80,
  OverlayLayer = 90,
  DragLayer = 100,
}

/** Brand palette. Overridable through `config.theme`. */
export const Palette = {
  /** Crimson baccarat felt, lit from above. */
  feltDeep: 0x2a0710,
  feltMid: 0x7d1730,
  feltLight: 0xa02a48,
  /** Tan leather rail along the player's edge. */
  rail: 0x7a4a24,
  gold: 0xd9b45b,
  goldBright: 0xf6e2a0,
  player: 0x2f7fe0,
  playerDark: 0x123a6b,
  banker: 0xd8323c,
  bankerDark: 0x6b1219,
  tie: 0x2eb872,
  tieDark: 0x114a2c,
  pair: 0xc06cd8,
  white: 0xffffff,
  ink: 0x0a0a0c,
  danger: 0xff5a5a,
  win: 0xffd76a,
} as const;

/** Bitmap font identifiers installed at boot. */
export const Fonts = {
  /** Chip denominations, bet totals — small, very high churn. */
  Numeric: "BaccaratNumeric",
  /** Countdown digits — large. */
  Countdown: "BaccaratCountdown",
  /** Hand score digits. */
  Score: "BaccaratScore",
  /** UI labels. */
  Label: "BaccaratLabel",
} as const;

/** Physical card proportions (poker size, 63x88mm). */
export const CARD_ASPECT = 88 / 63;
export const CARD_WIDTH = 132;
export const CARD_HEIGHT = Math.round(CARD_WIDTH * CARD_ASPECT);

/** Chip sprite diameter in design pixels. */
export const CHIP_SIZE = 92;

/** Roadmap grid geometry. */
export const ROAD_BEAD_ROWS = 6;
export const ROAD_BIG_ROWS = 6;
export const ROAD_DERIVED_ROWS = 6;

/** How many coups a shoe holds before the engine forces a shuffle. */
export const SHOE_DECKS = 8;

/** Cards left in the shoe below which the cut card is considered reached. */
export const SHOE_CUT_CARD_MIN = 20;
export const SHOE_CUT_CARD_RANGE = 40;

/** Pooling budgets — sized from the worst case round (6 cards + chip splash). */
export const POOL_SIZE_CARDS = 12;
export const POOL_SIZE_CHIPS = 96;
export const POOL_SIZE_PARTICLES = 160;

/** Milliseconds the engine waits for a network round before falling back. */
export const NETWORK_ROUND_TIMEOUT_MS = 20_000;
