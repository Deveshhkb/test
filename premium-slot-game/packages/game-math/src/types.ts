/** Symbol identifiers used across client and server. */
export const SYMBOL_IDS = [
  'HERO', // female cyberpunk hero
  'HACKER', // female hacker
  'FIGHTER', // male cyberpunk fighter
  'SOLDIER', // futuristic soldier
  'RIFLE', // futuristic weapon
  'BLASTER', // energy gun
  'HELMET', // cybernetic helmet
  'GRENADE', // neon grenade
  'BATTERY', // energy battery
  'HOLO', // holographic device
  'A',
  'K',
  'Q',
  'J',
  'TEN',
  'WILD',
  'SCATTER',
  'BONUS',
] as const;

export type SymbolId = (typeof SYMBOL_IDS)[number];
export type SymbolKind = 'character' | 'premium' | 'low' | 'wild' | 'scatter' | 'bonus';

/** grid[reel][row]; row 0 is the top row. */
export type Grid = SymbolId[][];

export interface Position {
  reel: number;
  row: number;
}

export interface SymbolDefinition {
  id: SymbolId;
  name: string;
  kind: SymbolKind;
  /** Pay table as multiples of the total bet *per way*, keyed by number of consecutive reels. */
  pays?: Partial<Record<number, number>>;
}

export interface WinTierThresholds {
  /** Multiples of total bet. */
  big: number;
  mega: number;
  epic: number;
}

export type WinTier = 'NONE' | 'NORMAL' | 'BIG' | 'MEGA' | 'EPIC';

export interface LuckyRule {
  /** Lucky Win is shown when a round has at least this many winning cascade steps... */
  minWinningCascades: number;
  /** ...or when a single ways-win uses at least this many WILD positions. */
  minWildsInWin: number;
}

export interface BossFightConfig {
  /** Number of BONUS symbols on the final grid required to trigger the boss fight. */
  triggerCount: number;
  /** Number of shots (picks) the player gets. */
  shots: number;
  /** Number of selectable targets shown per shot. */
  targets: number;
  /** Reward tiers (bet multipliers) and their selection weights. */
  rewards: { multiplier: number; weight: number }[];
  bossHp: number;
}

export interface FreeSpinsConfig {
  /** Scatter count -> number of free spins awarded. */
  awards: Partial<Record<number, number>>;
  /** Scatter count -> free spins added when retriggering during free spins. */
  retriggerAwards: Partial<Record<number, number>>;
  /** Persistent free-spins multiplier start value. */
  startMultiplier: number;
  /** Increment applied to the persistent multiplier after each free spin with a win. */
  multiplierStep: number;
  maxMultiplier: number;
}

export interface GameConfig {
  id: string;
  name: string;
  reels: number;
  rows: number;
  /** Minimum number of consecutive reels (from reel 1) for a ways win. */
  minWaysLength: number;
  symbols: SymbolDefinition[];
  /** Per-reel symbol weights for the base game. */
  baseWeights: Record<SymbolId, number>[];
  /** Per-reel symbol weights for free spins. */
  freeSpinWeights: Record<SymbolId, number>[];
  /** Scatter pays as total bet multiples, keyed by count anywhere. */
  scatterPays: Partial<Record<number, number>>;
  /** Cascade multiplier ladder by winning cascade index (0 = first win). Last value repeats. */
  cascadeMultipliers: number[];
  maxCascades: number;
  /** Maximum win per round as multiple of total bet. */
  maxWinMultiplier: number;
  winTiers: WinTierThresholds;
  lucky: LuckyRule;
  freeSpins: FreeSpinsConfig;
  bossFight: BossFightConfig;
  /** Allowed bet amounts in minor units (cents). */
  betLevels: number[];
  defaultBet: number;
}

export interface WaysWin {
  symbol: SymbolId;
  /** Number of consecutive reels matched from reel 1. */
  reelsMatched: number;
  /** Matching position count per matched reel. */
  countsPerReel: number[];
  ways: number;
  /** Pay multiplier per way (x total bet). */
  payMultiplier: number;
  /** Payout (minor units) before cascade/free spin multipliers. */
  basePayout: number;
  /** Payout (minor units) after multipliers. */
  payout: number;
  positions: Position[];
  wildCount: number;
}

export interface ScatterResult {
  count: number;
  positions: Position[];
  payout: number;
  freeSpinsAwarded: number;
}

export interface CascadeStep {
  index: number;
  /** Grid this step was evaluated on. */
  grid: Grid;
  wins: WaysWin[];
  /** Multiplier applied to this step (cascade ladder x free spins multiplier). */
  multiplier: number;
  stepWin: number;
  /** Unique winning positions removed after this step. */
  removed: Position[];
  /** New symbols dropped into each reel, top to bottom. */
  fills: SymbolId[][];
  /** Grid after removal + gravity + fills (the grid of the next step). */
  nextGrid: Grid;
}

export interface FreeSpinsState {
  remaining: number;
  total: number;
  played: number;
  multiplier: number;
  totalWin: number;
  bet: number;
}

export interface BossFightOutcome {
  /** Predetermined reward multipliers revealed in pick order. */
  rewards: number[];
  /** Hidden multipliers of non-selected targets per shot (for reveal of the rest). */
  decoys: number[][];
  damage: number[];
  totalMultiplier: number;
  totalWin: number;
}

export interface RoundOutcome {
  mode: 'BASE' | 'FREE_SPIN';
  bet: number;
  initialGrid: Grid;
  finalGrid: Grid;
  cascades: CascadeStep[];
  cascadeWin: number;
  scatter: ScatterResult;
  bonusPositions: Position[];
  bonusTriggered: boolean;
  bossFight: BossFightOutcome | null;
  /** Round win excluding the boss fight (credited with the round). */
  totalWin: number;
  capped: boolean;
  winTier: WinTier;
  lucky: boolean;
  freeSpins: (FreeSpinsState & { triggered: boolean; retriggered: number; completed: boolean }) | null;
}
