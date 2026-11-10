import type { GameConfig } from '@neon/game-math';

export function isValidBet(config: GameConfig, bet: number): boolean {
  return Number.isInteger(bet) && config.betLevels.includes(bet);
}
