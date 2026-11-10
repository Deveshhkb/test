import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  SeededRng,
  applyCascade,
  classifyWin,
  evaluateScatter,
  evaluateWays,
  generateBossFight,
  isLucky,
  playRound,
  theoreticalMaxWays,
  uniquePositions,
  type CascadeStep,
  type Grid,
  type SymbolId,
} from '../src';

const cfg = DEFAULT_CONFIG;
const BET = 10000; // 100.00

/** Builds a grid from 5 strings of 6 tokens (rows top->bottom). */
function g(rows: string[]): Grid {
  const map: Record<string, SymbolId> = {
    H: 'HERO', X: 'HACKER', F: 'FIGHTER', S: 'SOLDIER', R: 'RIFLE', B: 'BLASTER', M: 'HELMET', G: 'GRENADE',
    C: 'BATTERY', O: 'HOLO', A: 'A', K: 'K', Q: 'Q', J: 'J', T: 'TEN', W: 'WILD', '$': 'SCATTER', '*': 'BONUS',
  };
  const grid: Grid = Array.from({ length: 6 }, () => []);
  rows.forEach((r) => r.split(' ').forEach((t, reel) => grid[reel].push(map[t])));
  return grid;
}

// reel 3 shares no symbol with reels 1-2, so this grid has no wins
const BLANK = [
  'A K O R A O',
  'K Q C S K C',
  'Q J G F Q G',
  'J T M X J M',
  'T A B O T B',
];

describe('configuration', () => {
  it('has 6x5 layout and 15,625 max ways', () => {
    expect(cfg.reels).toBe(6);
    expect(cfg.rows).toBe(5);
    expect(theoreticalMaxWays(cfg)).toBe(15625);
  });
});

