import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameSettings } from '@/types';

interface SettingsState extends GameSettings {
  setMusicVolume: (v: number) => void;
  setSoundVolume: (v: number) => void;
  setTurbo: (on: boolean) => void;
  setQuickSpin: (on: boolean) => void;
  setLanguage: (lang: string) => void;
  setQuality: (q: GameSettings['quality']) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      musicVolume: 0.5,
      soundVolume: 0.8,
      turbo: false,
      quickSpin: false,
      language: 'en',
      quality: 'high',
      setMusicVolume: (musicVolume) => set({ musicVolume }),
      setSoundVolume: (soundVolume) => set({ soundVolume }),
      setTurbo: (turbo) => set({ turbo }),
      setQuickSpin: (quickSpin) => set({ quickSpin }),
      setLanguage: (language) => set({ language }),
      setQuality: (quality) => set({ quality }),
    }),
    { name: 'royal-fortune-settings' },
  ),
);
