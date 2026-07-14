/**
 * Shared driver-app core: theme tokens, API client, session store, socket.
 * Kept in one module — the rider app is deliberately small.
 */
import axios from 'axios';
import Constants from 'expo-constants';
import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const colors = {
  background: '#14110D',
  surface: '#1E1A15',
  surfaceAlt: '#282219',
  text: '#F5EFE7',
  textMuted: '#A39A8D',
  border: '#2C261F',
  primary: '#FF7A4D',
  success: '#2E9E5B',
  danger: '#D64545',
  gold: '#F2B441',
};

const baseURL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'http://localhost:4000';

interface SessionState {
  token: string | null;
  name: string | null;
  setSession: (token: string, name: string) => void;
  signOut: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      name: null,
      setSession: (token, name) => set({ token, name }),
      signOut: () => set({ token: null, name: null }),
    }),
    { name: 'savora-rider-session', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const api = axios.create({ baseURL: `${baseURL}/api/v1`, timeout: 15_000 });
api.interceptors.request.use((config) => {
  const token = useSession.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let socket: Socket | null = null;
export const getSocket = (): Socket => {
  if (socket?.connected) return socket;
  socket?.disconnect();
  socket = io(baseURL, {
    transports: ['websocket'],
    auth: { token: useSession.getState().token },
    reconnection: true,
  });
  return socket;
};

export interface OrderOffer {
  orderId: string;
  orderNumber: string;
  restaurantName: string;
  pickupAddress: string;
  dropAddress: string;
  payout: number;
  expiresInSec: number;
}
