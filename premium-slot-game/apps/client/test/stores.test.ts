import { beforeEach, describe, expect, it } from 'vitest';
import { TRANSITIONS, useGameStore } from '../src/stores/gameStore';
import { useBetStore } from '../src/stores/betStore';
import { useSettingsStore } from '../src/stores/settingsStore';
import { deriveSpinButtonState } from '../src/hooks/useSpinButtonState';
import { formatCredits } from '../src/services/format';

describe('gameStore state machine', () => {
  beforeEach(() => useGameStore.getState().reset());

  it('follows the full spin sequence', () => {
    const s = useGameStore.getState();
    s.set({ ready: true });
    for (const p of ['SPIN_REQUESTED', 'SPINNING', 'REEL_STOPPING', 'EVALUATING', 'CASCADING', 'CASCADING', 'WIN_PRESENTATION', 'FREE_SPINS', 'SPIN_REQUESTED'] as const) {
      expect(useGameStore.getState().transition(p)).toBe(true);
    }
    expect(useGameStore.getState().phase).toBe('SPIN_REQUESTED');
  });

  it('rejects invalid transitions', () => {
    const s = useGameStore.getState();
    expect(s.transition('CASCADING')).toBe(false);
    expect(s.transition('REEL_STOPPING')).toBe(false);
    expect(useGameStore.getState().phase).toBe('IDLE');
    s.transition('SPIN_REQUESTED');
    expect(useGameStore.getState().transition('SPIN_REQUESTED')).toBe(false); // no double spin
  });

  it('every phase can eventually return to IDLE', () => {
    for (const from of Object.keys(TRANSITIONS) as (keyof typeof TRANSITIONS)[]) {
      const seen = new Set([from]);
      const queue = [from];
      while (queue.length) for (const n of TRANSITIONS[queue.shift()!]) if (!seen.has(n)) (seen.add(n), queue.push(n));
      expect(seen.has('IDLE')).toBe(true);
    }
  });

  it('canSpin blocks duplicate requests', () => {
    const s = useGameStore.getState();
    expect(s.canSpin()).toBe(false); // not ready
    s.set({ ready: true });
    expect(useGameStore.getState().canSpin()).toBe(true);
    s.setRequestInFlight(true);
    expect(useGameStore.getState().canSpin()).toBe(false);
    s.setRequestInFlight(false);
    s.transition('SPIN_REQUESTED');
    expect(useGameStore.getState().canSpin()).toBe(false);
  });
});

describe('betStore', () => {
  beforeEach(() => useBetStore.getState().setLevels([1000, 2000, 5000, 10000], 2000));
  it('steps within bounds', () => {
    const b = useBetStore.getState;
    expect(b().bet).toBe(2000);
    b().decrease();
    b().decrease();
    expect(b().bet).toBe(1000);
    b().increase();
    b().increase();
    b().increase();
    b().increase();
    expect(b().bet).toBe(10000);
    b().decrease();
    b().max();
    expect(b().bet).toBe(10000);
  });
  it('ignores unknown bet levels', () => {
    useBetStore.getState().setBet(1234);
    expect(useBetStore.getState().bet).toBe(2000);
  });
});

describe('settingsStore', () => {
  it('clamps volumes and handles auto spins', () => {
    const s = useSettingsStore.getState;
    s().setVolume('musicVolume', 3);
    expect(s().musicVolume).toBe(1);
    s().setVolume('sfxVolume', -1);
    expect(s().sfxVolume).toBe(0);
    s().startAuto(2);
    s().consumeAuto();
    expect(s().autoSpinsRemaining).toBe(1);
    s().consumeAuto();
    s().consumeAuto();
    expect(s().autoSpinsRemaining).toBe(0);
    s().startAuto(Infinity);
    s().consumeAuto();
    expect(s().autoSpinsRemaining).toBe(Infinity);
    s().stopAuto();
    expect(s().autoSpinsRemaining).toBe(0);
  });
  it('toggles mute and turbo', () => {
    const before = useSettingsStore.getState().muted;
    useSettingsStore.getState().toggleMute();
    expect(useSettingsStore.getState().muted).toBe(!before);
    const t = useSettingsStore.getState().turbo;
    useSettingsStore.getState().toggleTurbo();
    expect(useSettingsStore.getState().turbo).toBe(!t);
  });
});

describe('spin button state', () => {
  it('derives every visual state', () => {
    expect(deriveSpinButtonState('IDLE', false, 0, false, false)).toBe('disabled');
    expect(deriveSpinButtonState('IDLE', true, 0, false, false)).toBe('idle');
    expect(deriveSpinButtonState('SPINNING', true, 0, false, false)).toBe('spinning');
    expect(deriveSpinButtonState('REEL_STOPPING', true, 0, true, false)).toBe('lucky');
    expect(deriveSpinButtonState('IDLE', true, 5, false, false)).toBe('auto');
    expect(deriveSpinButtonState('CASCADING', true, 0, false, false)).toBe('disabled');
    expect(deriveSpinButtonState('IDLE', true, 0, false, true)).toBe('disabled');
    expect(deriveSpinButtonState('BONUS', true, 0, false, false)).toBe('disabled');
  });
});

describe('formatCredits', () => {
  it('formats minor units', () => {
    expect(formatCredits(12560000)).toBe('125,600.00');
    expect(formatCredits(32000)).toBe('320.00');
    expect(formatCredits(5)).toBe('0.05');
  });
});