describe('WaysEvaluator', () => {
  it('pays nothing on a grid without adjacent matches', () => {
    expect(evaluateWays(g(BLANK), cfg, { bet: BET })).toEqual([]);
  });

  it('pays a simple 3-of-a-kind with 1 way', () => {
    const grid = g([
      'H H H J T O',
      ...BLANK.slice(1),
    ]);
    const wins = evaluateWays(grid, cfg, { bet: BET });
    const hero = wins.find((w) => w.symbol === 'HERO')!;
    expect(hero.reelsMatched).toBe(3);
    expect(hero.ways).toBe(1);
    expect(hero.payout).toBe(Math.floor(0.6 * BET));
    expect(hero.positions).toHaveLength(3);
  });

  it('multiplies ways by matches per reel', () => {
    const grid = g([
      'H H H H J O',
      'H K H J O C',
      'Q H J H C G',
      ...BLANK.slice(3),
    ]);
    const hero = evaluateWays(grid, cfg, { bet: BET }).find((w) => w.symbol === 'HERO')!;
    expect(hero.countsPerReel).toEqual([2, 2, 2, 2]);
    expect(hero.ways).toBe(16);
    expect(hero.payout).toBe(Math.floor(2.5 * 16 * BET));
  });

  it('stops at the first reel without a match', () => {
    const grid = g([
      'H H A H H H',
      ...BLANK.slice(1),
    ]);
    expect(evaluateWays(grid, cfg, { bet: BET }).find((w) => w.symbol === 'HERO')).toBeUndefined();
  });

  it('requires matches to start on the leftmost reel', () => {
    const grid = g([
      'A H H H H H',
      ...BLANK.slice(1),
    ]);
    expect(evaluateWays(grid, cfg, { bet: BET }).find((w) => w.symbol === 'HERO')).toBeUndefined();
  });

  it('substitutes WILD for paying symbols and counts wilds used', () => {
    const grid = g([
      'H W W H H H',
      ...BLANK.slice(1),
    ]);
    const wins = evaluateWays(grid, cfg, { bet: BET });
    const hero = wins.find((w) => w.symbol === 'HERO')!;
    expect(hero.reelsMatched).toBe(6);
    expect(hero.wildCount).toBe(2);
    expect(hero.countsPerReel).toEqual([1, 1, 1, 1, 1, 1]);
    expect(hero.payout).toBe(12 * BET);
    // the wilds on reels 2-3 also extend K (reel1 row2) -> K W W ... reel4 'T'? no K -> 3 reels
    const k = wins.find((w) => w.symbol === 'K')!;
    expect(k.reelsMatched).toBe(3);
  });

  it('never substitutes WILD for SCATTER or BONUS', () => {
    const grid = g([
      '$ W W $ A O',
      '* W W T O C',
      ...BLANK.slice(2),
    ]);
    const wins = evaluateWays(grid, cfg, { bet: BET });
    expect(wins.some((w) => w.symbol === 'SCATTER' || w.symbol === 'BONUS' || w.symbol === 'WILD')).toBe(false);
  });

  it('pays multiple symbols in one evaluation without duplicates', () => {
    const grid = g([
      'H H H J T O',
      'A A A A O C',
      ...BLANK.slice(2),
    ]);
    const wins = evaluateWays(grid, cfg, { bet: BET });
    expect(wins.map((w) => w.symbol).sort()).toEqual(['A', 'HERO']);
    expect(new Set(wins.map((w) => w.symbol)).size).toBe(wins.length);
  });

  it('applies the multiplier to payouts', () => {
    const grid = g(['H H H J T O', ...BLANK.slice(1)]);
    const hero = evaluateWays(grid, cfg, { bet: BET, multiplier: 3 }).find((w) => w.symbol === 'HERO')!;
    expect(hero.payout).toBe(hero.basePayout * 3);
  });

  it('respects configurable minimum length', () => {
    const grid = g(['H H J J T O', ...BLANK.slice(1)]);
    expect(evaluateWays(grid, cfg, { bet: BET }).find((w) => w.symbol === 'HERO')).toBeUndefined();
    const cfg2 = { ...cfg, symbols: cfg.symbols.map((s) => (s.id === 'HERO' ? { ...s, pays: { ...s.pays, 2: 0.1 } } : s)), minWaysLength: 2 };
    expect(evaluateWays(grid, cfg2, { bet: BET }).find((w) => w.symbol === 'HERO')?.reelsMatched).toBe(2);
  });

  it('computes the max 15,625 ways on a full grid', () => {
    const grid: Grid = Array.from({ length: 6 }, () => Array(5).fill('HERO'));
    const hero = evaluateWays(grid, cfg, { bet: 100 }).find((w) => w.symbol === 'HERO')!;
    expect(hero.ways).toBe(15625);
  });
});

describe('Scatter', () => {
  it('detects scatters anywhere and awards free spins', () => {
    const grid = g(['$ K Q J $ O', ...BLANK.slice(1, 4), 'T O $ G M B']);
    const s = evaluateScatter(grid, cfg, BET, false);
    expect(s.count).toBe(3);
    expect(s.freeSpinsAwarded).toBe(10);
    expect(s.payout).toBe(1 * BET);
  });
  it('uses retrigger table during free spins', () => {
    const grid = g(['$ $ $ $ T O', ...BLANK.slice(1)]);
    expect(evaluateScatter(grid, cfg, BET, true).freeSpinsAwarded).toBe(8);
  });
  it('awards nothing below 3 scatters', () => {
    const grid = g(['$ $ Q J T O', ...BLANK.slice(1)]);
    const s = evaluateScatter(grid, cfg, BET, false);
    expect(s.freeSpinsAwarded).toBe(0);
    expect(s.payout).toBe(0);
  });
});

