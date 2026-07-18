import axios, { AxiosError, type AxiosInstance } from 'axios';

/**
 * Axios instance for a real backend. The base URL is configurable via
 * VITE_API_URL; when unreachable, gameApi transparently falls back to the
 * in-memory mock server.
 */

export const API_TIMEOUT_MS = 8000;

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

/** Session issued by POST /login; sent with every subsequent request. */
let sessionId: string | null = null;

export function setSessionId(id: string | null): void {
  sessionId = id;
}

apiClient.interceptors.request.use((config) => {
  if (sessionId) config.headers.set('x-session-id', sessionId);
  return config;
});

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'NETWORK'
      | 'TIMEOUT'
      | 'INVALID_RESPONSE'
      | 'SERVER'
      | 'INSUFFICIENT_FUNDS'
      | 'UNKNOWN',
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED') return new ApiError('Request timed out', 'TIMEOUT');
    if (!error.response) return new ApiError('Network unreachable', 'NETWORK');
    const serverCode = (error.response.data as { error?: string } | undefined)?.error;
    if (serverCode === 'INSUFFICIENT_FUNDS') {
      return new ApiError('Insufficient funds', 'INSUFFICIENT_FUNDS');
    }
    return new ApiError(`Server error (${error.response.status})`, 'SERVER');
  }
  if (error instanceof Error) {
    if (error.message === 'INSUFFICIENT_FUNDS') {
      return new ApiError('Insufficient funds', 'INSUFFICIENT_FUNDS');
    }
    return new ApiError(error.message, 'UNKNOWN');
  }
  return new ApiError('Unknown error', 'UNKNOWN');
}
