import { clamp } from '@/utils/math';

/**
 * All round-loop and flight-feel tuning lives here — never inline in code.
 * Everything spatial is expressed as viewport-relative resolvers, not fixed
 * pixels, so a 320px phone and a 4K monitor both get proportionate layout.
 */

/** Timing and math of the round lifecycle. */
export const ROUND_CONFIG = {
  waitingSeconds: 1.0,
  bettingSeconds: 5.0,
  countdownSeconds: 3,
  takeoffSeconds: 1.4,
  crashSeconds: 2.4,
  resultSeconds: 1.8,
  resetSeconds: 0.8,
  /**
   * Exponential multiplier growth: m(t) = e^(growthRate · t).
   * 0.11 ⇒ 2.00× at ~6.3s, 10× at ~21s — the classic crash-game pacing.
   */
  growthRate: 0.11,
  /** House edge used by the crash-point distribution (3%). */
  houseEdge: 0.03,
  /** Hard ceiling; a round that reaches this cashes out the sky itself. */
  maxMultiplier: 5000,
} as const;

/**
 * Flight path shape, in playfield fractions (0..1).
 * The plane eases toward a cruise point with two different time constants —
 * it gains ground speed before altitude, which is what makes the takeoff
 * read as a heavy aircraft rotating off a runway rather than an elevator.
 */
export const FLIGHT_CONFIG = {
  cruiseX: 0.66,
  cruiseY: 0.6,
  /** Horizontal easing time constant (seconds). */
  tauX: 3.4,
  /** Vertical easing time constant — larger, so lift lags ground speed. */
  tauY: 5.2,
  /** Cruise bobbing: amplitude (playfield fraction) and frequency (Hz). */
  bobAmplitude: 0.045,
  bobFrequency: 0.85,
  /** Seconds over which bobbing ramps in after takeoff. */
  bobRampSeconds: 4,
} as const;

/** Cinematic camera behaviour (all viewport-relative). */
export const CAMERA_CONFIG = {
  /** Fraction of the viewport height above which the camera pans to keep the plane framed. */
  frameTop: 0.28,
  /** Fraction of the viewport width beyond which the camera pans right. */
  frameRight: 0.74,
  /** Exponential smoothing (fraction remaining after 1s) for pan / zoom. */
  panSmoothness: 0.02,
  zoomSmoothness: 0.05,
  /** How far the camera zooms out at full speed (1 → no zoom). */
  maxZoomOut: 0.1,
  /** Trauma decay per second; shake amplitude as a fraction of viewport. */
  traumaDecay: 1.4,
  shakeAmplitude: 0.018,
  shakeRotation: 0.012,
} as const;

// ---------------------------------------------------------------------------
// Responsive layout resolvers
// ---------------------------------------------------------------------------

/** The rectangle the crash curve flies in, derived from the viewport. */
export interface PlayfieldLayout {
  originX: number;
  originY: number;
  fieldWidth: number;
  fieldHeight: number;
  /** Y of the runway baseline decoration. */
  groundY: number;
}

/**
 * Margins are viewport fractions clamped to sane pixel ranges: on a 320px
 * phone the pads shrink so the curve keeps room to breathe; on 4K they stop
 * growing so the flight area doesn't drown in empty borders.
 */
export function resolvePlayfield(width: number, height: number): PlayfieldLayout {
  const padLeft = clamp(width * 0.06, 28, 96);
  const padRight = clamp(width * 0.05, 20, 84);
  const padTop = clamp(height * 0.18, 64, 220);
  const padBottom = clamp(height * 0.12, 48, 150);

  const originX = padLeft;
  const originY = height - padBottom;
  return {
    originX,
    originY,
    fieldWidth: Math.max(1, width - padLeft - padRight),
    fieldHeight: Math.max(1, height - padTop - padBottom),
    groundY: originY + clamp(height * 0.03, 16, 34),
  };
}

/**
 * Uniform scale for in-canvas UI text (multiplier, countdown). Driven by
 * the *smaller* viewport dimension so portrait phones and landscape phones
 * agree, and allowed to grow on 4K instead of capping at desktop size.
 */
export function resolveUiScale(width: number, height: number): number {
  return clamp(Math.min(width, height) / 850, 0.5, 2.3);
}

/** Plane sprite scale — same driver as UI so the composition holds. */
export function resolvePlaneScale(width: number, height: number): number {
  return clamp(Math.min(width, height) / 850, 0.45, 1.7);
}

/**
 * Screen anchor of the big multiplier readout. In portrait the flight area
 * is tall and narrow, so the readout sits higher to clear the curve's apex.
 */
export function resolveMultiplierAnchor(
  width: number,
  height: number,
): { x: number; y: number } {
  const portrait = height > width;
  return { x: width / 2, y: height * (portrait ? 0.18 : 0.3) };
}
