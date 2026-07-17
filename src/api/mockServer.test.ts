import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockServer } from './mockServer';
import { mulberry32, setRandomSource } from '@/utils/rng';
import { REEL_COUNT, ROW_COUNT } from '@/constants';

beforeEach(() => mockServer.reset());
afterEach(() => setRandomSource(Math.random));

describe('mock spin', () => {
  it('returns a well-formed 5x3 result and conserves balance', async () => {
    setRandomSource(mulberry32(1));
    const before = (await mockServer.login()).balance;
    const bet = 2;
    const result = await mockServer.spin(bet);

    expect(result.reels).toHaveLength(REEL_COUNT);
    for (const column of result.reels) expect(column).toHaveLength(ROW_COUNT);
    expect(result.finalReels).toHaveLength(REEL_COUNT);
    expect(result.bet).toBe(bet);
    expect(result.totalWin).toBeGreaterThanOrEqual(0);
    // balance = before - bet + totalWin (float-safe)
    expect(result.balance).toBeCloseTo(before - bet + result.totalWin, 2);
  });

  it('reported paylines + cascades sum to totalWin', async () => {
    setRandomSource(mulberry32(99));
    for (let i = 0; i < 200; i++) {
      const result = await mockServer.spin(1);
      const base = result.paylines.reduce((s, w) => s + w.win, 0);
      const cascadeWin = result.cascades.reduce((s, c) => s + c.stepWin, 0);
      expect(result.totalWin).toBeCloseTo(base + cascadeWin, 2);
      if (result.freeSpinsRemaining > 0) break; // keep the test out of long features
    }
  });

  it('rejects a bet larger than the balance', async () => {
    await expect(mockServer.spin(10_000_000)).rejects.toThrow('INSUFFICIENT_FUNDS');
  });

  it('rejects a non-positive bet', async () => {
    await expect(mockServer.spin(0)).rejects.toThrow('INVALID_BET');
  });

  it('records history newest-first', async () => {
    setRandomSource(mulberry32(5));
    await mockServer.spin(1);
    await mockServer.spin(1);
    const history = await mockServer.getHistory();
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0].id).toBeGreaterThan(history[1].id);
  });

  it('pays a realistic long-run RTP from the weighted strips', async () => {
    setRandomSource(mulberry32(2024));
    let wagered = 0;
    let won = 0;
    for (let i = 0; i < 3000; i++) {
      const r = await mockServer.spin(1);
      wagered += r.isFreeSpin ? 0 : 1;
      won += r.totalWin;
    }
    const rtp = won / wagered;
    // Wide statistical band — this guards against a broken math model
    // (e.g. 0% or 500% RTP), not an exact tuning target.
    expect(rtp).toBeGreaterThan(0.4);
    expect(rtp).toBeLessThan(2.5);
  });
});
