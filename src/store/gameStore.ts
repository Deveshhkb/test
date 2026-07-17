import { create } from 'zustand';
import { GamePhase, type HistoryEntry, type SpinResult } from '@/types';
import {
  BET_LEVELS,
  COIN_VALUES,
  DEFAULT_BET_INDEX,
  DEFAULT_COIN_INDEX,
  PAYLINE_COUNT,
} from '@/constants';
import { roundCredits } from '@/utils/paylineEngine';

/**
 * Central game state. The Pixi engine reads/subscribes to this store via
 * useGameStore.getState()/subscribe, React components via the hook.
 */

interface GameState {
  phase: GamePhase;
  balance: number;
  betIndex: number;
  coinIndex: number;
  /** Win shown in the HUD for the last/current spin. */
  win: number;
  lastResult: SpinResult | null;

  autoSpinsRemaining: number; // Infinity = unlimited, 0 = off
  freeSpinsRemaining: number;
  freeSpinsTotalWin: number;
  inFreeSpins: boolean;

  history: HistoryEntry[];
  error: string | null;
  loadingProgress: number;

  // derived helpers
  betLevel: () => number;
  coinValue: () => number;
  totalBet: () => number;

  // actions
  setPhase: (phase: GamePhase) => void;
  setBalance: (balance: number) => void;
  setWin: (win: number) => void;
  setLastResult: (result: SpinResult | null) => void;
  betUp: () => void;
  betDown: () => void;
  coinUp: () => void;
  coinDown: () => void;
  setMaxBet: () => void;
  startAutoSpin: (count: number) => void;
  decrementAutoSpin: () => void;
  stopAutoSpin: () => void;
  setFreeSpins: (remaining: number, inFreeSpins: boolean) => void;
  addFreeSpinsWin: (win: number) => void;
  resetFreeSpinsWin: () => void;
  setHistory: (history: HistoryEntry[]) => void;
  setError: (error: string | null) => void;
  setLoadingProgress: (progress: number) => void;
}

export const useGameStore = create<GameState>()((set, get) => ({
  phase: GamePhase.Loading,
  balance: 0,
  betIndex: DEFAULT_BET_INDEX,
  coinIndex: DEFAULT_COIN_INDEX,
  win: 0,
  lastResult: null,

  autoSpinsRemaining: 0,
  freeSpinsRemaining: 0,
  freeSpinsTotalWin: 0,
  inFreeSpins: false,

  history: [],
  error: null,
  loadingProgress: 0,

  betLevel: () => BET_LEVELS[get().betIndex],
  coinValue: () => COIN_VALUES[get().coinIndex],
  totalBet: () =>
    roundCredits(BET_LEVELS[get().betIndex] * COIN_VALUES[get().coinIndex] * PAYLINE_COUNT),

  setPhase: (phase) => set({ phase }),
  setBalance: (balance) => set({ balance }),
  setWin: (win) => set({ win }),
  setLastResult: (lastResult) => set({ lastResult }),

  betUp: () =>
    set((s) => ({ betIndex: Math.min(s.betIndex + 1, BET_LEVELS.length - 1) })),
  betDown: () => set((s) => ({ betIndex: Math.max(s.betIndex - 1, 0) })),
  coinUp: () =>
    set((s) => ({ coinIndex: Math.min(s.coinIndex + 1, COIN_VALUES.length - 1) })),
  coinDown: () => set((s) => ({ coinIndex: Math.max(s.coinIndex - 1, 0) })),
  setMaxBet: () =>
    set({ betIndex: BET_LEVELS.length - 1, coinIndex: COIN_VALUES.length - 1 }),

  startAutoSpin: (count) => set({ autoSpinsRemaining: count }),
  decrementAutoSpin: () =>
    set((s) => ({
      autoSpinsRemaining:
        s.autoSpinsRemaining === Infinity
          ? Infinity
          : Math.max(0, s.autoSpinsRemaining - 1),
    })),
  stopAutoSpin: () => set({ autoSpinsRemaining: 0 }),

  setFreeSpins: (freeSpinsRemaining, inFreeSpins) =>
    set({ freeSpinsRemaining, inFreeSpins }),
  addFreeSpinsWin: (win) =>
    set((s) => ({ freeSpinsTotalWin: roundCredits(s.freeSpinsTotalWin + win) })),
  resetFreeSpinsWin: () => set({ freeSpinsTotalWin: 0 }),

  setHistory: (history) => set({ history }),
  setError: (error) => set({ error }),
  setLoadingProgress: (loadingProgress) => set({ loadingProgress }),
}));
