import { describe, expect, it } from 'vitest';
import {
  resolveMultiplierAnchor,
  resolvePlaneScale,
  resolvePlayfield,
  resolveUiScale,
} from './flight';

const VIEWPORTS: Array<[number, number]> = [
  [320, 568], // smallest supported phone, portrait
  [568, 320], // same phone, landscape
  [390, 844],
  [844, 390],
  [768, 1024],
  [1024, 768],
  [1920, 1080],
  [2560, 1080], // ultra-wide
  [3840, 2160], // 4K
];

describe('resolvePlayfield', () => {
  it('always yields a positive field fully inside the viewport', () => {
    for (const [w, h] of VIEWPORTS) {
      const p = resolvePlayfield(w, h);
      expect(p.fieldWidth).toBeGreaterThan(0);
      expect(p.fieldHeight).toBeGreaterThan(0);
      expect(p.originX).toBeGreaterThan(0);
      expect(p.originY).toBeLessThan(h);
      expect(p.originX + p.fieldWidth).toBeLessThanOrEqual(w);
      expect(p.originY - p.fieldHeight).toBeGreaterThanOrEqual(0);
      expect(p.groundY).toBeGreaterThan(p.originY);
      expect(p.groundY).toBeLessThanOrEqual(h);
    }
  });

  it('keeps a usable flight area even at 320px width', () => {
    const p = resolvePlayfield(320, 568);
    expect(p.fieldWidth).toBeGreaterThan(320 * 0.7);
    expect(p.fieldHeight).toBeGreaterThan(568 * 0.5);
  });

  it('caps margins on huge displays so the field keeps growing', () => {
    const p = resolvePlayfield(3840, 2160);
    expect(p.fieldWidth).toBeGreaterThan(3840 * 0.9);
  });
});

describe('scale resolvers', () => {
  it('stay within their clamps across all supported viewports', () => {
    for (const [w, h] of VIEWPORTS) {
      const ui = resolveUiScale(w, h);
      const plane = resolvePlaneScale(w, h);
      expect(ui).toBeGreaterThanOrEqual(0.5);
      expect(ui).toBeLessThanOrEqual(2.3);
      expect(plane).toBeGreaterThanOrEqual(0.45);
      expect(plane).toBeLessThanOrEqual(1.7);
    }
  });

  it('give identical scales for both orientations of the same device', () => {
    expect(resolveUiScale(390, 844)).toBe(resolveUiScale(844, 390));
    expect(resolvePlaneScale(390, 844)).toBe(resolvePlaneScale(844, 390));
  });

  it('scale up meaningfully from phone to 4K', () => {
    expect(resolveUiScale(3840, 2160)).toBeGreaterThan(resolveUiScale(390, 844) * 2);
  });
});

describe('resolveMultiplierAnchor', () => {
  it('centres horizontally and rises in portrait', () => {
    const portrait = resolveMultiplierAnchor(390, 844);
    const landscape = resolveMultiplierAnchor(844, 390);
    expect(portrait.x).toBe(195);
    expect(landscape.x).toBe(422);
    expect(portrait.y / 844).toBeLessThan(landscape.y / 390);
  });
});
