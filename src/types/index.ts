/**
 * Core domain types shared by the game engine, UI, store and API layer.
 */

/** Every symbol that can appear on the reels. */
export type SymbolId =
  | 'WILD'
  | 'SCATTER'
  | 'BONUS'
  | 'SEVEN'
  | 'BELL'
  | 'DIAMOND'
  | 'CHERRY'
  | 'LEMON'
  | 'ORANGE'
  | 'PLUM'
  | 'MYSTERY';

/** A grid is column-major: grid[reel][row]. 5 reels x 3 rows. */
export type Grid = SymbolId[][];

/** [reel, row] coordinate on the grid. */
export type Cell = readonly [number, number];

export enum GamePhase {
  Loading = 'Loading',
  Idle = 'Idle',
  Spin = 'Spin',
  Stopping = 'Stopping',
  Evaluating = 'Evaluating',
  Win = 'Win',
  Bonus = 'Bonus',
  FreeSpin = 'FreeSpin',
  AutoSpin = 'AutoSpin',
  GameOver = 'GameOver',
}

export enum SpinMode {
  Normal = 'Normal',
  Quick = 'Quick',
  Turbo = 'Turbo',
}

export enum WinTier {
  None = 'None',
  Regular = 'Regular',
  Big = 'Big Win',
  Mega = 'Mega Win',
  SuperMega = 'Super Mega Win',
  Epic = 'Epic Win',
  Legendary = 'Legendary Win',
}

export type Volatility = 'low' | 'medium' | 'high';

/** A single winning payline. */
export interface PaylineWin {
  /** Index into the PAYLINES config table. -1 for scatter (pays any position). */
  lineIndex: number;
  symbol: SymbolId;
  /** Number of consecutive matching symbols from the leftmost reel. */
  count: number;
  /** Win amount in credits (already multiplied by active multiplier). */
  win: number;
  /** Cells that make up the win, for highlight animation. */
  positions: Cell[];
}

/** One tumble step of a cascading win sequence. */
export interface CascadeStep {
  /** Grid after removal of previous winners and refill. */
  reels: Grid;
  paylines: PaylineWin[];
  stepWin: number;
  /** Cascade multiplier applied to this step. */
  multiplier: number;
}

/** Feature data attached to a spin, used purely for presentation. */
export interface SpinFeatures {
  /** Reel indexes whose wild expanded to cover the full reel. */
  expandedWildReels: number[];
  /** Wilds that stick between free spins. */
  stickyWilds: Cell[];
  /** Wilds randomly dropped onto the grid before evaluation. */
  randomWilds: Cell[];
  /** Mystery symbols and what they transformed into. */
  mysteryTransforms: { position: Cell; symbol: SymbolId }[];
}

/** Server response for a single spin. */
export interface SpinResult {
  balance: number;
  bet: number;
  totalWin: number;
  /** Initial landed grid (before feature transforms), column-major. */
  reels: Grid;
  /** Grid after wild/mystery transforms — what wins were evaluated on. */
  finalReels: Grid;
  paylines: PaylineWin[];
  cascades: CascadeStep[];
  scatter: number;
  /** Free spins awarded by this spin (0 if none). */
  freeSpins: number;
  freeSpinsRemaining: number;
  isFreeSpin: boolean;
  /** Active win multiplier for this spin (e.g. 2x during free spins). */
  multiplier: number;
  /** True when 3+ bonus symbols triggered the bonus game. */
  bonusTriggered: boolean;
  features: SpinFeatures;
}

export interface BonusResult {
  balance: number;
  prize: number;
  /** The prizes offered in the pick-a-prize presentation. */
  options: number[];
  pickedIndex: number;
}

export interface HistoryEntry {
  id: number;
  timestamp: number;
  bet: number;
  win: number;
  isFreeSpin: boolean;
  scatter: number;
}

export interface LoginResult {
  playerId: string;
  balance: number;
  currency: string;
}

export interface GameSettings {
  musicVolume: number;
  soundVolume: number;
  turbo: boolean;
  quickSpin: boolean;
  language: string;
  quality: 'low' | 'medium' | 'high';
}

/** Number of auto spins; Infinity encodes "unlimited". */
export type AutoSpinCount = 10 | 25 | 50 | 100 | number;
