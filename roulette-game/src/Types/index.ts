/**
 * Shared domain types for the Roulette engine.
 *
 * This module is intentionally free of runtime imports so it can be consumed by
 * a backend, a test harness or a host application without dragging PixiJS into
 * the bundle.
 */

/* ------------------------------------------------------------------------- */
/* Game state machine                                                         */
/* ------------------------------------------------------------------------- */

/**
 * The canonical round lifecycle. Transitions are validated by
 * {@link GameManager}; illegal transitions throw in development and are logged
 * and ignored in production so a malformed server frame can never wedge the
 * client.
 */
export enum GameState {
  /** Engine constructed, nothing rendered yet. */
  BOOT = 'BOOT',
  /** Assets downloading / procedural textures baking. */
  LOADING = 'LOADING',
  /** Connected and idle - waiting for the dealer/server to open a round. */
  WAITING = 'WAITING',
  /** Bets accepted. Countdown running. */
  BETTING_OPEN = 'BETTING_OPEN',
  /** Final seconds. Bets still accepted, UI switches to urgent styling. */
  LAST_CALL = 'LAST_CALL',
  /** "No more bets". Board locked. */
  BETTING_CLOSED = 'BETTING_CLOSED',
  /** Wheel accelerating, ball launched onto the rim. */
  SPINNING = 'SPINNING',
  /** Ball decelerating on the track and dropping through the deflectors. */
  BALL_ROLLING = 'BALL_ROLLING',
  /** Ball has settled; the winning pocket is known. */
  WINNER_DETECTED = 'WINNER_DETECTED',
  /** Losing chips swept, winning chips paid out. */
  PAYOUT = 'PAYOUT',
  /** Result banner + history update. */
  RESULT = 'RESULT',
  /** Board cleared, ready for the next round. */
  RESET = 'RESET',
}

/* ------------------------------------------------------------------------- */
/* Wheel                                                                      */
/* ------------------------------------------------------------------------- */

export enum WheelType {
  /** 37 pockets, single zero. */
  EUROPEAN = 'EUROPEAN',
  /** 38 pockets, zero and double zero. */
  AMERICAN = 'AMERICAN',
}

/** Pocket colour. `00` shares the green of `0`. */
export enum PocketColor {
  RED = 'RED',
  BLACK = 'BLACK',
  GREEN = 'GREEN',
}

/**
 * A roulette number. `'00'` is modelled as a string so that `0` and `00` stay
 * distinguishable, which matters for American payouts and history rendering.
 */
export type RouletteNumber = number | '00';

export interface Pocket {
  /** The face value of the pocket. */
  readonly value: RouletteNumber;
  /** Colour of the pocket on the wheel and on the layout. */
  readonly color: PocketColor;
  /** Index of the pocket in physical wheel order, clockwise from the zero. */
  readonly index: number;
  /** Centre angle of the pocket in radians, measured from the wheel's 12 o'clock. */
  readonly angle: number;
}

/* ------------------------------------------------------------------------- */
/* Betting                                                                    */
/* ------------------------------------------------------------------------- */

export enum BetType {
  STRAIGHT_UP = 'STRAIGHT_UP',
  SPLIT = 'SPLIT',
  STREET = 'STREET',
  CORNER = 'CORNER',
  SIX_LINE = 'SIX_LINE',
  /** 0-1-2 or 0-2-3 (single zero) / 0-00-2 style trios (double zero). */
  TRIO = 'TRIO',
  /** 0-1-2-3 ("first four") on a single-zero layout. */
  BASKET = 'BASKET',
  COLUMN = 'COLUMN',
  DOZEN = 'DOZEN',
  RED = 'RED',
  BLACK = 'BLACK',
  ODD = 'ODD',
  EVEN = 'EVEN',
  /** 1-18. */
  LOW = 'LOW',
  /** 19-36. */
  HIGH = 'HIGH',
}

