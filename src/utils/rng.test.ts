import { afterEach, describe, expect, it } from 'vitest';
import { mulberry32, randomInt, setRandomSource, weightedIndex } from './rng';
import { buildReelStrip, getReelStrips } from '@/config/gameConfig';
import { REEL_COUNT } from '@/constants';

afterEach(() => setRandomSource(Math.random));

describe('rng', () => {
  it('randomInt stays within bounds', () => {
    setRandomSource(mulberry32(42));
    for (let i = 0; i < 1000; i++) {
      const n = randomInt(2, 7);
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(7);
    }
  });

  it('weightedIndex respects weights (statistically)', () => {
    setRandomSource(mulberry32(7));
    const counts = [0, 0, 0];
    for (let i = 0; i < 10_000; i++) counts[weightedIndex([1, 1, 8])]++;
    expect(counts[2]).toBeGreaterThan(counts[0] * 3);
    expect(counts[2]).toBeGreaterThan(counts[1] * 3);
  });

  it('is deterministic with a seeded source', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    for (let i = 0; i < 50; i++) expect(a()).toBe(b());
  });
});

describe('reel strips', () => {
  it('builds strips whose symbol frequencies match the weights', () => {
    const strip = buildReelStrip({ SEVEN: 2, PLUM: 6 });
    expect(strip.filter((s) => s === 'SEVEN')).toHaveLength(2);
    expect(strip.filter((s) => s === 'PLUM')).toHaveLength(6);
  });

  it('produces one strip per reel with every strip non-empty', () => {
    const strips = getReelStrips();
    expect(strips).toHaveLength(REEL_COUNT);
    for (const strip of strips) expect(strip.length).toBeGreaterThan(10);
  });

  it('high volatility strips carry fewer premium symbols than low', () => {
    const high = getReelStrips('high')[0].filter((s) => s === 'SEVEN').length;
    const low = getReelStrips('low')[0].filter((s) => s === 'SEVEN').length;
    expect(low).toBeGreaterThanOrEqual(high);
  });
});
