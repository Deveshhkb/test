import type { FreeSpinsState, RoundOutcome } from '@neon/game-math';
import type { PublicFreeSpins } from '@neon/shared';

/** Computes the persisted free spins state after a round. */
export function nextFreeSpinsState(outcome: RoundOutcome): FreeSpinsState | null {
  const fs = outcome.freeSpins;
  if (!fs || fs.completed) return null;
  return { remaining: fs.remaining, total: fs.total, played: fs.played, multiplier: fs.multiplier, totalWin: fs.totalWin, bet: fs.bet };
}

export function toPublicFreeSpins(fs: FreeSpinsState | null): PublicFreeSpins | null {
  return fs ? { ...fs } : null;
}
