import { create } from 'zustand';
import { GamePhase } from '@aviator/shared';

/**
 * UI-facing game state.
 *
 * One-way data flow: the engine (and later the socket layer) writes into
 * this store; React components only read from it. React never reaches into
 * Pixi objects, and the engine never triggers React renders directly —
 * high-frequency values (fps, multiplier) are throttled at the source
 * (GameCanvas throttles multiplier writes to 10 Hz).
 */
interface GameStore {
  engineReady: boolean;
  phase: GamePhase;
  multiplier: number;
  /** Whole seconds remaining in the pre-takeoff countdown, null outside it. */
  countdown: number | null;
  /** Final multiplier of the last crashed round, null before the first. */
  lastCrash: number | null;
  fps: number;

  setEngineReady: (ready: boolean) => void;
  setPhase: (phase: GamePhase) => void;
  setMultiplier: (multiplier: number) => void;
  setCountdown: (countdown: number | null) => void;
  setLastCrash: (multiplier: number) => void;
  setFps: (fps: number) => void;
}

export const useGameStore = create<GameStore>()((set) => ({
  engineReady: false,
  phase: GamePhase.Waiting,
  multiplier: 1,
  countdown: null,
  lastCrash: null,
  fps: 0,

  setEngineReady: (engineReady) => set({ engineReady }),
  setPhase: (phase) => set({ phase }),
  setMultiplier: (multiplier) => set({ multiplier }),
  setCountdown: (countdown) => set({ countdown }),
  setLastCrash: (lastCrash) => set({ lastCrash }),
  setFps: (fps) => set({ fps }),
}));