/**
 * A clickable region on the felt. Geometry is expressed in abstract *board
 * units* (one unit = one number cell) so the layout is resolution independent;
 * {@link BettingBoard} multiplies by the runtime cell size.
 */
export interface BetSpot {
  /** Stable identifier, e.g. `straight:17`, `split:17-20`, `dozen:2`. */
  readonly id: string;
  readonly type: BetType;
  /** Every number this spot pays on. */
  readonly numbers: readonly RouletteNumber[];
  /** Centre of the spot in board units - chips stack here. */
  readonly x: number;
  readonly y: number;
  /** Hit-region half-extents in board units. */
  readonly hitWidth: number;
  readonly hitHeight: number;
  /** Human readable label for accessibility and tooltips. */
  readonly label: string;
}

/** A wager the player currently has on the felt. */
export interface Bet {
  readonly spotId: string;
  readonly type: BetType;
  readonly numbers: readonly RouletteNumber[];
  /** Total staked on this spot, in currency minor units resolved by config. */
  amount: number;
  /** Chip denominations composing the stack, in placement order (for undo). */
  chips: number[];
}

/** One entry on the undo stack. */
export interface BetAction {
  readonly spotId: string;
  readonly amount: number;
}

/** Result of evaluating the player's bets against a winning number. */
export interface BetResolution {
  readonly spotId: string;
  readonly type: BetType;
  readonly staked: number;
  /** Stake returned + profit. Zero for a losing bet. */
  readonly payout: number;
  readonly won: boolean;
}

export interface RoundResult {
  readonly roundId: string;
  readonly winningNumber: RouletteNumber;
  readonly color: PocketColor;
  readonly totalStaked: number;
  readonly totalPayout: number;
  readonly resolutions: readonly BetResolution[];
}

/* ------------------------------------------------------------------------- */
/* History & statistics                                                       */
/* ------------------------------------------------------------------------- */

export interface HistoryEntry {
  readonly roundId: string;
  readonly number: RouletteNumber;
  readonly color: PocketColor;
  readonly timestamp: number;
}

export interface Statistics {
  readonly total: number;
  readonly red: number;
  readonly black: number;
  readonly green: number;
  readonly odd: number;
  readonly even: number;
  readonly low: number;
  readonly high: number;
  readonly dozens: readonly [number, number, number];
  readonly columns: readonly [number, number, number];
  /** Hit count per number, keyed by the number's string form. */
  readonly hits: Readonly<Record<string, number>>;
  /** Numbers that have not appeared for the longest, hottest first. */
  readonly hot: readonly RouletteNumber[];
  readonly cold: readonly RouletteNumber[];
}

/* ------------------------------------------------------------------------- */
/* Layout                                                                     */
/* ------------------------------------------------------------------------- */

export enum Orientation {
  PORTRAIT = 'PORTRAIT',
  LANDSCAPE = 'LANDSCAPE',
}

export enum Breakpoint {
  MOBILE = 'MOBILE',
  TABLET = 'TABLET',
  DESKTOP = 'DESKTOP',
}

/** Insets in CSS pixels reported by `env(safe-area-inset-*)`. */
export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Everything a view needs to place itself. Recomputed on resize / orientation
 * change / DPR change and broadcast on {@link GameEvent.RESIZE}.
 */
export interface LayoutMetrics {
  /** Canvas CSS size. */
  readonly width: number;
  readonly height: number;
  readonly orientation: Orientation;
  readonly breakpoint: Breakpoint;
  readonly devicePixelRatio: number;
  readonly safeArea: SafeAreaInsets;
  /** Usable rectangle once safe-area insets are removed. */
  readonly safeWidth: number;
  readonly safeHeight: number;
  readonly safeLeft: number;
  readonly safeTop: number;
  /** Uniform scale mapping design-space units to screen pixels. */
  readonly scale: number;
  readonly isTouch: boolean;
}

/* ------------------------------------------------------------------------- */
/* Theming & localisation                                                     */
/* ------------------------------------------------------------------------- */

