import { describe, expect, it } from 'vitest';
import {
  cascadeGrid,
  countSymbol,
  evaluatePaylines,
  evaluateScatter,
  totalWinOf,
  winningCells,
} from './paylineEngine';
import type { Grid, SymbolId } from '@/types';
import { PAYLINE_COUNT } from '@/constants';
import { PAYTABLE } from '@/config/gameConfig';

const BET = 20; // line bet = 1

function grid(rows: SymbolId[][]): Grid {
  // helper takes row-major input (as it reads on screen) → column-major grid
  const out: Grid = [];
  for (let reel = 0; reel < 5; reel++) {
    out.push([rows[0][reel], rows[1][reel], rows[2][reel]]);
  }
  return out;
}

const FILLER: SymbolId[][] = [
  ['LEMON', 'ORANGE', 'PLUM', 'LEMON', 'ORANGE'],
  ['PLUM', 'LEMON', 'ORANGE', 'PLUM', 'LEMON'],
];

describe('evaluatePaylines', () => {
  it('pays a 3-of-a-kind on the middle line', () => {
    const g = grid([FILLER[0], ['SEVEN', 'SEVEN', 'SEVEN', 'PLUM', 'LEMON'], FILLER[1]]);
    const wins = evaluatePaylines(g, BET);
    const win = wins.find((w) => w.lineIndex === 0);
    expect(win).toBeDefined();
    expect(win!.symbol).toBe('SEVEN');
    expect(win!.count).toBe(3);
    expect(win!.win).toBe(PAYTABLE.SEVEN![3] * (BET / PAYLINE_COUNT));
    expect(win!.positions).toEqual([
      [0, 1],
      [1, 1],
      [2, 1],
    ]);
  });

  it('substitutes wilds into a line win', () => {
    const g = grid([FILLER[0], ['BELL', 'WILD', 'BELL', 'BELL', 'PLUM'], FILLER[1]]);
    const wins = evaluatePaylines(g, BET);
    const win = wins.find((w) => w.lineIndex === 0);
    expect(win).toBeDefined();
    expect(win!.symbol).toBe('BELL');
    expect(win!.count).toBe(4);
  });

  it('pays five wilds as the wild jackpot', () => {
    const g = grid([FILLER[0], ['WILD', 'WILD', 'WILD', 'WILD', 'WILD'], FILLER[1]]);
    const wins = evaluatePaylines(g, BET);
    const win = wins.find((w) => w.lineIndex === 0);
    expect(win!.symbol).toBe('WILD');
    expect(win!.win).toBe(PAYTABLE.WILD![5] * (BET / PAYLINE_COUNT));
  });

  it('prefers the wild pay when a leading wild run beats the substitute pay', () => {
    // WILD WILD WILD PLUM PLUM: wild x3 (25) beats plum x5 (30)? plum5=30 > 25.
    // Use CHERRY: cherry x5 = 75, wild x3 = 25 → substitute wins.
    // And WILD x4 + PLUM: wild4=100 > plum5=30 → wild pay wins.
    const g = grid([FILLER[0], ['WILD', 'WILD', 'WILD', 'WILD', 'PLUM'], FILLER[1]]);
    const win = evaluatePaylines(g, BET).find((w) => w.lineIndex === 0)!;
    expect(win.symbol).toBe('WILD');
    expect(win.count).toBe(4);
  });

  it('does not pay two-of-a-kind or non-paying symbols', () => {
    const g = grid([
      FILLER[0],
      ['SEVEN', 'SEVEN', 'PLUM', 'SEVEN', 'SEVEN'],
      ['SCATTER', 'SCATTER', 'SCATTER', 'BONUS', 'BONUS'],
    ]);
    const wins = evaluatePaylines(g, BET);
    expect(wins.find((w) => w.symbol === 'SEVEN')).toBeUndefined();
    expect(wins.find((w) => w.symbol === 'SCATTER')).toBeUndefined();
  });

  it('applies the win multiplier', () => {
    const g = grid([FILLER[0], ['SEVEN', 'SEVEN', 'SEVEN', 'PLUM', 'LEMON'], FILLER[1]]);
    const base = evaluatePaylines(g, BET, 1).find((w) => w.lineIndex === 0)!;
    const doubled = evaluatePaylines(g, BET, 2).find((w) => w.lineIndex === 0)!;
    expect(doubled.win).toBe(base.win * 2);
  });
});

describe('evaluateScatter', () => {
  it('pays 3+ scatters anywhere as total-bet multiples', () => {
    const g = grid([
      ['SCATTER', 'LEMON', 'PLUM', 'LEMON', 'ORANGE'],
      ['PLUM', 'SCATTER', 'ORANGE', 'PLUM', 'LEMON'],
      ['LEMON', 'ORANGE', 'SCATTER', 'LEMON', 'PLUM'],
    ]);
    const win = evaluateScatter(g, BET)!;
    expect(win.count).toBe(3);
    expect(win.win).toBe(2 * BET);
    expect(win.positions).toHaveLength(3);
  });

  it('returns null for fewer than 3 scatters', () => {
    const g = grid([FILLER[0], FILLER[1], ['SCATTER', 'SCATTER', 'PLUM', 'LEMON', 'ORANGE']]);
    expect(evaluateScatter(g, BET)).toBeNull();
  });
});

describe('cascade helpers', () => {
  it('collects unique winning cells', () => {
    const wins = evaluatePaylines(
      grid([
        ['SEVEN', 'SEVEN', 'SEVEN', 'PLUM', 'LEMON'],
        ['SEVEN', 'SEVEN', 'SEVEN', 'PLUM', 'LEMON'],
        FILLER[1],
      ]),
      BET,
    );
    const cells = winningCells(wins);
    const keys = new Set(cells.map(([r, c]) => `${r},${c}`));
    expect(keys.size).toBe(cells.length);
  });

  it('drops survivors and refills from the top', () => {
    const g = grid([
      ['SEVEN', 'BELL', 'PLUM', 'LEMON', 'ORANGE'],
      ['CHERRY', 'LEMON', 'ORANGE', 'PLUM', 'LEMON'],
      ['DIAMOND', 'ORANGE', 'PLUM', 'LEMON', 'PLUM'],
    ]);
    // remove middle row of reel 0 → CHERRY gone, SEVEN drops onto row 1
    const next = cascadeGrid(g, [[0, 1]], () => 'BELL');
    expect(next[0]).toEqual(['BELL', 'SEVEN', 'DIAMOND']);
    // untouched reels unchanged
    expect(next[1]).toEqual(g[1]);
  });

  it('sums wins', () => {
    expect(
      totalWinOf([
        { lineIndex: 0, symbol: 'BELL', count: 3, win: 1.1, positions: [] },
        { lineIndex: 1, symbol: 'BELL', count: 3, win: 2.2, positions: [] },
      ]),
    ).toBeCloseTo(3.3);
  });

  it('counts symbols on the grid', () => {
    const g = grid([FILLER[0], FILLER[1], ['PLUM', 'PLUM', 'PLUM', 'PLUM', 'PLUM']]);
    expect(countSymbol(g, 'PLUM')).toBeGreaterThanOrEqual(5);
  });
});
