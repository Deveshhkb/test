import { describe, expect, it, vi } from 'vitest';
import { GamePhase } from '@aviator/shared';
import { EventBus } from '@/game/engine/EventBus';
import { createGameStateMachine } from '@/game/engine/GameStateMachine';
import type { EngineEvents } from '@/game/engine/events';
import { RoundDirector } from './RoundDirector';
import { ROUND_CONFIG } from '@/config/flight';

const DT = 1 / 60;

function createDirector(crashAt: number) {
  const events = new EventBus<EngineEvents>();
  const state = createGameStateMachine();
  const director = new RoundDirector({
    state,
    events,
    sampleCrash: () => crashAt,
  });
  const step = (seconds: number) => {
    const frames = Math.ceil(seconds / DT);
    for (let i = 0; i < frames; i++) director.update(DT);
  };
  /** Step until the predicate holds; returns false if maxSeconds elapse. */
  const stepUntil = (predicate: () => boolean, maxSeconds: number): boolean => {
    const frames = Math.ceil(maxSeconds / DT);
    for (let i = 0; i < frames; i++) {
      director.update(DT);
      if (predicate()) return true;
    }
    return predicate();
  };
  return { events, state, director, step, stepUntil };
}

describe('RoundDirector', () => {
  it('walks waiting → betting → countdown → takeoff → running', () => {
    const { state, step } = createDirector(100);

    step(ROUND_CONFIG.waitingSeconds + 0.1);
    expect(state.current).toBe(GamePhase.Betting);

    step(ROUND_CONFIG.bettingSeconds + 0.1);
    expect(state.current).toBe(GamePhase.Countdown);

    step(ROUND_CONFIG.countdownSeconds + 0.1);
    expect(state.current).toBe(GamePhase.Takeoff);

    step(ROUND_CONFIG.takeoffSeconds + 0.1);
    expect(state.current).toBe(GamePhase.Running);
  });

  it('emits countdown ticks 3, 2, 1 exactly once each', () => {
    const { events, step } = createDirector(100);
    const ticks: number[] = [];
    events.on('round:countdown', (n) => ticks.push(n));

    step(
      ROUND_CONFIG.waitingSeconds +
        ROUND_CONFIG.bettingSeconds +
        ROUND_CONFIG.countdownSeconds +
        0.2,
    );
    expect(ticks).toEqual([3, 2, 1]);
  });

  it('crashes exactly at the sampled crash point', () => {
    const crashAt = 2.0;
    const { events, state, stepUntil } = createDirector(crashAt);
    const crashListener = vi.fn();
    let phaseAtCrash: GamePhase | null = null;
    events.on('round:crashed', (payload) => {
      crashListener(payload);
      phaseAtCrash = state.current;
    });

    // Time to 2×: ln(2)/growthRate ≈ 6.3s of running, plus the pre-round
    // phases — 30s is ample.
    const crashedOnce = stepUntil(() => crashListener.mock.calls.length > 0, 30);

    expect(crashedOnce).toBe(true);
    expect(crashListener).toHaveBeenCalledTimes(1);
    const payload = crashListener.mock.calls[0]?.[0] as { multiplier: number };
    expect(payload.multiplier).toBe(crashAt);
    expect(phaseAtCrash).toBe(GamePhase.Crash);
  });

  it('multiplier grows exponentially and never exceeds the crash point', () => {
    const crashAt = 3.5;
    const { events, step } = createDirector(crashAt);
    let max = 0;
    events.on('round:multiplier', (m) => {
      max = Math.max(max, m);
    });

    step(60);
    expect(max).toBe(crashAt);
  });

  it('loops back to betting after the crash presentation', () => {
    const { events, state, stepUntil } = createDirector(1.5);
    let crashes = 0;
    events.on('round:crashed', () => crashes++);

    const crashed = stepUntil(() => crashes > 0, 30);
    expect(crashed).toBe(true);

    // After crash → result → reset the director must reopen betting.
    const backToBetting = stepUntil(
      () => state.current === GamePhase.Betting,
      ROUND_CONFIG.crashSeconds + ROUND_CONFIG.resultSeconds + ROUND_CONFIG.resetSeconds + 1,
    );
    expect(backToBetting).toBe(true);
  });

  it('assigns a fresh round id per takeoff', () => {
    const { events, director, step } = createDirector(1.2);
    const roundIds: string[] = [];
    events.on('round:takeoff', ({ roundId }) => roundIds.push(roundId));

    step(45);
    expect(roundIds.length).toBeGreaterThanOrEqual(2);
    expect(new Set(roundIds).size).toBe(roundIds.length);
    expect(director.currentRoundId).toBe(roundIds[roundIds.length - 1]);
  });

  it('idles during reconnect/recovery instead of advancing the round', () => {
    const { state, step, director } = createDirector(100);
    step(ROUND_CONFIG.waitingSeconds + 0.1);
    expect(state.current).toBe(GamePhase.Betting);

    state.transition(GamePhase.Reconnect);
    step(30);
    expect(state.current).toBe(GamePhase.Reconnect);
    director.destroy();
  });

  it('stops updating after destroy', () => {
    const { state, director } = createDirector(100);
    director.destroy();
    for (let i = 0; i < 600; i++) director.update(DT);
    expect(state.current).toBe(GamePhase.Waiting);
  });
});
