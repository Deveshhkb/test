import { describe, expect, it } from 'vitest';
import { computeLayout, stagePlacement } from '../src/game/core/layout';

const VIEWPORTS: [number, number][] = [
  [1920, 1080],
  [1600, 900],
  [1366, 768],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [375, 812],
];

describe('responsive layout', () => {
  it.each(VIEWPORTS)('%ix%i fits the viewport without overflow', (w, h) => {
    const l = computeLayout(w, h);
    expect(l.orientation).toBe(w >= h ? 'landscape' : 'portrait');
    expect(l.designWidth * l.scale).toBeLessThanOrEqual(w + 0.5);
    expect(l.designHeight * l.scale).toBeLessThanOrEqual(h + 0.5);
    expect(l.offsetX).toBeGreaterThanOrEqual(0);
    expect(l.offsetY).toBeGreaterThanOrEqual(0);
    const p = stagePlacement(l);
    // reel frame stays inside design space
    expect(p.frameX).toBeGreaterThanOrEqual(0);
    expect(p.frameX + 1088 * p.frameScale).toBeLessThanOrEqual(l.designWidth + 0.5);
    const frameBottom = p.frameY + 800 * p.frameScale;
    if (l.orientation === 'landscape') {
      // control bar (168px) below the frame fits in the design height
      expect(frameBottom + 4 + 168).toBeLessThanOrEqual(l.designHeight);
      expect(p.characterX + 240 * p.characterScale).toBeLessThanOrEqual(p.frameX + 200);
    } else {
      // portrait control area (bottom 404px) does not overlap the reels
      expect(frameBottom).toBeLessThanOrEqual(l.designHeight - 404);
    }
  });
  it('keeps symbols square (uniform scale)', () => {
    const l = computeLayout(390, 844);
    expect(stagePlacement(l).frameScale).toBeCloseTo((1080 - 24) / 1088, 3);
  });
});
