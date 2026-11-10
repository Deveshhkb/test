import type {
  BossFightOutcome,
  CascadeStep,
  FreeSpinsState,
  GameConfig,
  Grid,
  Position,
  RoundOutcome,
  ScatterResult,
  SymbolId,
  WinTier,
} from './types';
import { type Rng, weightedPick, weightedPickIndex } from './rng';
import { evaluateWays, findSymbolPositions, uniquePositions } from './waysEvaluator';

export function drawSymbol(rng: Rng, weights: Record<SymbolId, number>): SymbolId {
  return weightedPick(rng, weights);
}

export function generateGrid(config: GameConfig, rng: Rng, weights: Record<SymbolId, number>[]): Grid {
  const grid: Grid = [];
  for (let reel = 0; reel < config.reels; reel++) {
    const col: SymbolId[] = [];
    for (let row = 0; row < config.rows; row++) col.push(drawSymbol(rng, weights[reel]));
    grid.push(col);
  }
  return grid;
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((c) => [...c]);
}

/**
 * Removes the given positions, lets the remaining symbols fall to the bottom and
 * fills the gaps from the top with new symbols. Returns the fills per reel (top to bottom).
 */
export function applyCascade(
  grid: Grid,
  removed: Position[],
  config: GameConfig,
  rng: Rng,
  weights: Record<SymbolId, number>[],
): { nextGrid: Grid; fills: SymbolId[][] } {
  const removedSet = new Set(removed.map((p) => `${p.reel}:${p.row}`));
  const nextGrid: Grid = [];
  const fills: SymbolId[][] = [];
  for (let reel = 0; reel < grid.length; reel++) {
    const survivors = grid[reel].filter((_, row) => !removedSet.has(`${reel}:${row}`));
    const missing = config.rows - survivors.length;
    const fill: SymbolId[] = [];
    for (let i = 0; i < missing; i++) fill.push(drawSymbol(rng, weights[reel]));
    fills.push(fill);
    nextGrid.push([...fill, ...survivors]);
  }
  return { nextGrid, fills };
}

export function cascadeMultiplierFor(config: GameConfig, winningIndex: number): number {
  const ladder = config.cascadeMultipliers;
  return ladder[Math.min(winningIndex, ladder.length - 1)];
}

export function evaluateScatter(grid: Grid, config: GameConfig, bet: number, inFreeSpins: boolean): ScatterResult {
  const positions = findSymbolPositions(grid, 'SCATTER');
  const count = positions.length;
  const maxKey = (rec: Partial<Record<number, number>>) => {
    const keys = Object.keys(rec).map(Number).filter((k) => k <= count);
    return keys.length ? rec[Math.max(...keys)] ?? 0 : 0;
  };
  const payMult = maxKey(config.scatterPays);
  const award = inFreeSpins ? maxKey(config.freeSpins.retriggerAwards) : maxKey(config.freeSpins.awards);
  return { count, positions, payout: Math.floor(payMult * bet), freeSpinsAwarded: award };
}

export function classifyWin(config: GameConfig, win: number, bet: number): WinTier {
  if (win <= 0) return 'NONE';
  const x = win / bet;
  if (x >= config.winTiers.epic) return 'EPIC';
  if (x >= config.winTiers.mega) return 'MEGA';
  if (x >= config.winTiers.big) return 'BIG';
  return 'NORMAL';
}

/** Deterministic presentation rule: no RNG involved, payout untouched. */
export function isLucky(config: GameConfig, cascades: CascadeStep[]): boolean {
  const winning = cascades.filter((c) => c.wins.length > 0);
  if (winning.length >= config.lucky.minWinningCascades) return true;
  return winning.some((c) => c.wins.some((w) => w.wildCount >= config.lucky.minWildsInWin));
}

export function generateBossFight(config: GameConfig, rng: Rng, bet: number): BossFightOutcome {
  const bf = config.bossFight;
  const weights = bf.rewards.map((r) => r.weight);
  const rewards: number[] = [];
  const decoys: number[][] = [];
  for (let s = 0; s < bf.shots; s++) {
    rewards.push(bf.rewards[weightedPickIndex(rng, weights)].multiplier);
    const d: number[] = [];
    for (let t = 0; t < bf.targets - 1; t++) d.push(bf.rewards[weightedPickIndex(rng, weights)].multiplier);
    decoys.push(d);
  }
  const totalMultiplier = rewards.reduce((a, b) => a + b, 0);
  // Damage is proportional to reward share; the final shot always finishes the boss.
  const damage: number[] = [];
  let remaining = bf.bossHp;
  rewards.forEach((r, i) => {
    const dmg = i === rewards.length - 1 ? remaining : Math.max(1, Math.round((r / totalMultiplier) * bf.bossHp));
    const applied = Math.min(remaining - (rewards.length - 1 - i), dmg);
    damage.push(applied);
    remaining -= applied;
  });
  return { rewards, decoys, damage, totalMultiplier, totalWin: Math.floor(totalMultiplier * bet) };
}

