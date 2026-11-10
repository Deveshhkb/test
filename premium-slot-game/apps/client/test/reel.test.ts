import { describe, expect, it } from 'vitest';
import { Texture } from 'pixi.js';
import { SYMBOL_IDS, type SymbolId } from '@neon/game-math';
import { Reel } from '../src/game/reels/Reel';
import { SymbolFactory } from '../src/game/symbols/SymbolFactory';

function factory() {
  const t = Object.fromEntries(SYMBOL_IDS.map((id) => [id, Texture.WHITE])) as unknown as Record<SymbolId, Texture>;
  return new SymbolFactory({ sharp: t, blur: t, glow: Texture.WHITE });
}

/** Drives the reel by simulated frames (the reel itself is time based). */
async function run(reel: Reel, ms: number) {
  const step = 16;
  for (let t = 0; t < ms; t += step) {
    reel.update(step);
    await new Promise((r) => setTimeout(r, 0));
  }
}

describe('Reel engine', () => {
  it('moves symbols while spinning and lands exactly on the target', async () => {
    const reel = new Reel(0, factory(), ['A', 'K', 'Q', 'J', 'TEN']);
    expect(reel.visibleSymbols()).toEqual(['A', 'K', 'Q', 'J', 'TEN']);
    const ys0 = reel.views.map((v) => v.y);
    reel.spin(0.03, 0.05);
    await new Promise((r) => setTimeout(r, 250));
    await run(reel, 400);
    expect(reel.state).toBe('spinning');
    expect(reel.position).toBeGreaterThan(1);
    expect(reel.views.map((v) => v.y)).not.toEqual(ys0);
    const target: SymbolId[] = ['WILD', 'HERO', 'SCATTER', 'HERO', 'BONUS'];
    await reel.stop(target, 0.2, 0.08);
    expect(reel.state).toBe('idle');
    expect(reel.visibleSymbols()).toEqual(target);
    // views are re-indexed into slots and sit on their rows
    reel.visibleViews().forEach((v, row) => expect(v.y).toBeCloseTo(Reel.rowY(row), 3));
    // pooled: still exactly 7 views
    expect(reel.views).toHaveLength(7);
  });

  it('applies cascade gravity with server fills', async () => {
    const reel = new Reel(0, factory(), ['A', 'K', 'Q', 'J', 'TEN']);
    await reel.cascade([1, 3], ['HERO', 'WILD'], 0.05);
    expect(reel.visibleSymbols()).toEqual(['HERO', 'WILD', 'A', 'Q', 'TEN']);
    reel.visibleViews().forEach((v, row) => expect(v.y).toBeCloseTo(Reel.rowY(row), 3));
  });

  it('setSymbols restores a grid instantly (reconnection)', () => {
    const reel = new Reel(0, factory(), ['A', 'K', 'Q', 'J', 'TEN']);
    reel.setSymbols(['HOLO', 'HOLO', 'RIFLE', 'K', 'A']);
    expect(reel.visibleSymbols()).toEqual(['HOLO', 'HOLO', 'RIFLE', 'K', 'A']);
  });
});
