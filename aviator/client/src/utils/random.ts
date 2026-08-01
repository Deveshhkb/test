import { ROUND_CONFIG } from '@/config/flight';

/**
 * Crash-point sampling and deterministic RNG.
 *
 * The distribution is the industry-standard inverse-uniform curve:
 *   m = (1 − houseEdge) / u,   u ∈ (0, 1]
 * which gives P(crash ≥ x) = (1 − houseEdge) / x — i.e. a 97% RTP at a 3%
 * edge, with ~4% of rounds crashing instantly at 1.00×. The server's
 * provably-fair round engine (backend phase) uses this exact formula with
 * hash-derived `u`; the client uses it locally only until then.
 */

/** Sample a crash multiplier, floored to cents, clamped to [1, max]. */
export function sampleCrashMultiplier(
  random: () => number = Math.random,
  houseEdge: number = ROUND_CONFIG.houseEdge,
  maxMultiplier: number = ROUND_CONFIG.maxMultiplier,
): number {
  // `random()` is [0, 1); flip it so u is (0, 1] and division is safe.
  const u = 1 - random();
  const raw = (1 - houseEdge) / u;
  const floored = Math.floor(raw * 100) / 100;
  return Math.min(maxMultiplier, Math.max(1, floored));
}

/**
 * mulberry32 — small, fast, seedable PRNG. Used for deterministic unit
 * tests and for visual variation that must be reproducible (e.g. star
 * fields regenerated identically after a context loss).
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
