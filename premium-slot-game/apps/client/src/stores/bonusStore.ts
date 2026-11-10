import { create } from 'zustand';
import type { PublicBossFight, PublicFreeSpins } from '@neon/shared';

interface BonusState {
  freeSpinsActive: boolean;
  freeSpins: PublicFreeSpins | null;
  bossFight: PublicBossFight | null;
  setFreeSpins(fs: PublicFreeSpins | null, active?: boolean): void;
  setBossFight(bf: PublicBossFight | null): void;
}

export const useBonusStore = create<BonusState>((set) => ({
  freeSpinsActive: false,
  freeSpins: null,
  bossFight: null,
  setFreeSpins: (freeSpins, active) => set((s) => ({ freeSpins, freeSpinsActive: active ?? s.freeSpinsActive })),
  setBossFight: (bossFight) => set({ bossFight }),
}));
