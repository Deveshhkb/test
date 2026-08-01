/**
 * All round-loop and flight-feel tuning lives here — never inline in code.
 * Designers change the feel of the game from this single file.
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

/** Playfield margins in CSS pixels — the region the curve lives in. */
export const PLAYFIELD_CONFIG = {
  padLeft: 70,
  padRight: 60,
  padTop: 120,
  padBottom: 90,
} as const;

/** Cinematic camera behaviour. */
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
