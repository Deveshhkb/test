import { io, type Socket } from 'socket.io-client';
import { SocketEvents, type SessionState } from '@neon/shared';
import { ApiRequestError } from './api';

type AckResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

export interface SocketHandlers {
  onState?(s: SessionState): void;
  onBalance?(b: { balance: number }): void;
  onConnection?(connected: boolean): void;
}

export class GameSocket {
  private socket: Socket | null = null;

  connect(token: string, handlers: SocketHandlers) {
    this.disconnect();
    const url = (import.meta.env.VITE_SOCKET_URL as string | undefined) ?? undefined;
    const s = url ? io(url, { auth: { token }, transports: ['websocket', 'polling'] }) : io({ auth: { token }, transports: ['websocket', 'polling'] });
    s.on('connect', () => {
      handlers.onConnection?.(true);
      // resume / recover any unfinished round state after (re)connection
      s.emit(SocketEvents.RESUME, {}, () => undefined);
    });
    s.on('disconnect', () => handlers.onConnection?.(false));
    s.on(SocketEvents.STATE, (st: SessionState) => handlers.onState?.(st));
    s.on(SocketEvents.BALANCE, (b: { balance: number }) => handlers.onBalance?.(b));
    this.socket = s;
  }

  get connected() {
    return !!this.socket?.connected;
  }

  request<T>(event: string, payload: unknown, timeoutMs = 10000): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) return reject(new ApiRequestError('NETWORK', 'Socket not connected', 0));
      this.socket.timeout(timeoutMs).emit(event, payload, (err: Error | null, res: AckResult<T>) => {
        if (err) return reject(new ApiRequestError('NETWORK', 'Socket timeout', 0));
        if (res.ok) resolve(res.data);
        else reject(new ApiRequestError(res.error.code, res.error.message, res.error.code === 'INTERNAL' ? 500 : 400));
      });
    });
  }

  disconnect() {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }
}
