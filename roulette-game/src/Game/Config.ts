import {
  BetType,
  GameConfig,
  PartialGameConfig,
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
 * The default look: deep green felt, brushed gold furniture, mahogany wheel -
 * the palette live-casino studios light their tables for.
 */
export const CLASSIC_THEME: Theme = {
  name: 'classic',
  backgroundTop: 0x0d1f18,
  backgroundBottom: 0x040a07,
  feltPrimary: 0x0f5132,
  feltSecondary: 0x0a3d26,
  feltLine: 0xd9c17a,
  red: 0xc8102e,
  black: 0x14181c,
  green: 0x0f8a4a,
  gold: 0xe8c96a,
  goldDark: 0x9a7b32,
  wood: 0x6b3f22,
  woodDark: 0x3a2113,
  metal: 0xbfc6cc,
  text: 0xf5f1e6,
  textMuted: 0x9aa5a0,
  panel: 0x0b1a14,
  panelBorder: 0x1d3a2c,
  highlight: 0xffe9a8,
  danger: 0xe23c3c,
  success: 0x3ddc84,
};

/** High-contrast midnight blue variant. */
export const MIDNIGHT_THEME: Theme = {
  ...CLASSIC_THEME,
  name: 'midnight',
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
    bettingDuration: 25,
    lastCallThreshold: 5,
    preSpinDelay: 0.9,
    winnerHoldDuration: 2.4,
    payoutDuration: 2.2,
    resultDuration: 2.6,
  },
  betting: {
    chips: [
      { value: 1, color: 0xf2f2f2, accent: 0x9aa0a6, label: '1' },
      { value: 5, color: 0xd0342c, accent: 0x8c1f1a, label: '5' },
      { value: 25, color: 0x2e7d32, accent: 0x1b4d1f, label: '25' },
      { value: 100, color: 0x1e1e1e, accent: 0x4a4a4a, label: '100' },
      { value: 500, color: 0x6a1b9a, accent: 0x3d0f59, label: '500' },
      { value: 1000, color: 0xf9a825, accent: 0xa96f00, label: '1K' },
      { value: 5000, color: 0x0277bd, accent: 0x014a75, label: '5K' },
    ],
    minBet: 1,
    maxBet: 5000,
    maxTotalBet: 50000,
    limits: {
      [BetType.STRAIGHT_UP]: { min: 1, max: 500 },
      [BetType.SPLIT]: { min: 1, max: 1000 },
      [BetType.STREET]: { min: 1, max: 1500 },
      [BetType.CORNER]: { min: 1, max: 2000 },
      [BetType.SIX_LINE]: { min: 1, max: 3000 },
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
    startingBalance: 10000,
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
