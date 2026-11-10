import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const AUTO_SPIN_OPTIONS = [10, 25, 50, 100, Infinity] as const;

interface SettingsState {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  turbo: boolean;
  /** Remaining auto spins (0 = auto off). */
  autoSpinsRemaining: number;
  stopAutoOnFeature: boolean;
  setVolume(kind: 'masterVolume' | 'musicVolume' | 'sfxVolume', v: number): void;
  toggleMute(): void;
  toggleTurbo(): void;
  startAuto(count: number): void;
  consumeAuto(): void;
  stopAuto(): void;
  set(patch: Partial<Pick<SettingsState, 'stopAutoOnFeature' | 'muted' | 'turbo'>>): void;
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      masterVolume: 0.8,
      musicVolume: 0.45,
      sfxVolume: 0.8,
      muted: false,
      turbo: false,
      autoSpinsRemaining: 0,
      stopAutoOnFeature: true,
      setVolume: (kind, v) => set({ [kind]: clamp(v) } as Partial<SettingsState>),
      toggleMute: () => set({ muted: !get().muted }),
      toggleTurbo: () => set({ turbo: !get().turbo }),
      startAuto: (count) => set({ autoSpinsRemaining: count }),
      consumeAuto: () => set({ autoSpinsRemaining: Math.max(0, get().autoSpinsRemaining - 1) }),
      stopAuto: () => set({ autoSpinsRemaining: 0 }),
      set: (patch) => set(patch),
    }),
    {
      name: 'neon-break-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ masterVolume: s.masterVolume, musicVolume: s.musicVolume, sfxVolume: s.sfxVolume, muted: s.muted, turbo: s.turbo, stopAutoOnFeature: s.stopAutoOnFeature }),
    },
  ),
);
