import type { GameConfig, Grid, Position, SymbolId, WaysWin } from './types';

export interface EvaluateOptions {
  bet: number;
  multiplier?: number;
}

/**
 * Left-to-right adjacent ways evaluation.
 *  - every paying symbol is evaluated once (no duplicate payouts)
 *  - WILD substitutes for paying symbols only (never SCATTER/BONUS)
 *  - ways = product of matching positions per consecutive reel
 *  - payout = pay[length] * ways * bet * multiplier (floored to minor units)
 */
export function evaluateWays(grid: Grid, config: GameConfig, opts: EvaluateOptions): WaysWin[] {
  const multiplier = opts.multiplier ?? 1;
  const wins: WaysWin[] = [];
  const kindById = new Map(config.symbols.map((s) => [s.id, s]));

  for (const def of config.symbols) {
    if (!def.pays) continue;
    const counts: number[] = [];
    const positions: Position[] = [];
    let wildCount = 0;
    for (let reel = 0; reel < grid.length; reel++) {
      let c = 0;
      const column = grid[reel];
      for (let row = 0; row < column.length; row++) {
        const s = column[row];
        if (s === def.id || kindById.get(s)?.kind === 'wild') {
          c++;
          positions.push({ reel, row });
          if (s !== def.id) wildCount++;
        }
      }
      if (c === 0) break;
      counts.push(c);
    }
    const length = counts.length;
    if (length < config.minWaysLength) continue;
    const payMultiplier = def.pays[length];
    if (!payMultiplier) continue;
    // a win made only of wilds still pays as the symbol, but require at least one real symbol
    const realCount = positions.length - wildCount;
    if (realCount === 0) continue;
    const ways = counts.reduce((a, b) => a * b, 1);
    const basePayout = Math.floor(payMultiplier * ways * opts.bet);
    wins.push({
      symbol: def.id,
      reelsMatched: length,
      countsPerReel: counts,
      ways,
      payMultiplier,
      basePayout,
      payout: Math.floor(basePayout * multiplier),
      positions,
      wildCount,
    });
  }
  return wins;
}

export function findSymbolPositions(grid: Grid, symbol: SymbolId): Position[] {
  const out: Position[] = [];
  grid.forEach((col, reel) => col.forEach((s, row) => s === symbol && out.push({ reel, row })));
  return out;
}

export function uniquePositions(wins: WaysWin[]): Position[] {
  const seen = new Set<string>();
  const out: Position[] = [];
  for (const w of wins)
    for (const p of w.positions) {
      const k = `${p.reel}:${p.row}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(p);
      }
    }
  return out.sort((a, b) => a.reel - b.reel || a.row - b.row);
}
