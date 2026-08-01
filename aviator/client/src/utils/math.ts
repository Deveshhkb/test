/** Small math helpers used across the engine. Pure functions, unit-testable. */

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * Frame-rate independent exponential smoothing.
 * `smoothness` is the fraction remaining after one second, so the feel is
 * identical at 60Hz and 120Hz — critical for camera follow and HUD easing.
 */
export function damp(from: number, to: number, smoothness: number, dt: number): number {
  return lerp(from, to, 1 - Math.pow(smoothness, dt));
}

export function inverseLerp(from: number, to: number, value: number): number {
  return from === to ? 0 : clamp((value - from) / (to - from), 0, 1);
}
