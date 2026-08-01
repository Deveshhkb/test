import { describe, expect, it } from 'vitest';
import { createSeededRandom, sampleCrashMultiplier } from './random';

describe('createSeededRandom', () => {
  it('is deterministic for a given seed', () => {
    const a = createSeededRandom(1234);
    const b = createSeededRandom(1234);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  it('produces values in [0, 1)', () => {
    const rand = createSeededRandom(42);
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('sampleCrashMultiplier', () => {
  const SAMPLES = 20000;
  const HOUSE_EDGE = 0.03;

  it('never returns below 1.00 or above the ceiling', () => {
    const rand = createSeededRandom(7);
    for (let i = 0; i < SAMPLES; i++) {
      const m = sampleCrashMultiplier(rand, HOUSE_EDGE, 5000);
      expect(m).toBeGreaterThanOrEqual(1);
      expect(m).toBeLessThanOrEqual(5000);
    }
  });

  it('matches the theoretical survival curve P(m ≥ x) = (1 − edge) / x', () => {
    const rand = createSeededRandom(99);
    let atLeast2 = 0;
    let atLeast10 = 0;
    for (let i = 0; i < SAMPLES; i++) {
      const m = sampleCrashMultiplier(rand, HOUSE_EDGE, 5000);
      if (m >= 2) atLeast2++;
      if (m >= 10) atLeast10++;
    }
    // Theoretical: 0.485 and 0.097. Allow generous statistical slack.
    expect(atLeast2 / SAMPLES).toBeGreaterThan(0.455);
    expect(atLeast2 / SAMPLES).toBeLessThan(0.515);
    expect(atLeast10 / SAMPLES).toBeGreaterThan(0.082);
    expect(atLeast10 / SAMPLES).toBeLessThan(0.112);
  });

  it('produces instant crashes (1.00×) at roughly the expected rate', () => {
    const rand = createSeededRandom(555);
    let instant = 0;
    for (let i = 0; i < SAMPLES; i++) {
      if (sampleCrashMultiplier(rand, HOUSE_EDGE, 5000) === 1) instant++;
    }
    // P(m = 1.00 after floor) ≈ 1 − (1 − edge)/1.01 ≈ 4%.
    expect(instant / SAMPLES).toBeGreaterThan(0.02);
    expect(instant / SAMPLES).toBeLessThan(0.06);
  });

  it('rounds down to cents', () => {
    const m = sampleCrashMultiplier(() => 0.5, HOUSE_EDGE, 5000);
    expect(m).toBe(Math.floor(m * 100) / 100);
    expect(m).toBeCloseTo(1.94, 2);
  });
});
