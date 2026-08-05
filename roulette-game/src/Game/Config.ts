import {
  BetType,
  GameConfig,
  PartialGameConfig,
  RoundMode,
  SoundId,
  Theme,
  WheelType,
} from '../Types';
import { deepClone, deepMerge } from '../Utilities/Helpers';

/**
 * Default configuration and the theme registry.
 *
 * Every number a operator or maths team would want to tune is here; no gameplay
 * value is hard-coded anywhere else in the engine. `createConfig()` deep-merges
 * a caller's partial over these defaults, so a host can override a single field
 * (`{ timing: { bettingDuration: 20 } }`) without restating the rest.
 */

/* ------------------------------------------------------------------------- */
/* Payouts - expressed as "to 1" odds                                         */
/* ------------------------------------------------------------------------- */

export const DEFAULT_PAYOUTS: Record<BetType, number> = {
  [BetType.STRAIGHT_UP]: 35,
  [BetType.SPLIT]: 17,
  [BetType.STREET]: 11,
  [BetType.CORNER]: 8,
  [BetType.SIX_LINE]: 5,
  [BetType.TRIO]: 11,
  [BetType.BASKET]: 8,
  [BetType.COLUMN]: 2,
  [BetType.DOZEN]: 2,
  [BetType.RED]: 1,
  [BetType.BLACK]: 1,
  [BetType.ODD]: 1,
  [BetType.EVEN]: 1,
  [BetType.LOW]: 1,
  [BetType.HIGH]: 1,
};

/* ------------------------------------------------------------------------- */
/* Themes                                                                     */
/* ------------------------------------------------------------------------- */

/**
 * The default look, sampled directly from the reference client: bright olive
 * felt, blood-red and near-black cells, white printing, dark navy action
 * housing and a cyan bet glow.
 *
 * Values are medians taken from flat areas of the reference frames rather than
 * eyeballed, so the felt reads at the same luminance and the cells sit at the
 * same saturation.
 */
export const CLASSIC_THEME: Theme = {
  name: 'classic',
  // Felt is vignetted: bright in the middle, falling off at the edges.
  backgroundTop: 0x508210,
  backgroundBottom: 0x2c5a06,
  feltPrimary: 0x46770f,
  feltSecondary: 0x3d6e0a,
  feltLine: 0xffffff,
  red: 0x9f0006,
  black: 0x070a00,
  green: 0x109b1c,
  gold: 0xe8c96a,
  goldDark: 0x9a7b32,
  wood: 0x6b3f22,
  woodDark: 0x3a2113,
  metal: 0xbfc6cc,
  text: 0xffffff,
  textMuted: 0xc9d6b4,
  panel: 0x161332,
  panelBorder: 0x3a3466,
  highlight: 0xffe9a8,
  danger: 0xe23c3c,
  success: 0x3ddc84,
  topBar: 0x395616,
  bottomBar: 0x000000,
  actionBar: 0x161332,
  // Additive cyan: over a red cell it reads pale pink, over black it stays
  // cyan. One sprite, two apparent colours - exactly what the reference does.
  betGlow: 0x35e5e0,
  winWedge: 0xffd54a,
};

/** High-contrast midnight blue variant. */
export const MIDNIGHT_THEME: Theme = {
  ...CLASSIC_THEME,
  name: 'midnight',
  topBar: 0x0f2140,
  bottomBar: 0x03060d,
  actionBar: 0x101a33,
  backgroundTop: 0x0b1526,
  backgroundBottom: 0x03070f,
  feltPrimary: 0x14305c,
  feltSecondary: 0x0d2044,
  feltLine: 0x8fb6ff,
  green: 0x1a9c6b,
  gold: 0x8fb6ff,
  goldDark: 0x3f5f96,
  wood: 0x263a5c,
  woodDark: 0x14213a,
  panel: 0x081222,
  panelBorder: 0x1b2f4d,
  highlight: 0xd6e6ff,
};

