import { create } from 'zustand';

export type ModalId = 'paytable' | 'settings' | 'history' | 'info' | 'menu' | 'auto' | null;

interface UiState {
  modal: ModalId;
  toast: string | null;
  open(m: ModalId): void;
  close(): void;
  showToast(msg: string): void;
  clearToast(): void;
}

export const useUiStore = create<UiState>((set) => ({
  modal: null,
  toast: null,
  open: (modal) => set({ modal }),
  close: () => set({ modal: null }),
  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
}));
