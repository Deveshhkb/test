import { DEFAULT_CONFIG, type GameConfig, type SymbolId } from '@neon/game-math';
import { createApp } from '../src/app';
import { createMemoryCache, type Cache } from '../src/services/cache';
import { createMemoryStore } from '../src/store/memoryStore';

export const INITIAL = 12_560_000;

export function makeApp(opts: { config?: GameConfig; initialBalance?: number; cache?: Cache } = {}) {
  const store = createMemoryStore();
  const cache = opts.cache ?? createMemoryCache();
  const config = opts.config ?? DEFAULT_CONFIG;
  const built = createApp({ store, cache, config, jwtSecret: 'test-secret', initialBalance: opts.initialBalance ?? INITIAL });
  return { ...built, store, cache, config };
}

/** Config with one symbol heavily weighted on every reel (forces features for tests). */
export function forcedConfig(symbol: SymbolId, weight = 5000): GameConfig {
  const bump = (w: Record<SymbolId, number>) => ({ ...w, [symbol]: weight });
  return { ...DEFAULT_CONFIG, baseWeights: DEFAULT_CONFIG.baseWeights.map(bump), freeSpinWeights: DEFAULT_CONFIG.freeSpinWeights.map((w) => ({ ...w, SCATTER: 0 })) };
}

let n = 0;
export const key = () => `test-key-${Date.now()}-${n++}`;
