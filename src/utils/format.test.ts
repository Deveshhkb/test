import { describe, expect, it } from 'vitest';
import { clamp, formatCompact, formatCredits, mod } from './format';

describe('format utils', () => {
  it('formats credits with two decimals and separators', () => {
    expect(formatCredits(1250)).toBe('1,250.00');
    expect(formatCredits(0.5)).toBe('0.50');
  });

  it('formats compact large values', () => {
    expect(formatCompact(2_500_000)).toBe('2.5M');
    expect(formatCompact(12_000)).toBe('12.0K');
  });

  it('clamps values', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });

  it('mod is always positive', () => {
    expect(mod(-1, 5)).toBe(4);
    expect(mod(7, 5)).toBe(2);
    expect(mod(-12, 5)).toBe(3);
  });
});
