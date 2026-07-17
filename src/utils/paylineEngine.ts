import type { Cell, Grid, PaylineWin, SymbolId } from '@/types';
import { PAYLINES, PAYTABLE, SCATTER_PAYS } from '@/config/gameConfig';
import { PAYLINE_COUNT, REEL_COUNT, ROW_COUNT } from '@/constants';

/**
 * Pure win-evaluation engine. Runs identically on the mock server and in
 * tests; a real backend would own this logic in production.
 */

const NON_PAYING: SymbolId[] = ['SCATTER', 'BONUS', 'MYSTERY'];

export function countSymbol(grid: Grid, symbol: SymbolId): number {
  let count = 0;
  for (let reel = 0; reel < grid.length; reel++) {
    for (let row = 0; row < grid[reel].length; row++) {
      if (grid[reel][row] === symbol) count++;
    }
  }
  return count;
}

export function findSymbol(grid: Grid, symbol: SymbolId): Cell[] {
  const cells: Cell[] = [];
  for (let reel = 0; reel < grid.length; reel++) {
    for (let row = 0; row < grid[reel].length; row++) {
      if (grid[reel][row] === symbol) cells.push([reel, row]);
    }
  }
  return cells;
}

/**
 * Evaluate all paylines left-to-right with wild substitution.
 * @param totalBet total bet in credits; line bet = totalBet / PAYLINE_COUNT.
 * @param multiplier win multiplier applied to every line win.
 */
export function evaluatePaylines(grid: Grid, totalBet: number, multiplier = 1): PaylineWin[] {
  const lineBet = totalBet / PAYLINE_COUNT;
  const wins: PaylineWin[] = [];

  for (let lineIndex = 0; lineIndex < PAYLINES.length; lineIndex++) {
    const rows = PAYLINES[lineIndex];
    const lineSymbols: SymbolId[] = [];
    for (let reel = 0; reel < REEL_COUNT; reel++) {
      lineSymbols.push(grid[reel][rows[reel]]);
    }

    // Determine the paying symbol: first non-wild symbol on the line.
    let paySymbol: SymbolId | null = null;
    for (const s of lineSymbols) {
      if (s !== 'WILD') {
        paySymbol = s;
        break;
      }
    }
    // A line of pure wilds pays as WILD.
    if (paySymbol === null) paySymbol = 'WILD';
    if (NON_PAYING.includes(paySymbol)) continue;

    // Count consecutive matches (symbol or wild) from the left.
    let count = 0;
    for (const s of lineSymbols) {
      if (s === paySymbol || s === 'WILD') count++;
      else break;
    }

    // A leading run of wilds might pay better as pure WILD than as substitute.
    let wildRun = 0;
    for (const s of lineSymbols) {
      if (s === 'WILD') wildRun++;
      else break;
    }

    const payAs = PAYTABLE[paySymbol]?.[count] ?? 0;
    const payWild = PAYTABLE.WILD?.[wildRun] ?? 0;

    let win: number;
    let symbol: SymbolId;
    let finalCount: number;
    if (payWild > payAs) {
      win = payWild * lineBet;
      symbol = 'WILD';
      finalCount = wildRun;
    } else {
      win = payAs * lineBet;
      symbol = paySymbol;
      finalCount = count;
    }
    if (win <= 0) continue;

    const positions: Cell[] = [];
    for (let reel = 0; reel < finalCount; reel++) {
      positions.push([reel, rows[reel]]);
    }
    wins.push({
      lineIndex,
      symbol,
      count: finalCount,
      win: roundCredits(win * multiplier),
      positions,
    });
  }

  return wins;
}

/** Scatter pays anywhere on the grid, as multiples of total bet. */
export function evaluateScatter(grid: Grid, totalBet: number): PaylineWin | null {
  const cells = findSymbol(grid, 'SCATTER');
  const pay = SCATTER_PAYS[Math.min(cells.length, 5)] ?? 0;
  if (pay <= 0) return null;
  return {
    lineIndex: -1,
    symbol: 'SCATTER',
    count: cells.length,
    win: roundCredits(pay * totalBet),
    positions: cells,
  };
}

export function totalWinOf(wins: PaylineWin[]): number {
  return roundCredits(wins.reduce((sum, w) => sum + w.win, 0));
}

/** Collect the unique set of winning cells (for cascade removal). */
export function winningCells(wins: PaylineWin[]): Cell[] {
  const seen = new Set<string>();
  const cells: Cell[] = [];
  for (const w of wins) {
    for (const cell of w.positions) {
      const key = `${cell[0]},${cell[1]}`;
      if (!seen.has(key)) {
        seen.add(key);
        cells.push(cell);
      }
    }
  }
  return cells;
}

/** Remove winning cells, drop survivors down, refill from a symbol source. */
export function cascadeGrid(
  grid: Grid,
  removed: Cell[],
  refill: (reel: number) => SymbolId,
): Grid {
  const removedSet = new Set(removed.map(([r, c]) => `${r},${c}`));
  const next: Grid = [];
  for (let reel = 0; reel < grid.length; reel++) {
    const survivors: SymbolId[] = [];
    for (let row = 0; row < ROW_COUNT; row++) {
      if (!removedSet.has(`${reel},${row}`)) survivors.push(grid[reel][row]);
    }
    const column: SymbolId[] = [];
    while (column.length + survivors.length < ROW_COUNT) {
      column.push(refill(reel));
    }
    next.push([...column, ...survivors]);
  }
  return next;
}

export function roundCredits(value: number): number {
  return Math.round(value * 100) / 100;
}
