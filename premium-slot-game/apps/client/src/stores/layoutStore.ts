import { create } from 'zustand';

export type Orientation = 'landscape' | 'portrait';

export interface Layout {
  orientation: Orientation;
  /** Design-space size the stage is laid out in. */
  designWidth: number;
  designHeight: number;
  /** CSS px per design px. */
  scale: number;
  offsetX: number;
  offsetY: number;
  viewportWidth: number;
  viewportHeight: number;
}

export const useLayoutStore = create<Layout & { setLayout(l: Layout): void }>((set) => ({
  orientation: 'landscape',
  designWidth: 1920,
  designHeight: 1080,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  viewportWidth: 1920,
  viewportHeight: 1080,
  setLayout: (l) => set(l),
}));
