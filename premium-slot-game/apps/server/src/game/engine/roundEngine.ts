import { playRound, type FreeSpinsState, type GameConfig, type Rng, type RoundOutcome } from '@neon/game-math';

/** Server-side wrapper around the shared math engine. The only place outcomes are generated. */
export class RoundEngine {
  constructor(
    private readonly config: GameConfig,
    private readonly rng: Rng,
  ) {}

  play(bet: number, freeSpins: FreeSpinsState | null): RoundOutcome {
    return playRound({ config: this.config, rng: this.rng, bet, freeSpins });
  }
}
