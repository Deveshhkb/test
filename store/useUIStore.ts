'use client';

import { create } from 'zustand';

interface UIState {
  mobileMenuOpen: boolean;
  searchOpen: boolean;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleMobileMenu: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
}

/** Global UI store for the navbar drawer and global search overlay. */
export const useUIStore = create<UIState>((set) => ({
  mobileMenuOpen: false,
  searchOpen: false,
  openMobileMenu: () => set({ mobileMenuOpen: true }),
  closeMobileMenu: () => set({ mobileMenuOpen: false }),
  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),
}));