export interface PlayRoundInput {
  config: GameConfig;
  rng: Rng;
  bet: number;
  /** Present when the round is a free spin. */
  freeSpins?: FreeSpinsState | null;
}

/** Produces a complete, final round outcome. All randomness is consumed here. */
export function playRound({ config, rng, bet, freeSpins }: PlayRoundInput): RoundOutcome {
  const inFs = !!freeSpins && freeSpins.remaining > 0;
  const weights = inFs ? config.freeSpinWeights : config.baseWeights;
  const fsMultiplier = inFs ? freeSpins!.multiplier : 1;
  const maxWin = config.maxWinMultiplier * bet;

  const initialGrid = generateGrid(config, rng, weights);
  let grid = initialGrid;
  const cascades: CascadeStep[] = [];
  let cascadeWin = 0;
  let capped = false;

  for (let i = 0; i <= config.maxCascades; i++) {
    const multiplier = cascadeMultiplierFor(config, i) * fsMultiplier;
    const wins = evaluateWays(grid, config, { bet, multiplier });
    let stepWin = wins.reduce((a, w) => a + w.payout, 0);
    if (wins.length === 0) {
      cascades.push({ index: i, grid, wins, multiplier, stepWin: 0, removed: [], fills: grid.map(() => []), nextGrid: grid });
      break;
    }
    if (cascadeWin + stepWin >= maxWin) {
      stepWin = maxWin - cascadeWin;
      capped = true;
    }
    cascadeWin += stepWin;
    const removed = uniquePositions(wins);
    if (capped || i === config.maxCascades) {
      cascades.push({ index: i, grid, wins, multiplier, stepWin, removed: [], fills: grid.map(() => []), nextGrid: grid });
      break;
    }
    const { nextGrid, fills } = applyCascade(grid, removed, config, rng, weights);
    cascades.push({ index: i, grid, wins, multiplier, stepWin, removed, fills, nextGrid });
    grid = nextGrid;
  }

  const finalGrid = grid;
  const scatter = evaluateScatter(finalGrid, config, bet, inFs);
  let totalWin = cascadeWin;
  if (!capped && scatter.payout > 0) {
    totalWin = Math.min(maxWin, totalWin + scatter.payout);
    if (totalWin === maxWin) capped = true;
  }

  const bonusPositions = findSymbolPositions(finalGrid, 'BONUS');
  const bonusTriggered = !inFs && bonusPositions.length >= config.bossFight.triggerCount;
  const bossFight = bonusTriggered ? generateBossFight(config, rng, bet) : null;

  let fsOut: RoundOutcome['freeSpins'] = null;
  if (inFs) {
    const fs = freeSpins!;
    const hadWin = cascades.some((c) => c.wins.length > 0);
    const retriggered = scatter.freeSpinsAwarded;
    const remaining = fs.remaining - 1 + retriggered;
    const nextMultiplier = hadWin
      ? Math.min(config.freeSpins.maxMultiplier, fs.multiplier + config.freeSpins.multiplierStep)
      : fs.multiplier;
    fsOut = {
      bet: fs.bet,
      remaining,
      total: fs.total + retriggered,
      played: fs.played + 1,
      multiplier: nextMultiplier,
      totalWin: fs.totalWin + totalWin,
      triggered: false,
      retriggered,
      completed: remaining <= 0,
    };
  } else if (scatter.freeSpinsAwarded > 0) {
    fsOut = {
      bet,
      remaining: scatter.freeSpinsAwarded,
      total: scatter.freeSpinsAwarded,
      played: 0,
      multiplier: config.freeSpins.startMultiplier,
      totalWin: 0,
      triggered: true,
      retriggered: 0,
      completed: false,
    };
  }

  return {
    mode: inFs ? 'FREE_SPIN' : 'BASE',
    bet,
    initialGrid,
    finalGrid,
    cascades,
    cascadeWin,
    scatter,
    bonusPositions,
    bonusTriggered,
    bossFight,
    totalWin,
    capped,
    winTier: classifyWin(config, totalWin, bet),
    lucky: isLucky(config, cascades),
    freeSpins: fsOut,
  };
}
