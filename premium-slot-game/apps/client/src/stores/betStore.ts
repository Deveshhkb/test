import { create } from 'zustand';

interface BetState {
  levels: number[];
  index: number;
  bet: number;
  setLevels(levels: number[], defaultBet: number): void;
  increase(): void;
  decrease(): void;
  max(): void;
  setBet(bet: number): void;
}

export const useBetStore = create<BetState>((set, get) => ({
  levels: [10000],
  index: 0,
  bet: 10000,
  setLevels(levels, defaultBet) {
    const index = Math.max(0, levels.indexOf(defaultBet));
    set({ levels, index, bet: levels[index] });
  },
  increase() {
    const { index, levels } = get();
    const i = Math.min(levels.length - 1, index + 1);
    set({ index: i, bet: levels[i] });
  },
  decrease() {
    const { index, levels } = get();
    const i = Math.max(0, index - 1);
    set({ index: i, bet: levels[i] });
  },
  max() {
    const { levels } = get();
    set({ index: levels.length - 1, bet: levels[levels.length - 1] });
  },
  setBet(bet) {
    const i = get().levels.indexOf(bet);
    if (i >= 0) set({ index: i, bet });
  },
}));
