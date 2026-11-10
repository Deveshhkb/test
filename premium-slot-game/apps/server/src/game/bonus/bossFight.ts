import type { GameConfig } from '@neon/game-math';
import { toPublicBossFight, type PublicBossFight } from '@neon/shared';
import type { RoundRecord } from '../../store/types';

export function publicBossFightFor(config: GameConfig, round: RoundRecord): PublicBossFight | null {
  const bf = round.outcome.bossFight;
  if (!bf) return null;
  return toPublicBossFight(round.id, round.bet, config.bossFight, bf, round.bonusPicks);
}
