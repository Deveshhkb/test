/**
 * Small, allocation-free maths helpers.
 *
 * Every function here is called from the ticker or from tween `onUpdate`
 * callbacks, so none of them allocate objects or closures.
 */

export const TAU = Math.PI * 2;
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Inverse lerp, clamped to [0,1]. Returns 0 when the range is degenerate. */
export function inverseLerp(a: number, b: number, value: number): number {
  if (a === b) return 0;
  return clamp((value - a) / (b - a), 0, 1);
}

/** Remap `value` from one range to another, clamped to the destination range. */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return lerp(outMin, outMax, inverseLerp(inMin, inMax, value));
}

/** Normalise an angle into [0, TAU). */
export function normalizeAngle(angle: number): number {
  const wrapped = angle % TAU;
  return wrapped < 0 ? wrapped + TAU : wrapped;
}

/** Shortest signed delta from `from` to `to`, in (-PI, PI]. */
export function shortestAngleDelta(from: number, to: number): number {
  let delta = normalizeAngle(to - from);
  if (delta > Math.PI) delta -= TAU;
  return delta;
}

/**
 * Smallest non-negative delta that takes `from` to `to` travelling in the
 * given direction. Used to solve for the ball's remaining travel so it lands
 * in an exact pocket without ever appearing to snap.
 */
export function directedAngleDelta(from: number, to: number, direction: 1 | -1): number {
  const delta = normalizeAngle(direction === 1 ? to - from : from - to);
  return direction === 1 ? delta : -delta;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = inverseLerp(edge0, edge1, x);
  return t * t * (3 - 2 * t);
}

/** Exponential approach - frame-rate independent damping. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function pointInRect(
  px: number,
  py: number,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  return px >= x && px <= x + width && py >= y && py <= y + height;
}

/**
 * Mulberry32 - a small, fast, seedable PRNG.
 *
 * Used for client-side round outcomes when the engine is not server driven,
 * and for cosmetic randomness (bounce jitter) everywhere. A seedable generator
 * means a QA failure can be replayed exactly.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return function random(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max] inclusive, drawn from the supplied generator. */
export function randomInt(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

export function randomRange(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}

/**
 * Damped-bounce curve on [0,1] returning the ball's height above the track as
 * it drops. Produces `bounces` decaying arcs, ending exactly at 0.
 */
export function bounceEnvelope(t: number, bounces: number, decay: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 0;
  const phase = t * bounces * Math.PI;
  return Math.abs(Math.sin(phase)) * Math.pow(1 - t, decay);
}