export interface Theme {
  readonly name: string;
  readonly backgroundTop: number;
  readonly backgroundBottom: number;
  readonly feltPrimary: number;
  readonly feltSecondary: number;
  readonly feltLine: number;
  readonly red: number;
  readonly black: number;
  readonly green: number;
  readonly gold: number;
  readonly goldDark: number;
  readonly wood: number;
  readonly woodDark: number;
  readonly metal: number;
  readonly text: number;
  readonly textMuted: number;
  readonly panel: number;
  readonly panelBorder: number;
  readonly highlight: number;
  readonly danger: number;
  readonly success: number;
}

export type LocaleStrings = Record<string, string>;

/* ------------------------------------------------------------------------- */
/* Public engine surface                                                      */
/* ------------------------------------------------------------------------- */

/**
 * The complete contract exposed to a host application. Deliberately tiny: a
 * host mounts, sizes and disposes the game and never reaches inside it.
 */
export interface IRouletteGame {
  init(container: HTMLElement, config?: PartialGameConfig): Promise<void>;
  destroy(): void;
  pause(): void;
  resume(): void;
  resize(width: number, height: number): void;
  reset(): void;
  updateConfig(config: PartialGameConfig): void;
  setTheme(theme: string | Theme): void;
  setLanguage(language: string): void;
}

/* ------------------------------------------------------------------------- */
/* Configuration                                                              */
/* ------------------------------------------------------------------------- */

export interface WheelConfig {
  readonly type: WheelType;
  /** Idle wheel speed in revolutions per second (negative = counter-clockwise). */
  wheelSpeed: number;
  /** Peak wheel speed during a spin, rev/s. */
  wheelSpinSpeed: number;
  /** Seconds the wheel takes to reach `wheelSpinSpeed`. */
  wheelAccelerationTime: number;
  /** Peak ball speed on the rim, rev/s (sign is opposite the wheel). */
  ballSpeed: number;
  /** Seconds of ball travel on the outer track before it starts dropping. */
  ballTrackDuration: number;
  /** Seconds for the drop + deflector bounces + settle. */
  ballDropDuration: number;
  /** How many times the ball bounces off deflectors/frets before settling. */
  ballBounces: number;
}

export interface TimingConfig {
  /** Seconds bets stay open. */
  bettingDuration: number;
  /** Seconds remaining at which LAST_CALL styling kicks in. */
  lastCallThreshold: number;
  /** Pause between "no more bets" and the ball launch. */
  preSpinDelay: number;
  /** Seconds the winner banner + marker hold before payout. */
  winnerHoldDuration: number;
  /** Seconds the payout animation runs. */
  payoutDuration: number;
  /** Seconds the result screen holds before the board resets. */
  resultDuration: number;
}

export interface ChipDenomination {
  readonly value: number;
  readonly color: number;
  readonly accent: number;
  /** Short label rendered on the chip face, e.g. `1K`. */
  readonly label: string;
}

export interface BettingConfig {
  readonly chips: readonly ChipDenomination[];
  /** Minimum accepted stake on a single spot. */
  minBet: number;
  /** Maximum accepted stake on a single spot. */
  maxBet: number;
  /** Maximum total across the whole table. */
  maxTotalBet: number;
  /** Per-bet-type table limits; falls back to `maxBet` when absent. */
  limits: Partial<Record<BetType, { min: number; max: number }>>;
  /** Payout multipliers expressed as "to 1" odds. */
  payouts: Record<BetType, number>;
}

export interface AudioConfig {
  enabled: boolean;
  muted: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  /** Optional URLs; any missing entry falls back to procedural synthesis. */
  sources: Partial<Record<SoundId, string>>;
}

