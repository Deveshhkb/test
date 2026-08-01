/** Engine-wide constants. Tuning values live here, never inline in code. */
export const ENGINE_CONFIG = {
  /**
   * Clamp for a single frame's delta time (seconds). After a tab-switch or
   * GC pause the browser can hand us a multi-second delta; simulating it in
   * one step would teleport the plane, so we cap it at ~3 frames of 30fps.
   */
  maxDeltaSeconds: 0.1,
  /** Background color behind the procedural sky (deep night blue). */
  backgroundColor: 0x070b18,
  /** How often the FPS readout is pushed to the React store (ms). */
  fpsReportIntervalMs: 500,
  /** Duration of the crossfade between scenes (seconds). */
  sceneTransitionSeconds: 0.6,
} as const;

/** Virtual design space: scenes lay out against this and scale to fit. */
export const DESIGN_SPACE = {
  width: 1920,
  height: 1080,
} as const;
