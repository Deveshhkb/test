import { create } from 'zustand';

interface PlayerState {
  token: string | null;
  userId: string | null;
  nickname: string;
  /** Authoritative balance from the server. */
  balance: number;
  /** Visual balance (lags behind during presentations). */
  displayBalance: number;
  connected: boolean;
  setAuth(token: string, userId: string, nickname: string): void;
  setBalance(balance: number, syncDisplay?: boolean): void;
  setDisplayBalance(v: number): void;
  setConnected(v: boolean): void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  token: null,
  userId: null,
  nickname: '',
  balance: 0,
  displayBalance: 0,
  connected: false,
  setAuth: (token, userId, nickname) => set({ token, userId, nickname }),
  setBalance: (balance, syncDisplay = true) => set(syncDisplay ? { balance, displayBalance: balance } : { balance }),
  setDisplayBalance: (displayBalance) => set({ displayBalance }),
  setConnected: (connected) => set({ connected }),
}));
