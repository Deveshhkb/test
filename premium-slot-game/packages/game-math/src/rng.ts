/** Random source abstraction. Server uses crypto; tests use a seeded generator. */
export interface Rng {
  /** Uniform integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
}

/** Deterministic Mulberry32 generator for tests and simulations only. */
export class SeededRng implements Rng {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }
}

/** Replays a fixed list of integers (mod range) – used to force exact outcomes in tests. */
export class SequenceRng implements Rng {
  private i = 0;
  constructor(private readonly values: number[], private readonly fallback: Rng = new SeededRng(1)) {}
  int(maxExclusive: number): number {
    if (this.i < this.values.length) return this.values[this.i++] % maxExclusive;
    return this.fallback.int(maxExclusive);
  }
}

export function weightedPick<T extends string>(rng: Rng, weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  let total = 0;
  for (const [, w] of entries) total += w;
  let roll = rng.int(total);
  for (const [k, w] of entries) {
    if (roll < w) return k;
    roll -= w;
  }
  return entries[entries.length - 1][0];
}

export function weightedPickIndex(rng: Rng, weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng.int(total);
  for (let i = 0; i < weights.length; i++) {
    if (roll < weights[i]) return i;
    roll -= weights[i];
  }
  return weights.length - 1;
}
