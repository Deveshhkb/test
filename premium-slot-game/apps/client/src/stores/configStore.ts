import { create } from 'zustand';
import type { GameConfig } from '@neon/game-math';

export const useConfigStore = create<{ config: GameConfig | null; symbolImages: Record<string, string>; set(p: Partial<{ config: GameConfig; symbolImages: Record<string, string> }>): void }>((set) => ({
  config: null,
  symbolImages: {},
  set: (p) => set(p),
}));
