/**
 * Device-adaptive quality presets.
 *
 * One knob ("tier") drives every expensive rendering decision so effects
 * added in later phases (bloom, particles, motion blur) scale together.
 * Detection is heuristic on purpose: it only picks the *starting* tier —
 * a runtime FPS governor can still demote a struggling device later.
 */
export type QualityTier = 'low' | 'medium' | 'high' | 'ultra';

export interface QualitySettings {
  tier: QualityTier;
  /** Device-pixel-ratio cap. Rendering at DPR 3+ wastes fill-rate. */
  maxResolution: number;
  antialias: boolean;
  /** Global multiplier applied to every particle emitter's spawn rate. */
  particleDensity: number;
  /** Post-processing (bloom, blur, chromatic aberration) master switch. */
  postProcessing: boolean;
  /** Target frame rate hint for the ticker (0 = uncapped / display rate). */
  targetFPS: number;
}

const PRESETS: Record<QualityTier, QualitySettings> = {
  low: {
    tier: 'low',
    maxResolution: 1,
    antialias: false,
    particleDensity: 0.35,
    postProcessing: false,
    targetFPS: 60,
  },
  medium: {
    tier: 'medium',
    maxResolution: 1.5,
    antialias: true,
    particleDensity: 0.65,
    postProcessing: false,
    targetFPS: 60,
  },
  high: {
    tier: 'high',
    maxResolution: 2,
    antialias: true,
    particleDensity: 1,
    postProcessing: true,
    targetFPS: 0,
  },
  ultra: {
    tier: 'ultra',
    maxResolution: 2,
    antialias: true,
    particleDensity: 1.25,
    postProcessing: true,
    targetFPS: 0,
  },
};

export function getQualitySettings(tier: QualityTier): QualitySettings {
  return PRESETS[tier];
}

/** Heuristic starting tier based on cheap, synchronous device signals. */
export function detectQualityTier(): QualityTier {
  if (typeof navigator === 'undefined') return 'medium';

  const cores = navigator.hardwareConcurrency ?? 4;
  // Non-standard but widely available on Android Chrome, where it matters most.
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  if (isMobile) {
    if (memory <= 2 || cores <= 4) return 'low';
    if (memory <= 4 || cores <= 6) return 'medium';
    return 'high';
  }
  if (cores <= 4 || memory <= 4) return 'medium';
  if (cores >= 12 && memory >= 8) return 'ultra';
  return 'high';
}
