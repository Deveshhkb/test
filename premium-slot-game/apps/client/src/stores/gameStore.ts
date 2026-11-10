import { create } from 'zustand';

export type GamePhase =
  | 'IDLE'
  | 'BETTING'
  | 'SPIN_REQUESTED'
  | 'SPINNING'
  | 'REEL_STOPPING'
  | 'EVALUATING'
  | 'CASCADING'
  | 'WIN_PRESENTATION'
  | 'FREE_SPINS'
  | 'BONUS'
  | 'ERROR';

/** Allowed visual state transitions. Anything else is rejected. */
export const TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  IDLE: ['BETTING', 'SPIN_REQUESTED', 'BONUS', 'FREE_SPINS', 'ERROR'],
  BETTING: ['IDLE', 'SPIN_REQUESTED'],
  SPIN_REQUESTED: ['SPINNING', 'ERROR'],
  SPINNING: ['REEL_STOPPING', 'ERROR'],
  REEL_STOPPING: ['EVALUATING', 'ERROR'],
  EVALUATING: ['CASCADING', 'WIN_PRESENTATION', 'FREE_SPINS', 'BONUS', 'IDLE'],
  CASCADING: ['CASCADING', 'EVALUATING', 'WIN_PRESENTATION', 'FREE_SPINS', 'BONUS', 'IDLE'],
  WIN_PRESENTATION: ['CASCADING', 'FREE_SPINS', 'BONUS', 'IDLE'],
  FREE_SPINS: ['SPIN_REQUESTED', 'WIN_PRESENTATION', 'BONUS', 'IDLE'],
  BONUS: ['FREE_SPINS', 'WIN_PRESENTATION', 'IDLE'],
  ERROR: ['IDLE'],
};

interface GameState {
  phase: GamePhase;
  /** True while a spin request is on the wire (hard lock against duplicate requests). */
  requestInFlight: boolean;
  /** Accumulated win of the current round (visual). */
  roundWin: number;
  lastWin: number;
  cascadeIndex: number;
  cascadeMultiplier: number;
  luckySpin: boolean;
  error: string | null;
  ready: boolean;
  transition(to: GamePhase): boolean;
  canSpin(): boolean;
  setRequestInFlight(v: boolean): void;
  set(patch: Partial<Omit<GameState, 'transition' | 'canSpin' | 'set' | 'setRequestInFlight'>>): void;
  reset(): void;
}

const initial = {
  phase: 'IDLE' as GamePhase,
  requestInFlight: false,
  roundWin: 0,
  lastWin: 0,
  cascadeIndex: 0,
  cascadeMultiplier: 1,
  luckySpin: false,
  error: null,
  ready: false,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initial,
  transition(to) {
    const from = get().phase;
    if (!TRANSITIONS[from].includes(to)) {
      if (import.meta.env.DEV) console.warn(`[gameStore] rejected transition ${from} -> ${to}`);
      return false;
    }
    set({ phase: to });
    return true;
  },
  canSpin() {
    const s = get();
    return s.ready && !s.requestInFlight && (s.phase === 'IDLE' || s.phase === 'BETTING' || s.phase === 'FREE_SPINS');
  },
  setRequestInFlight(v) {
    set({ requestInFlight: v });
  },
  set(patch) {
    set(patch);
  },
  reset() {
    set(initial);
  },
}));
