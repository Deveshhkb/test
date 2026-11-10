import { useBonusStore } from '../stores/bonusStore';
import { useGameStore, type GamePhase } from '../stores/gameStore';
import { useSettingsStore } from '../stores/settingsStore';

export type SpinButtonState = 'idle' | 'spinning' | 'disabled' | 'auto' | 'lucky';

const SPINNING: GamePhase[] = ['SPIN_REQUESTED', 'SPINNING', 'REEL_STOPPING'];
const BUSY: GamePhase[] = ['EVALUATING', 'CASCADING', 'WIN_PRESENTATION', 'BONUS', 'ERROR'];

/** Derives the visual spin button state from authoritative stores. */
export function deriveSpinButtonState(phase: GamePhase, ready: boolean, auto: number, lucky: boolean, freeSpins: boolean): SpinButtonState {
  if (!ready) return 'disabled';
  if (SPINNING.includes(phase)) return lucky ? 'lucky' : 'spinning';
  if (auto > 0) return 'auto';
  if (freeSpins || BUSY.includes(phase)) return 'disabled';
  return 'idle';
}

export function useSpinButtonState(): SpinButtonState {
  const phase = useGameStore((s) => s.phase);
  const ready = useGameStore((s) => s.ready);
  const lucky = useGameStore((s) => s.luckySpin);
  const auto = useSettingsStore((s) => s.autoSpinsRemaining);
  const fs = useBonusStore((s) => s.freeSpinsActive);
  return deriveSpinButtonState(phase, ready, auto, lucky, fs);
}
