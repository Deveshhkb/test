import { create } from 'zustand';
import { GamePhase } from '@aviator/shared';

/**
 * UI-facing game state.
 *
 * One-way data flow: the engine (and later the socket layer) writes into
 * this store; React components only read from it. React never reaches into
 * Pixi objects, and the engine never triggers React renders directly —
 * high-frequency values (fps, multiplier) are throttled at the source.
 */
interface GameStore {
  engineReady: boolean;
  phase: GamePhase;
  multiplier: number;
  fps: number;

  setEngineReady: (ready: boolean) => void;
  setPhase: (phase: GamePhase) => void;
  setMultiplier: (multiplier: number) => void;
  setFps: (fps: number) => void;
}

export const useGameStore = create<GameStore>()((set) => ({
  engineReady: false,
  phase: GamePhase.Waiting,
  multiplier: 1,
  fps: 0,

  setEngineReady: (engineReady) => set({ engineReady }),
  setPhase: (phase) => set({ phase }),
  setMultiplier: (multiplier) => set({ multiplier }),
  setFps: (fps) => set({ fps }),
}));