describe('Cascades', () => {
  it('removes winners, applies gravity and fills from the top', () => {
    const grid = g(['H H H J T O', ...BLANK.slice(1)]);
    const removed = uniquePositions(evaluateWays(grid, cfg, { bet: BET }));
    const { nextGrid, fills } = applyCascade(grid, removed, cfg, new SeededRng(3), cfg.baseWeights);
    for (let r = 0; r < 3; r++) {
      expect(fills[r]).toHaveLength(1);
      expect(nextGrid[r].slice(1)).toEqual(grid[r].slice(1)); // survivors unchanged below
      expect(nextGrid[r][0]).toBe(fills[r][0]);
    }
    expect(fills[3]).toHaveLength(0);
    expect(nextGrid[3]).toEqual(grid[3]);
  });

  it('keeps survivor order when removing middle positions', () => {
    const grid = g(BLANK);
    const { nextGrid, fills } = applyCascade(grid, [{ reel: 0, row: 2 }, { reel: 0, row: 4 }], cfg, new SeededRng(1), cfg.baseWeights);
    expect(nextGrid[0].slice(2)).toEqual(['A', 'K', 'J']);
    expect(fills[0]).toHaveLength(2);
  });

  it('round outcome cascades chain correctly and the final grid matches the last step', () => {
    for (let seed = 1; seed < 400; seed++) {
      const r = playRound({ config: cfg, rng: new SeededRng(seed), bet: BET });
      expect(r.cascades[0].grid).toEqual(r.initialGrid);
      for (let i = 1; i < r.cascades.length; i++) expect(r.cascades[i].grid).toEqual(r.cascades[i - 1].nextGrid);
      const last = r.cascades[r.cascades.length - 1];
      expect(last.nextGrid).toEqual(r.finalGrid);
      const sum = r.cascades.reduce((a, c) => a + c.stepWin, 0);
      expect(sum).toBe(r.cascadeWin);
      expect(r.totalWin).toBe(Math.min(cfg.maxWinMultiplier * BET, r.cascadeWin + r.scatter.payout));
    }
  });

  it('applies the cascade multiplier ladder', () => {
    let found = false;
    for (let seed = 1; seed < 5000 && !found; seed++) {
      const r = playRound({ config: cfg, rng: new SeededRng(seed), bet: BET });
      const winning = r.cascades.filter((c) => c.wins.length);
      if (winning.length >= 3) {
        found = true;
        expect(winning[0].multiplier).toBe(1);
        expect(winning[1].multiplier).toBe(1);
        expect(winning[2].multiplier).toBe(2);
        for (const c of winning) expect(c.stepWin).toBe(c.wins.reduce((a, w) => a + Math.floor(w.basePayout * c.multiplier), 0));
      }
    }
    expect(found).toBe(true);
  });

  it('respects the cascade limit', () => {
    const cfg2 = { ...cfg, maxCascades: 1 };
    for (let seed = 1; seed < 300; seed++) {
      const r = playRound({ config: cfg2, rng: new SeededRng(seed), bet: BET });
      expect(r.cascades.length).toBeLessThanOrEqual(2);
    }
  });
});

describe('Free spins', () => {
  it('triggers from base game scatters and progresses multiplier', () => {
    let trig = null;
    for (let seed = 1; seed < 20000 && !trig; seed++) {
      const r = playRound({ config: cfg, rng: new SeededRng(seed), bet: BET });
      if (r.freeSpins?.triggered) trig = r;
    }
    expect(trig).not.toBeNull();
    let fs = trig!.freeSpins!;
    expect(fs.remaining).toBe(fs.total);
    expect(fs.multiplier).toBe(1);
    const rng = new SeededRng(99);
    let total = 0;
    while (fs.remaining > 0) {
      const before = fs;
      const f = playRound({ config: cfg, rng, bet: BET, freeSpins: fs });
      expect(f.mode).toBe('FREE_SPIN');
      expect(f.bonusTriggered).toBe(false);
      const hadWin = f.cascades.some((c) => c.wins.length);
      expect(f.freeSpins!.multiplier).toBe(hadWin ? Math.min(10, before.multiplier + 1) : before.multiplier);
      expect(f.freeSpins!.remaining).toBe(before.remaining - 1 + f.freeSpins!.retriggered);
      for (const c of f.cascades.filter((c) => c.wins.length)) expect(c.multiplier % before.multiplier).toBe(0);
      total += f.totalWin;
      fs = f.freeSpins!;
    }
    expect(fs.totalWin).toBe(total);
    expect(fs.played).toBe(fs.total);
  });
});

