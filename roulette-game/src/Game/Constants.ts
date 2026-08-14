import { PocketColor, RouletteNumber, WheelType } from '../Types';

/**
 * Immutable domain constants: physical wheel orders, colour tables and the
 * abstract geometry of the betting layout.
 *
 * Nothing here is configurable because none of it is a preference - it is the
 * physical description of a roulette table. Anything a operator might tune
 * (speeds, payouts, limits, colours) lives in `Config.ts` instead.
 */

/* ------------------------------------------------------------------------- */
/* Wheel orders                                                               */
/* ------------------------------------------------------------------------- */

/**
 * Pocket sequence of a single-zero wheel, clockwise as seen from above.
 * This exact order is what makes the wheel *look* real: neighbouring numbers
 * alternate colour and the two halves each sum to a balanced total.
 */
export const EUROPEAN_WHEEL_ORDER: readonly RouletteNumber[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

/** Pocket sequence of a double-zero wheel, clockwise. */
export const AMERICAN_WHEEL_ORDER: readonly RouletteNumber[] = [
  0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, '00',
  27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2,
] as const;

export function getWheelOrder(type: WheelType): readonly RouletteNumber[] {
  return type === WheelType.AMERICAN ? AMERICAN_WHEEL_ORDER : EUROPEAN_WHEEL_ORDER;
}

/* ------------------------------------------------------------------------- */
/* Colours                                                                    */
/* ------------------------------------------------------------------------- */

/** The eighteen red numbers. Everything else in 1-36 is black. */
export const RED_NUMBERS: ReadonlySet<number> = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function getNumberColor(value: RouletteNumber): PocketColor {
  if (value === 0 || value === '00') return PocketColor.GREEN;
  return RED_NUMBERS.has(value as number) ? PocketColor.RED : PocketColor.BLACK;
}

/* ------------------------------------------------------------------------- */
/* Betting layout geometry                                                    */
/* ------------------------------------------------------------------------- */

/**
 * The felt is modelled in *board units* where one unit is one number cell.
 * The number grid occupies x:[0,12] y:[0,3]; the zero column sits at x:[-1,0];
 * dozens at y:[3,4]; even-money bets at y:[4,5]; column bets at x:[12,13].
 *
 *        -1        0                                   12      13
 *        +---------+-----------------------------------+-------+  0
 *        |         |  3  6  9 12 15 18 21 24 27 30 33 36|  2:1  |
 *        |    0    |  2  5  8 11 14 17 20 23 26 29 32 35|  2:1  |
 *        |         |  1  4  7 10 13 16 19 22 25 28 31 34|  2:1  |
 *        +---------+------------+-----------+-----------+-------+  3
 *                  |   1st 12   |   2nd 12  |   3rd 12  |
 *                  +-----+------+-----+-----+-----+-----+          4
 *                  | 1-18|EVEN  | RED |BLACK| ODD |19-36|
 *                  +-----+------+-----+-----+-----+-----+          5
 */
export const BOARD = {
  /** Number-grid columns (12) and rows (3). */
  COLUMNS: 12,
  ROWS: 3,
  /** Left edge of the zero cell, in board units. */
  ZERO_LEFT: -1,
  /** Right edge of the "2 to 1" column-bet strip. */
  COLUMN_BET_RIGHT: 13,
  /** Grid bottom / dozens top. */
  DOZEN_TOP: 3,
  DOZEN_BOTTOM: 4,
  /** Even-money row. */
  OUTSIDE_TOP: 4,
  OUTSIDE_BOTTOM: 5,
  /** Full extents used for scaling. */
  MIN_X: -1,
  MAX_X: 13,
  MIN_Y: 0,
  MAX_Y: 5,
  /**
   * Half-extent of the hit region for point bets (splits, corners, streets,
   * six-lines). Small enough that the middle of a cell always resolves to the
   * straight-up bet, large enough to be reachable with a thumb.
   */
  POINT_HIT_RADIUS: 0.24,
  /** Touch devices get a slightly more forgiving point radius. */
  POINT_HIT_RADIUS_TOUCH: 0.3,
} as const;

export const BOARD_WIDTH = BOARD.MAX_X - BOARD.MIN_X; // 14 units
export const BOARD_HEIGHT = BOARD.MAX_Y - BOARD.MIN_Y; // 5 units

/**
 * Number occupying grid cell (column, row).
 * Column 0 row 0 is `3`, row 1 is `2`, row 2 is `1`.
 */
export function gridNumber(column: number, row: number): number {
  return column * 3 + (3 - row);
}

/* ------------------------------------------------------------------------- */
/* Wheel rendering geometry (fractions of the wheel radius)                   */
/* ------------------------------------------------------------------------- */

/**
 * Wheel geometry as fractions of the wheel's outer radius.
 *
 * These values are measured from the supplied wheel artwork rather than
 * invented, so the physics and the picture agree: the rim sprite's inner hole
 * sits at 0.683 of its outer radius and the pocket-ring sprite is 0.680 wide,
 * which is why the ring drops exactly into the bowl. `CONE_OUTER` and
 * `SPINDLE` are likewise the artwork's own proportions.
 *
 * If you replace the art, re-measure and update here - the ball would otherwise
 * come to rest somewhere that is not a pocket.
 */
export const WHEEL_GEOMETRY = {
  /** Outer wooden bowl. */
  BOWL_OUTER: 1.0,
  BOWL_INNER: 0.92,
  /** The polished track the ball is launched onto, out on the wooden apron. */
  BALL_TRACK: 0.83,
  /** Radius at which the deflectors (diamonds) sit. */
  DEFLECTOR: 0.74,
  /** Outer edge of the rotating wheel head - matches the rim's inner hole. */
  HEAD_OUTER: 0.68,
  /** Radius of the pocket centres - where the ball comes to rest. */
  POCKET: 0.55,
  /** Inner edge of the pocket ring. */
  POCKET_INNER: 0.29,
  /** Decorative cone / turret, measured from the artwork. */
  CONE_OUTER: 0.371,
  CONE_INNER: 0.12,
  /** Central spindle cross. */
  SPINDLE: 0.274,
  /**
   * Ball radius as a fraction of the wheel radius.
   *
   * Measured off the reference footage: the ball is ~25px across on a ~940px
   * wheel, i.e. 0.053 of the radius in diameter. It is a small object - sizing
   * it by the artwork's own bounding box (which includes a drop shadow) makes
   * it roughly twice too big and instantly reads as a toy.
   */
  BALL: 0.027,
  /** Number of deflectors on the bowl. */
  DEFLECTOR_COUNT: 8,
} as const;

/* ------------------------------------------------------------------------- */
/* Layout breakpoints (CSS pixels, shortest edge)                             */
/* ------------------------------------------------------------------------- */

export const BREAKPOINTS = {
  MOBILE_MAX: 599,
  TABLET_MAX: 1023,
} as const;

/** Design-space reference resolution used to derive the uniform UI scale. */
export const DESIGN = {
  LANDSCAPE_WIDTH: 1280,
  LANDSCAPE_HEIGHT: 720,
  PORTRAIT_WIDTH: 720,
  PORTRAIT_HEIGHT: 1280,
  MIN_SCALE: 0.45,
  MAX_SCALE: 1.6,
} as const;

/** z-order of the scene layers. Kept in one place so nothing fights for depth. */
export const LAYER = {
  BACKGROUND: 0,
  FELT: 5,
  TABLE: 10,
  BOARD_FX: 20,
  CHIPS: 30,
  /** Scrim that darkens the table while the wheel overlay is up. */
  DIM: 35,
  WHEEL: 40,
  MARKER: 50,
  HUD: 60,
  OVERLAY: 70,
  DEBUG: 100,
} as const;