export interface RenderConfig {
  /** `undefined` lets the engine pick `min(devicePixelRatio, maxResolution)`. */
  resolution?: number;
  maxResolution: number;
  antialias: boolean;
  /** Cap the ticker; 0 means uncapped (vsync). */
  maxFPS: number;
  backgroundAlpha: number;
  /** Render an FPS/draw-call overlay. */
  showStats: boolean;
  /** Use `powerPreference: 'high-performance'` on the WebGL context. */
  highPerformance: boolean;
}

export interface NetworkConfig {
  /**
   * When `false` the engine drives rounds itself (useful for demos, QA rigs and
   * offline play). When `true` every round transition must arrive as an event
   * from the host - see docs/BACKEND.md.
   */
  serverDriven: boolean;
  /** Player balance is authoritative on the server when `serverDriven`. */
  startingBalance: number;
  currency: string;
  /** Client-side RNG seed; ignored when `serverDriven`. */
  seed?: number;
}

export interface GameConfig {
  wheel: WheelConfig;
  timing: TimingConfig;
  betting: BettingConfig;
  audio: AudioConfig;
  render: RenderConfig;
  network: NetworkConfig;
  theme: string;
  language: string;
  /** Base URL prefixed to every asset in the manifest. */
  assetBaseUrl: string;
  /** Emit verbose logs. */
  debug: boolean;
}

/** Deep-partial config accepted by `init()` and `updateConfig()`. */
export type PartialGameConfig = {
  [K in keyof GameConfig]?: GameConfig[K] extends object
    ? Partial<GameConfig[K]>
    : GameConfig[K];
};

/* ------------------------------------------------------------------------- */
/* Audio                                                                      */
/* ------------------------------------------------------------------------- */

export enum SoundId {
  WHEEL_SPIN = 'WHEEL_SPIN',
  BALL_ROLL = 'BALL_ROLL',
  BALL_DROP = 'BALL_DROP',
  CHIP_PLACE = 'CHIP_PLACE',
  CHIP_CLEAR = 'CHIP_CLEAR',
  BET_CONFIRM = 'BET_CONFIRM',
  COUNTDOWN_TICK = 'COUNTDOWN_TICK',
  COUNTDOWN_URGENT = 'COUNTDOWN_URGENT',
  NO_MORE_BETS = 'NO_MORE_BETS',
  WIN = 'WIN',
  BIG_WIN = 'BIG_WIN',
  LOSE = 'LOSE',
  BUTTON_CLICK = 'BUTTON_CLICK',
  PAYOUT = 'PAYOUT',
}

/* ------------------------------------------------------------------------- */
/* Events                                                                     */
/* ------------------------------------------------------------------------- */

/**
 * Every cross-module message flows through these names. Anything a backend
 * would drive is represented here, so swapping the internal round driver for a
 * WebSocket feed requires no changes to view code.
 */
export enum GameEvent {
  /* Lifecycle */
  BOOT_COMPLETE = 'BOOT_COMPLETE',
  ASSETS_PROGRESS = 'ASSETS_PROGRESS',
  ASSETS_COMPLETE = 'ASSETS_COMPLETE',
  READY = 'READY',
  STATE_CHANGE = 'STATE_CHANGE',
  PAUSED = 'PAUSED',
  RESUMED = 'RESUMED',
  DESTROYED = 'DESTROYED',

  /* Round flow - the backend integration surface */
  ROUND_START = 'ROUND_START',
  BET_OPEN = 'BET_OPEN',
  LAST_CALL = 'LAST_CALL',
  BET_CLOSED = 'BET_CLOSED',
  SPIN_START = 'SPIN_START',
  BALL_DROP = 'BALL_DROP',
  WIN_NUMBER = 'WIN_NUMBER',
  PAYOUT = 'PAYOUT',
  ROUND_END = 'ROUND_END',
  SYNC_TIMER = 'SYNC_TIMER',
  SYNC_HISTORY = 'SYNC_HISTORY',
  SYNC_BALANCE = 'SYNC_BALANCE',

