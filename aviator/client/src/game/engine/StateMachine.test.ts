import { describe, expect, it, vi } from 'vitest';
import { GamePhase } from '@aviator/shared';
import { StateMachine } from './StateMachine';
import { createGameStateMachine } from './GameStateMachine';

describe('StateMachine', () => {
  type S = 'a' | 'b' | 'c';
  const table: Record<S, readonly S[]> = { a: ['b'], b: ['c'], c: [] };

  it('performs whitelisted transitions and notifies listeners', () => {
    const machine = new StateMachine<S>('a', table);
    const listener = vi.fn();
    machine.onChange(listener);

    expect(machine.transition('b')).toBe(true);
    expect(machine.current).toBe('b');
    expect(listener).toHaveBeenCalledWith({ from: 'a', to: 'b' });
  });

  it('rejects illegal transitions without changing state', () => {
    const machine = new StateMachine<S>('a', table);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(machine.transition('c')).toBe(false);
    expect(machine.current).toBe('a');

    warn.mockRestore();
  });

  it('treats self-transitions as no-ops', () => {
    const machine = new StateMachine<S>('a', table);
    const listener = vi.fn();
    machine.onChange(listener);

    expect(machine.transition('a')).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('supports forced state for recovery flows', () => {
    const machine = new StateMachine<S>('a', table);
    machine.forceState('c');
    expect(machine.current).toBe('c');
  });

  it('unsubscribes listeners', () => {
    const machine = new StateMachine<S>('a', table);
    const listener = vi.fn();
    const off = machine.onChange(listener);
    off();
    machine.transition('b');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('createGameStateMachine', () => {
  it('walks the full happy-path round', () => {
    const machine = createGameStateMachine();
    const path = [
      GamePhase.Betting,
      GamePhase.Countdown,
      GamePhase.Takeoff,
      GamePhase.Running,
      GamePhase.Crash,
      GamePhase.Result,
      GamePhase.Reset,
      GamePhase.Betting,
    ];
    for (const phase of path) {
      expect(machine.transition(phase)).toBe(true);
    }
  });

  it('allows reconnect from any phase, then recovery into a round phase', () => {
    const machine = createGameStateMachine();
    machine.transition(GamePhase.Betting);
    machine.transition(GamePhase.Countdown);

    expect(machine.transition(GamePhase.Reconnect)).toBe(true);
    expect(machine.transition(GamePhase.Recovery)).toBe(true);
    expect(machine.transition(GamePhase.Running)).toBe(true);
  });

  it('rejects skipping ahead in the round flow', () => {
    const machine = createGameStateMachine();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(machine.transition(GamePhase.Running)).toBe(false);
    expect(machine.current).toBe(GamePhase.Waiting);

    warn.mockRestore();
  });
});
