import type { SymbolId, Volatility } from '@/types';
import { WinTier } from '@/types';

/**
 * Math model configuration: paylines, paytable, weighted virtual reel strips,
 * feature odds and win-tier thresholds. Everything a math team would tune
 * lives in this file.
 */

/** 20 paylines expressed as the row index hit on each of the 5 reels. */
export const PAYLINES: readonly (readonly number[])[] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [1, 0, 1, 0, 1],
  [1, 2, 1, 2, 1],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2],
  [0, 2, 2, 2, 0],
];

/** Line pays as multiples of the line bet (totalBet / PAYLINE_COUNT),
 *  keyed by consecutive symbol count (3, 4, 5). */
export const PAYTABLE: Partial<Record<SymbolId, Record<number, number>>> = {
  WILD: { 3: 25, 4: 100, 5: 500 },
  SEVEN: { 3: 20, 4: 75, 5: 300 },
  BELL: { 3: 15, 4: 50, 5: 150 },
  DIAMOND: { 3: 12, 4: 40, 5: 120 },
  CHERRY: { 3: 8, 4: 25, 5: 75 },
  LEMON: { 3: 4, 4: 15, 5: 50 },
  ORANGE: { 3: 4, 4: 15, 5: 40 },
  PLUM: { 3: 3, 4: 10, 5: 30 },
};

/** Scatter pays as multiples of the TOTAL bet, any position. */
export const SCATTER_PAYS: Record<number, number> = { 3: 2, 4: 10, 5: 50 };

/** Symbols the MYSTERY symbol may transform into. */
export const MYSTERY_POOL: SymbolId[] = [
  'SEVEN',
  'BELL',
  'DIAMOND',
  'CHERRY',
  'LEMON',
  'ORANGE',
  'PLUM',
  'WILD',
];

export interface RtpConfig {
  /** Target return-to-player, informational + used to pick strip sets. */
  targetRtp: number;
  volatility: Volatility;
}

export const RTP_CONFIG: RtpConfig = {
  targetRtp: 96.5,
  volatility: 'medium',
};

/** Per-symbol weights used to build each reel's virtual strip.
 *  Higher weight = appears more often on that reel. */
export type WeightTable = Partial<Record<SymbolId, number>>;

const BASE_WEIGHTS: WeightTable[] = [
  // reel 1..5 — specials kept rare; low pays dominate (RTP-tuned via simulation)
  { WILD: 1, SCATTER: 1, BONUS: 1, SEVEN: 3, BELL: 5, DIAMOND: 6, CHERRY: 9, LEMON: 12, ORANGE: 12, PLUM: 13, MYSTERY: 1 },
  { WILD: 2, SCATTER: 1, BONUS: 1, SEVEN: 3, BELL: 5, DIAMOND: 6, CHERRY: 9, LEMON: 12, ORANGE: 12, PLUM: 13, MYSTERY: 1 },
  { WILD: 2, SCATTER: 1, BONUS: 1, SEVEN: 3, BELL: 5, DIAMOND: 6, CHERRY: 9, LEMON: 12, ORANGE: 13, PLUM: 13, MYSTERY: 1 },
  { WILD: 2, SCATTER: 1, BONUS: 1, SEVEN: 3, BELL: 5, DIAMOND: 6, CHERRY: 9, LEMON: 13, ORANGE: 13, PLUM: 13, MYSTERY: 1 },
  { WILD: 1, SCATTER: 1, BONUS: 1, SEVEN: 3, BELL: 5, DIAMOND: 6, CHERRY: 9, LEMON: 13, ORANGE: 13, PLUM: 14, MYSTERY: 1 },
];

/** Volatility shifts weight between low pays and premium symbols. */
function applyVolatility(weights: WeightTable[], volatility: Volatility): WeightTable[] {
  if (volatility === 'medium') return weights;
  return weights.map((table) => {
    const shifted: WeightTable = { ...table };
    const premiums: SymbolId[] = ['WILD', 'SEVEN', 'BELL', 'DIAMOND'];
    const lows: SymbolId[] = ['CHERRY', 'LEMON', 'ORANGE', 'PLUM'];
    for (const s of premiums) {
      shifted[s] = Math.max(1, Math.round((shifted[s] ?? 1) * (volatility === 'high' ? 0.7 : 1.4)));
    }
    for (const s of lows) {
      shifted[s] = Math.max(1, Math.round((shifted[s] ?? 1) * (volatility === 'high' ? 1.2 : 0.9)));
    }
    return shifted;
  });
}

/** Expand a weight table into a shuffled-free flat strip (deterministic order,
 *  randomness comes from the spin position, like a real virtual reel). */
export function buildReelStrip(weights: WeightTable): SymbolId[] {
  const strip: SymbolId[] = [];
  const entries = Object.entries(weights) as [SymbolId, number][];
  // Interleave symbols round-robin so identical symbols aren't clustered.
  const pools = entries.map(([symbol, weight]) => ({ symbol, remaining: weight }));
  let added = true;
  while (added) {
    added = false;
    for (const pool of pools) {
      if (pool.remaining > 0) {
        strip.push(pool.symbol);
        pool.remaining -= 1;
        added = true;
      }
    }
  }
  return strip;
}

export function getReelStrips(volatility: Volatility = RTP_CONFIG.volatility): SymbolId[][] {
  return applyVolatility(BASE_WEIGHTS, volatility).map(buildReelStrip);
}

export const FEATURE_CONFIG = {
  /** Scatters needed to trigger free spins. */
  scatterTrigger: 3,
  freeSpinsAwarded: 10,
  freeSpinsRetriggerAwarded: 5,
  /** Global win multiplier while in free spins. */
  freeSpinMultiplier: 2,
  /** Chance per base-game spin of the Random Wild Drop feature. */
  randomWildChance: 0.02,
  randomWildMin: 1,
  randomWildMax: 3,
  /** Wilds landed during free spins expand to cover the reel... */
  expandingWildsInFreeSpins: true,
  /** ...and stick in place for the remaining free spins. */
  stickyWildsInFreeSpins: true,
  /** Bonus symbols needed (anywhere) to trigger the pick bonus. */
  bonusTrigger: 3,
  /** Pick-bonus prizes as multiples of total bet. */
  bonusPrizes: [5, 10, 15, 25, 50, 100],
  /** Cascading (tumble) wins: winners explode and new symbols fall in. */
  cascading: true,
  /** Multiplier progression per cascade step (base game). */
  cascadeMultipliers: [1, 2, 3],
  maxCascades: 6,
} as const;

/** Win tier thresholds as multiples of total bet. Checked top-down. */
export const WIN_TIERS: { tier: WinTier; threshold: number }[] = [
  { tier: WinTier.Legendary, threshold: 200 },
  { tier: WinTier.Epic, threshold: 100 },
  { tier: WinTier.SuperMega, threshold: 60 },
  { tier: WinTier.Mega, threshold: 30 },
  { tier: WinTier.Big, threshold: 15 },
];

export function getWinTier(win: number, totalBet: number): WinTier {
  if (win <= 0 || totalBet <= 0) return WinTier.None;
  const multiple = win / totalBet;
  for (const { tier, threshold } of WIN_TIERS) {
    if (multiple >= threshold) return tier;
  }
  return WinTier.Regular;
}