  /* Player intent */
  PLACE_BET = 'PLACE_BET',
  BET_PLACED = 'BET_PLACED',
  BET_REJECTED = 'BET_REJECTED',
  UNDO_BET = 'UNDO_BET',
  DOUBLE_BET = 'DOUBLE_BET',
  REPEAT_BET = 'REPEAT_BET',
  CLEAR_BET = 'CLEAR_BET',
  BETS_CHANGED = 'BETS_CHANGED',
  CHIP_SELECTED = 'CHIP_SELECTED',

  /* Presentation */
  RESIZE = 'RESIZE',
  ORIENTATION_CHANGE = 'ORIENTATION_CHANGE',
  THEME_CHANGE = 'THEME_CHANGE',
  LANGUAGE_CHANGE = 'LANGUAGE_CHANGE',
  CONFIG_CHANGE = 'CONFIG_CHANGE',
  SPOT_HOVER = 'SPOT_HOVER',
  SPOT_HOVER_END = 'SPOT_HOVER_END',
  HISTORY_UPDATE = 'HISTORY_UPDATE',
  BALANCE_CHANGE = 'BALANCE_CHANGE',
  ERROR = 'ERROR',
}

/** Payload contracts, keyed by event name. */
export interface GameEventPayloads {
  [GameEvent.BOOT_COMPLETE]: void;
  [GameEvent.ASSETS_PROGRESS]: { progress: number };
  [GameEvent.ASSETS_COMPLETE]: void;
  [GameEvent.READY]: void;
  [GameEvent.STATE_CHANGE]: { from: GameState; to: GameState };
  [GameEvent.PAUSED]: void;
  [GameEvent.RESUMED]: void;
  [GameEvent.DESTROYED]: void;

  [GameEvent.ROUND_START]: { roundId: string };
  [GameEvent.BET_OPEN]: { roundId: string; duration: number };
  [GameEvent.LAST_CALL]: { remaining: number };
  [GameEvent.BET_CLOSED]: { roundId: string };
  [GameEvent.SPIN_START]: { roundId: string; winningNumber: RouletteNumber };
  [GameEvent.BALL_DROP]: { roundId: string };
  [GameEvent.WIN_NUMBER]: { roundId: string; number: RouletteNumber; color: PocketColor };
  [GameEvent.PAYOUT]: RoundResult;
  [GameEvent.ROUND_END]: { roundId: string };
  [GameEvent.SYNC_TIMER]: { remaining: number; total: number };
  [GameEvent.SYNC_HISTORY]: { entries: readonly HistoryEntry[] };
  [GameEvent.SYNC_BALANCE]: { balance: number };

  [GameEvent.PLACE_BET]: { spotId: string; amount: number };
  [GameEvent.BET_PLACED]: { spotId: string; amount: number; total: number };
  [GameEvent.BET_REJECTED]: { spotId: string; reason: string };
  [GameEvent.UNDO_BET]: void;
  [GameEvent.DOUBLE_BET]: void;
  [GameEvent.REPEAT_BET]: void;
  [GameEvent.CLEAR_BET]: void;
  [GameEvent.BETS_CHANGED]: { bets: readonly Bet[]; total: number };
  [GameEvent.CHIP_SELECTED]: { value: number };

  [GameEvent.RESIZE]: LayoutMetrics;
  [GameEvent.ORIENTATION_CHANGE]: { orientation: Orientation };
  [GameEvent.THEME_CHANGE]: { theme: Theme };
  [GameEvent.LANGUAGE_CHANGE]: { language: string };
  [GameEvent.CONFIG_CHANGE]: { config: GameConfig };
  [GameEvent.SPOT_HOVER]: { spotId: string; numbers: readonly RouletteNumber[] };
  [GameEvent.SPOT_HOVER_END]: void;
  [GameEvent.HISTORY_UPDATE]: { entries: readonly HistoryEntry[]; stats: Statistics };
  [GameEvent.BALANCE_CHANGE]: { balance: number; delta: number };
  [GameEvent.ERROR]: { message: string; fatal: boolean };
}
