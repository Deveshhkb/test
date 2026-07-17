/** Random helpers. A pluggable source enables deterministic tests. */

export type RandomSource = () => number;

let source: RandomSource = Math.random;

export function setRandomSource(fn: RandomSource): void {
  source = fn;
}

export function random(): number {
  return source();
}

export function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function randomPick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

export function chance(probability: number): boolean {
  return random() < probability;
}

/** Pick an index from a list of weights, proportionally. */
export function weightedIndex(weights: readonly number[]): number {
  let total = 0;
  for (const w of weights) total += w;
  let roll = random() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll < 0) return i;
  }
  return weights.length - 1;
}

/** Simple seeded PRNG (mulberry32) for reproducible tests. */
export function mulberry32(seed: number): RandomSource {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