describe('Boss fight', () => {
  it('generates predetermined rewards and damage that defeats the boss', () => {
    for (let seed = 1; seed < 200; seed++) {
      const b = generateBossFight(cfg, new SeededRng(seed), BET);
      expect(b.rewards).toHaveLength(cfg.bossFight.shots);
      b.rewards.forEach((m) => expect([5, 10, 15, 50]).toContain(m));
      expect(b.decoys.every((d) => d.length === cfg.bossFight.targets - 1)).toBe(true);
      expect(b.damage.reduce((a, c) => a + c, 0)).toBe(cfg.bossFight.bossHp);
      b.damage.forEach((d) => expect(d).toBeGreaterThan(0));
      expect(b.totalWin).toBe(b.totalMultiplier * BET);
    }
  });
  it('is triggered by 3+ bonus symbols in the base game only', () => {
    let hit = false;
    for (let seed = 1; seed < 20000 && !hit; seed++) {
      const r = playRound({ config: cfg, rng: new SeededRng(seed), bet: BET });
      if (r.bonusTriggered) {
        hit = true;
        expect(r.bonusPositions.length).toBeGreaterThanOrEqual(3);
        expect(r.bossFight).not.toBeNull();
      }
    }
    expect(hit).toBe(true);
  });
});

describe('Win tiers and lucky rule', () => {
  it('classifies win tiers by bet multiple', () => {
    expect(classifyWin(cfg, 0, BET)).toBe('NONE');
    expect(classifyWin(cfg, BET * 2, BET)).toBe('NORMAL');
    expect(classifyWin(cfg, BET * 15, BET)).toBe('BIG');
    expect(classifyWin(cfg, BET * 40, BET)).toBe('MEGA');
    expect(classifyWin(cfg, BET * 100, BET)).toBe('EPIC');
  });
  it('lucky win is deterministic from cascades', () => {
    const win = { symbol: 'A', reelsMatched: 3, countsPerReel: [1, 1, 1], ways: 1, payMultiplier: 1, basePayout: 1, payout: 1, positions: [], wildCount: 0 } as const;
    const step = (wins: unknown[]): CascadeStep => ({ index: 0, grid: [], wins: wins as never, multiplier: 1, stepWin: 0, removed: [], fills: [], nextGrid: [] });
    expect(isLucky(cfg, [step([win]), step([win]), step([])])).toBe(false);
    expect(isLucky(cfg, [step([win]), step([win]), step([win]), step([])])).toBe(true);
    expect(isLucky(cfg, [step([{ ...win, wildCount: 3 }]), step([])])).toBe(true);
  });
  it('playRound is deterministic for a given RNG', () => {
    const a = playRound({ config: cfg, rng: new SeededRng(42), bet: BET });
    const b = playRound({ config: cfg, rng: new SeededRng(42), bet: BET });
    expect(a).toEqual(b);
  });
  it('caps wins at the max win multiplier', () => {
    const cfg2 = { ...cfg, maxWinMultiplier: 1 };
    for (let seed = 1; seed < 500; seed++) {
      const r = playRound({ config: cfg2, rng: new SeededRng(seed), bet: BET });
      expect(r.totalWin).toBeLessThanOrEqual(BET);
    }
  });
});

describe('RTP smoke simulation', () => {
  it('stays in a sane range', () => {
    const rng = new SeededRng(2024);
    let wager = 0, win = 0;
    for (let i = 0; i < 20000; i++) {
      wager += BET;
      const r = playRound({ config: cfg, rng, bet: BET });
      win += r.totalWin + (r.bossFight?.totalWin ?? 0);
      let fs = r.freeSpins?.triggered ? r.freeSpins : null;
      while (fs && fs.remaining > 0) {
        const f = playRound({ config: cfg, rng, bet: BET, freeSpins: fs });
        win += f.totalWin;
        fs = f.freeSpins;
      }
    }
    const rtp = win / wager;
    expect(rtp).toBeGreaterThan(0.7);
    expect(rtp).toBeLessThan(1.3);
  });
});
