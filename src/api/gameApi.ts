import type {
  BonusResult,
  GameSettings,
  Grid,
  HistoryEntry,
  LoginResult,
  SpinResult,
} from '@/types';
import { apiClient, ApiError, toApiError } from './client';
import { mockServer } from './mockServer';
import { REEL_COUNT, ROW_COUNT } from '@/constants';

/**
 * Game API service. Tries the real backend first; on network failure it
 * falls back to the mock RGS so the game always runs. Set VITE_API_URL to
 * point at a real backend later — the response contract is identical.
 */

const USE_MOCK_ONLY = import.meta.env.VITE_USE_MOCK !== 'false';
let backendHealthy = !USE_MOCK_ONLY;

function validateSpinResult(data: unknown): SpinResult {
  const result = data as SpinResult;
  if (
    typeof result?.balance !== 'number' ||
    typeof result?.totalWin !== 'number' ||
    !Array.isArray(result?.reels)
  ) {
    throw new ApiError('Malformed spin response', 'INVALID_RESPONSE');
  }
  const grid = result.reels as Grid;
  if (grid.length !== REEL_COUNT || grid.some((col) => col.length !== ROW_COUNT)) {
    throw new ApiError('Malformed reel grid', 'INVALID_RESPONSE');
  }
  return result;
}

async function withFallback<T>(
  real: () => Promise<T>,
  mock: () => Promise<T>,
): Promise<T> {
  if (!backendHealthy) return mock();
  try {
    return await real();
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.code === 'NETWORK' || apiError.code === 'TIMEOUT') {
      backendHealthy = false; // stop hammering a dead backend
      return mock();
    }
    throw apiError;
  }
}

export const gameApi = {
  async login(): Promise<LoginResult> {
    return withFallback(
      async () => (await apiClient.post<LoginResult>('/login')).data,
      () => mockServer.login(),
    );
  },

  async spin(bet: number): Promise<SpinResult> {
    return withFallback(
      async () => validateSpinResult((await apiClient.post('/spin', { bet })).data),
      () => mockServer.spin(bet),
    );
  },

  async bonus(pickedIndex: number): Promise<BonusResult> {
    return withFallback(
      async () => (await apiClient.post<BonusResult>('/bonus', { pickedIndex })).data,
      () => mockServer.bonus(pickedIndex),
    );
  },

  async collect(): Promise<{ balance: number }> {
    return withFallback(
      async () => (await apiClient.post<{ balance: number }>('/collect')).data,
      () => mockServer.collect(),
    );
  },

  async history(): Promise<HistoryEntry[]> {
    return withFallback(
      async () => (await apiClient.get<HistoryEntry[]>('/history')).data,
      () => mockServer.getHistory(),
    );
  },

  async settings(settings: GameSettings): Promise<GameSettings> {
    return withFallback(
      async () => (await apiClient.post<GameSettings>('/settings', settings)).data,
      () => mockServer.saveSettings(settings),
    );
  },
};
