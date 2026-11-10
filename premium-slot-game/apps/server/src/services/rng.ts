import { randomInt } from 'node:crypto';
import type { Rng } from '@neon/game-math';

/** Cryptographically secure RNG (node:crypto.randomInt, rejection sampling, no modulo bias). */
export class CryptoRng implements Rng {
  int(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) throw new Error('maxExclusive must be a positive integer');
    return randomInt(0, maxExclusive);
  }
}
