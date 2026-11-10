import type { GameConfig, SymbolDefinition, SymbolId } from './types';

export const SYMBOLS: SymbolDefinition[] = [
  { id: 'HERO', name: 'Neon Hero', kind: 'character', pays: { 3: 0.6, 4: 2.5, 5: 6, 6: 12 } },
  { id: 'HACKER', name: 'Ghost Hacker', kind: 'character', pays: { 3: 0.5, 4: 2, 5: 5, 6: 10 } },
  { id: 'FIGHTER', name: 'Street Fighter', kind: 'character', pays: { 3: 0.4, 4: 1.5, 5: 4, 6: 8 } },
  { id: 'SOLDIER', name: 'Chrome Soldier', kind: 'character', pays: { 3: 0.3, 4: 1, 5: 3, 6: 6 } },
  { id: 'RIFLE', name: 'Plasma Rifle', kind: 'premium', pays: { 3: 0.2, 4: 0.7, 5: 2, 6: 4 } },
  { id: 'BLASTER', name: 'Energy Blaster', kind: 'premium', pays: { 3: 0.2, 4: 0.7, 5: 2, 6: 4 } },
  { id: 'HELMET', name: 'Cyber Helmet', kind: 'premium', pays: { 3: 0.2, 4: 0.6, 5: 1.8, 6: 3.5 } },
  { id: 'GRENADE', name: 'Neon Grenade', kind: 'premium', pays: { 3: 0.15, 4: 0.5, 5: 1.5, 6: 3 } },
  { id: 'BATTERY', name: 'Power Cell', kind: 'premium', pays: { 3: 0.15, 4: 0.5, 5: 1.5, 6: 3 } },
  { id: 'HOLO', name: 'Holo Deck', kind: 'premium', pays: { 3: 0.15, 4: 0.5, 5: 1.5, 6: 3 } },
  { id: 'A', name: 'A', kind: 'low', pays: { 3: 0.12, 4: 0.3, 5: 0.7, 6: 1.4 } },
  { id: 'K', name: 'K', kind: 'low', pays: { 3: 0.12, 4: 0.3, 5: 0.7, 6: 1.4 } },
  { id: 'Q', name: 'Q', kind: 'low', pays: { 3: 0.1, 4: 0.25, 5: 0.6, 6: 1.2 } },
  { id: 'J', name: 'J', kind: 'low', pays: { 3: 0.1, 4: 0.25, 5: 0.6, 6: 1.2 } },
  { id: 'TEN', name: '10', kind: 'low', pays: { 3: 0.08, 4: 0.2, 5: 0.5, 6: 1 } },
  { id: 'WILD', name: 'Wild', kind: 'wild' },
  { id: 'SCATTER', name: 'Scatter', kind: 'scatter' },
  { id: 'BONUS', name: 'Bonus', kind: 'bonus' },
];

type Weights = Record<SymbolId, number>;

function reelWeights(overrides: Partial<Weights>): Weights {
  const base: Weights = {
    HERO: 30,
    HACKER: 34,
    FIGHTER: 38,
    SOLDIER: 42,
    RIFLE: 48,
    BLASTER: 48,
    HELMET: 52,
    GRENADE: 52,
    BATTERY: 56,
    HOLO: 56,
    A: 74,
    K: 74,
    Q: 78,
    J: 78,
    TEN: 82,
    WILD: 14,
    SCATTER: 9,
    BONUS: 7,
  };
  return { ...base, ...overrides };
}

const BASE_WEIGHTS: Weights[] = [
  reelWeights({ WILD: 0 }),
  reelWeights({}),
  reelWeights({}),
  reelWeights({}),
  reelWeights({}),
  reelWeights({}),
];

const FREE_SPIN_WEIGHTS: Weights[] = BASE_WEIGHTS.map((w, i) => ({
  ...w,
  WILD: i === 0 ? 0 : 30,
  BONUS: 0,
}));

export const DEFAULT_CONFIG: GameConfig = {
  id: 'neon-break',
  name: 'NEON BREAK',
  reels: 6,
  rows: 5,
  minWaysLength: 3,
  symbols: SYMBOLS,
  baseWeights: BASE_WEIGHTS,
  freeSpinWeights: FREE_SPIN_WEIGHTS,
  scatterPays: { 3: 1, 4: 3, 5: 10, 6: 50 },
  cascadeMultipliers: [1, 1, 2, 3, 5],
  maxCascades: 20,
  maxWinMultiplier: 5000,
  winTiers: { big: 15, mega: 40, epic: 100 },
  lucky: { minWinningCascades: 3, minWildsInWin: 3 },
  freeSpins: {
    awards: { 3: 10, 4: 12, 5: 15, 6: 20 },
    retriggerAwards: { 3: 5, 4: 8, 5: 10, 6: 15 },
    startMultiplier: 1,
    multiplierStep: 1,
    maxMultiplier: 10,
  },
  bossFight: {
    triggerCount: 3,
    shots: 3,
    targets: 4,
    rewards: [
      { multiplier: 5, weight: 50 },
      { multiplier: 10, weight: 30 },
      { multiplier: 15, weight: 15 },
      { multiplier: 50, weight: 5 },
    ],
    bossHp: 100,
  },
  betLevels: [1000, 2000, 5000, 10000, 20000, 50000, 100000],
  defaultBet: 10000,
};

export function getSymbol(config: GameConfig, id: SymbolId): SymbolDefinition {
  const s = config.symbols.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown symbol ${id}`);
  return s;
}

export function theoreticalMaxWays(config: GameConfig): number {
  return config.rows ** config.reels;
}
