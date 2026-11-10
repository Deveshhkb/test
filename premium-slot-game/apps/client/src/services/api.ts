import type { BonusPickResponse, HistoryEntry, PublicConfig, SessionState, SpinResponse } from '@neon/shared';

export class ApiRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
  /** Network-level or 5xx errors are safe to retry with the same idempotency key. */
  get retryable() {
    return this.status === 0 || this.status >= 500 || this.code === 'SPIN_IN_PROGRESS';
  }
}

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

async function http<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
        ...init.headers,
      },
    });
  } catch (e) {
    throw new ApiRequestError('NETWORK', (e as Error).message || 'Network error', 0);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiRequestError(body?.error?.code ?? 'INTERNAL', body?.error?.message ?? res.statusText, res.status);
  return body as T;
}

export const api = {
  demoAuth: (nickname?: string) =>
    http<{ token: string; user: { id: string; nickname: string; balance: number } }>('/auth/demo', { method: 'POST', body: JSON.stringify({ nickname }) }),
  session: (token: string) => http<SessionState>('/game/session', { method: 'POST', token }),
  spin: (token: string, bet: number, idempotencyKey: string) =>
    http<SpinResponse>('/game/spin', { method: 'POST', token, body: JSON.stringify({ bet, idempotencyKey }) }),
  bonusPick: (token: string, roundId: string, targetIndex: number, idempotencyKey: string) =>
    http<BonusPickResponse>('/game/bonus/pick', { method: 'POST', token, body: JSON.stringify({ roundId, targetIndex, idempotencyKey }) }),
  balance: (token: string) => http<{ balance: number }>('/game/balance', { token }),
  history: (token: string, limit = 50) => http<{ rounds: HistoryEntry[] }>(`/game/history?limit=${limit}`, { token }),
  config: () => http<PublicConfig>('/game/config'),
  health: () => http<{ status: string }>('/health'),
};