/** Warm, low-luminance variant for long sessions. */
export const NOIR_THEME: Theme = {
  ...CLASSIC_THEME,
  name: 'noir',
  topBar: 0x2a1e18,
  bottomBar: 0x070605,
  actionBar: 0x1a1512,
  backgroundTop: 0x1a1614,
  backgroundBottom: 0x070605,
  feltPrimary: 0x3a2a22,
  feltSecondary: 0x2a1e18,
  feltLine: 0xc8a56a,
  red: 0xa81f2d,
  black: 0x0f0d0c,
  green: 0x2f7a4f,
  wood: 0x4a2c18,
  woodDark: 0x27170d,
  panel: 0x120f0d,
  panelBorder: 0x2e2620,
};

export const THEMES: Readonly<Record<string, Theme>> = {
  classic: CLASSIC_THEME,
  midnight: MIDNIGHT_THEME,
  noir: NOIR_THEME,
};

export function resolveTheme(theme: string | Theme): Theme {
  if (typeof theme !== 'string') return theme;
  return THEMES[theme] ?? CLASSIC_THEME;
}

/* ------------------------------------------------------------------------- */
/* Default configuration                                                      */
/* ------------------------------------------------------------------------- */

export const DEFAULT_CONFIG: GameConfig = {
  wheel: {
    type: WheelType.EUROPEAN,
    // A live wheel idles at roughly one revolution every three seconds; it
    // never stops between rounds, which is what sells the physicality.
    wheelSpeed: -0.33,
    wheelSpinSpeed: -0.62,
    wheelAccelerationTime: 2.2,
    // The ball runs opposite the wheel at ~2.4 rev/s off the launch.
    ballSpeed: 2.4,
    ballTrackDuration: 5.6,
    ballDropDuration: 3.4,
    ballBounces: 4,
  },
  timing: {
    // The reference client is player-driven: no countdown, the felt stays open
    // until SPIN is pressed. Switch to AUTO for a live-dealer style round.
    mode: RoundMode.MANUAL,
    bettingDuration: 25,
    lastCallThreshold: 5,
    preSpinDelay: 0.9,
    winnerHoldDuration: 2.4,
    payoutDuration: 2.2,
    resultDuration: 2.6,
  },
  betting: {
    // The reference table runs $1 to $100, so the ladder spans that range.
    // Gold first, because the $1 chip is the one a player sees most.
    chips: [
      { value: 1, color: 0xe8a83a, accent: 0xa9701a, label: '1' },
      { value: 5, color: 0xd0342c, accent: 0x8c1f1a, label: '5' },
      { value: 10, color: 0x2e7d32, accent: 0x1b4d1f, label: '10' },
      { value: 25, color: 0x1e5fb0, accent: 0x0f3a70, label: '25' },
      { value: 50, color: 0x6a1b9a, accent: 0x3d0f59, label: '50' },
      { value: 100, color: 0x1e1e1e, accent: 0x5a5a5a, label: '100' },
    ],
    minBet: 1,
    maxBet: 100,
    maxTotalBet: 5000,
    limits: {
      [BetType.STRAIGHT_UP]: { min: 1, max: 100 },
      [BetType.SPLIT]: { min: 1, max: 200 },
      [BetType.STREET]: { min: 1, max: 300 },
      [BetType.CORNER]: { min: 1, max: 400 },
      [BetType.SIX_LINE]: { min: 1, max: 600 },
    },
    payouts: { ...DEFAULT_PAYOUTS },
  },
  audio: {
    enabled: true,
    muted: false,
    masterVolume: 0.8,
    musicVolume: 0.35,
    sfxVolume: 1,
    sources: {} as Partial<Record<SoundId, string>>,
  },
  render: {
    resolution: undefined,
    maxResolution: 2,
    antialias: true,
    maxFPS: 0,
    backgroundAlpha: 1,
    showStats: false,
    highPerformance: true,
  },
  network: {
    serverDriven: false,
    startingBalance: 100000,
    currency: '$',
    seed: undefined,
  },
  theme: 'classic',
  language: 'en',
  assetBaseUrl: '',
  debug: false,
};

/** Build a fully-populated config from an optional partial override. */
export function createConfig(overrides?: PartialGameConfig): GameConfig {
  const base = deepClone(DEFAULT_CONFIG);
  if (!overrides) return base;
  return deepMerge(base, overrides);
}

/** Apply a partial patch to an existing config, returning a new object. */
export function mergeConfig(current: GameConfig, patch: PartialGameConfig): GameConfig {
  return deepMerge(deepClone(current), patch);
}
