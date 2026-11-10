import { SocketEvents, type BonusPickResponse, type PublicConfig, type SessionState, type SpinResponse } from '@neon/shared';
import { api, ApiRequestError } from './api';
import { GameSocket, type SocketHandlers } from './socket';

const TOKEN_KEY = 'neon-break-token';

export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Unified transport: Socket.io acks when connected, REST otherwise. Every mutating request
 * carries an idempotency key, so retries after network failures can never double-spend.
 */
export class GameClient {
  token: string | null = null;
  readonly socket = new GameSocket();

  async authenticate(): Promise<{ token: string; state: SessionState }> {
    let token: string | null = null;
    try {
      token = localStorage.getItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
    if (token) {
      try {
        const state = await api.session(token);
        this.token = token;
        return { token, state };
      } catch (e) {
        if (!(e instanceof ApiRequestError) || e.status !== 401) throw e;
      }
    }
    const auth = await api.demoAuth();
    this.token = auth.token;
    try {
      localStorage.setItem(TOKEN_KEY, auth.token);
    } catch {
      /* ignore */
    }
    return { token: auth.token, state: await api.session(auth.token) };
  }

  connectSocket(handlers: SocketHandlers) {
    if (this.token) this.socket.connect(this.token, handlers);
  }

  config(): Promise<PublicConfig> {
    return api.config();
  }

  private async withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
    let last: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (e) {
        last = e;
        if (!(e instanceof ApiRequestError) || !e.retryable) throw e;
        await sleep(250 * 2 ** i);
      }
    }
    throw last;
  }

  spin(bet: number, idempotencyKey: string): Promise<SpinResponse> {
    return this.withRetry(() =>
      this.socket.connected
        ? this.socket.request<SpinResponse>(SocketEvents.SPIN, { bet, idempotencyKey })
        : api.spin(this.token!, bet, idempotencyKey),
    );
  }

  bonusPick(roundId: string, targetIndex: number, idempotencyKey: string): Promise<BonusPickResponse> {
    return this.withRetry(() =>
      this.socket.connected
        ? this.socket.request<BonusPickResponse>(SocketEvents.BONUS_PICK, { roundId, targetIndex, idempotencyKey })
        : api.bonusPick(this.token!, roundId, targetIndex, idempotencyKey),
    );
  }

  history() {
    return api.history(this.token!, 50);
  }

  balance() {
    return api.balance(this.token!);
  }
}
