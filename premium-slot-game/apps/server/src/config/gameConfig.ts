import { DEFAULT_CONFIG, type GameConfig } from '@neon/game-math';

/**
 * The authoritative game configuration. Overrides can be supplied as JSON through
 * GAME_CONFIG_OVERRIDES (shallow merge) for operators/testing.
 */
export function loadGameConfig(src: NodeJS.ProcessEnv = process.env): GameConfig {
  if (!src.GAME_CONFIG_OVERRIDES) return DEFAULT_CONFIG;
  const overrides = JSON.parse(src.GAME_CONFIG_OVERRIDES) as Partial<GameConfig>;
  return { ...DEFAULT_CONFIG, ...overrides };
}
