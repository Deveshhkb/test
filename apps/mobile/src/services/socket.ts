import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { useAuthStore } from '@/store/authStore';

const baseURL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'http://localhost:4000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  const token = useAuthStore.getState().token;
  if (socket?.connected) return socket;
  socket?.disconnect();
  socket = io(baseURL, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionDelayMax: 8_000,
  });
  return socket;
};

export const disconnectSocket = (): void => {
  socket?.disconnect();
  socket = null;
};
