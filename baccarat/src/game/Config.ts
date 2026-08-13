import { BetType, type BetLimit } from "./types";
import { Palette } from "./Constants";

/**
 * Every tunable in the game lives here. `BaccaratGame.updateConfig()` accepts a
 * `DeepPartial<GameConfig>` at any time, so an operator can change limits,
 * payouts, timings or theme without touching a line of engine code.
 */

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly (infer U)[]
    ? readonly U[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

export interface ChipDefinition {
  readonly value: number;
  /** Short label rendered on the chip face, e.g. `1K`, `2.5M`. */
  readonly label: string;
  readonly color: number;
  readonly accent: number;
  /** Optional texture key; falls back to the procedural chip renderer. */
  readonly texture?: string;
}

export interface PayoutTable {
  /** Net odds to 1. Player 1:1, Tie 8:1, etc. */
  readonly [BetType.Player]: number;
  readonly [BetType.Banker]: number;
  readonly [BetType.Tie]: number;
  readonly [BetType.PlayerPair]: number;
  readonly [BetType.BankerPair]: number;
  readonly [BetType.Natural]: number;
  /** Perfect pair pays the "perfect" odds; a mixed pair pays `perfectPairMixed`. */
  readonly [BetType.PerfectPair]: number;
}

/**
 * Every player-visible string. Swapping this object localises the whole game —
 * no text is hard-coded in a display object.
 */
export interface StringsConfig {
  readonly player: string;
  readonly banker: string;
  readonly tie: string;
  readonly playerPair: string;
  readonly bankerPair: string;
  readonly perfectPair: string;
  readonly natural: string;
  readonly min: string;
  readonly max: string;
  readonly cash: string;
  readonly totalBet: string;
  /** Short form used when the status bar is narrow. */
  readonly totalBetShort: string;
  readonly clearBet: string;
  readonly deal: string;
  readonly history: string;
  readonly undo: string;
  readonly repeat: string;
  readonly double: string;
  readonly placeYourBets: string;
  readonly betsClosed: string;
  readonly dealing: string;
  readonly playerWins: string;
  readonly bankerWins: string;
  readonly tieWins: string;
  readonly naturalTag: string;
  readonly push: string;
  readonly results: string;
  readonly noBet: string;
}

export interface RuleConfig {
  /** Commission withheld from a winning banker bet (0.05 = 5%). */
  readonly bankerCommission: number;
  /** When true a banker win on 6 pays 1:2 and takes no commission (EZ style). */
  readonly noCommission: boolean;
  /** Payout on a banker win with total 6 under `noCommission`. */
  readonly noCommissionSixPayout: number;
  /** Player/Banker wagers push on a tie when true, otherwise they lose. */
  readonly pushOnTie: boolean;
  /** Odds for a "mixed" perfect pair (same rank, different suit colour). */
  readonly perfectPairMixed: number;
  readonly decks: number;
}

export interface TimingConfig {
  /** Seconds the betting window stays open. */
  readonly bettingSeconds: number;
  /** Seconds the result stays on screen before the table clears. */
  readonly resultSeconds: number;
  /** Seconds between rounds. */
  readonly waitingSeconds: number;
  /** Below this many seconds the timer turns red and pulses. */
  readonly urgentSeconds: number;
}

export interface AnimationConfig {
  /** Global multiplier — 0.5 is twice as fast. Applied to every timeline. */
  readonly speedMultiplier: number;
  readonly dealDuration: number;
  readonly dealStagger: number;
  readonly flipDuration: number;
  readonly chipFlyDuration: number;
  readonly chipSettleStagger: number;
  readonly winGlowDuration: number;
  readonly loseFadeDuration: number;
  readonly clearDuration: number;
  readonly shuffleDuration: number;
  readonly squeezeDuration: number;
  /** Extra beat held before the third-card decision, for tension. */
  readonly drawDecisionDelay: number;
}

export interface TableConfig {
  /** Design-space width of the felt. */
  readonly width: number;
  readonly height: number;
  /** Horizontal gap between two cards in the same hand. */
  readonly cardSpacing: number;
  /** Extra offset applied to the rotated third card. */
  readonly thirdCardOffset: number;
  readonly thirdCardRotation: number;
  readonly cardScale: number;
  /** Radius of the random scatter applied to chips landing in a spot. */
  readonly chipScatterRadius: number;
  readonly chipStackOffsetY: number;
  readonly maxVisibleChipsPerSpot: number;
}

export interface AudioConfig {
  readonly enabled: boolean;
  readonly muted: boolean;
  readonly masterVolume: number;
  readonly musicVolume: number;
  readonly sfxVolume: number;
  readonly fadeDuration: number;
  /** Base directory for the sound files listed in the manifest. */
  readonly basePath: string;
}

export interface AssetConfig {
  readonly basePath: string;
  /**
   * When true (default) card faces, chips and the felt are generated into a
   * single runtime atlas, so the game boots with zero binary dependencies.
   * Point `atlasUrl` at a real spritesheet to use production art instead.
   */
  readonly useProceduralAtlas: boolean;
  readonly atlasUrl: string | null;
  /** Optional externally supplied textures, keyed by frame name. */
  readonly textures: Readonly<Record<string, string>>;
  readonly sounds: Readonly<Record<string, string>>;
  /** Resolution multiplier used when baking the procedural atlas. */
  readonly atlasResolution: number;
}

export interface ThemeConfig {
  readonly feltDeep: number;
  readonly feltMid: number;
  readonly feltLight: number;
  /** Leather rail around the near edge of the table. */
  readonly rail: number;
  readonly gold: number;
  readonly player: number;
  readonly banker: number;
  readonly tie: number;
  readonly pair: number;
  readonly win: number;
  readonly fontFamily: string;
  readonly numericFontFamily: string;
}

export interface FeatureConfig {
  readonly roadmaps: boolean;
  readonly beadPlate: boolean;
  readonly sidebets: boolean;
  readonly commissionDisplay: boolean;
  readonly squeezeReveal: boolean;
  readonly burnCard: boolean;
  readonly autoRepeatBet: boolean;
  readonly particles: boolean;
  /** Show an FPS / draw-call readout. */
  readonly debugOverlay: boolean;
}

export interface NetworkConfig {
  /** `local` runs the built-in provably-fair RNG shoe. */
  readonly mode: "local" | "remote";
  readonly url: string | null;
  readonly reconnectDelayMs: number;
  readonly maxReconnectAttempts: number;
  /** Client seed for the local RNG; omit for a random shoe each session. */
  readonly seed: string | null;
}

export interface GameConfig {
  readonly tableId: string;
  readonly tableName: string;
  readonly currency: string;
  /** Symbol shown next to money, e.g. `$` or `Rp`. */
  readonly currencySymbol: string;
  /** Decimal places for displayed money. */
  readonly currencyDecimals: number;
  readonly locale: string;
  readonly startingBalance: number;
  /**
   * `manual` is the single-player RNG flow: betting stays open until the player
   * taps Deal. `timed` is the live-table flow driven by a countdown.
   */
  readonly roundMode: "manual" | "timed";
  readonly strings: StringsConfig;
  readonly chips: readonly ChipDefinition[];
  readonly limits: Readonly<Record<BetType, BetLimit>>;
  readonly payouts: PayoutTable;
  readonly rules: RuleConfig;
  readonly timing: TimingConfig;
  readonly animation: AnimationConfig;
  readonly table: TableConfig;
  readonly audio: AudioConfig;
  readonly assets: AssetConfig;
  readonly theme: ThemeConfig;
  readonly features: FeatureConfig;
  readonly network: NetworkConfig;
  /** Pixi renderer knobs. */
  readonly renderer: {
    readonly antialias: boolean;
    readonly powerPreference: "high-performance" | "low-power" | "default";
    readonly maxResolution: number;
    readonly preferWebGPU: boolean;
    readonly targetFps: number;
  };
  readonly logLevel: "silent" | "error" | "warn" | "info" | "debug";
}

export const DEFAULT_CONFIG: GameConfig = {
  tableId: "BAC-01",
  tableName: "Baccarat",
  currency: "USD",
  currencySymbol: "$",
  currencyDecimals: 2,
  locale: "en-US",
  startingBalance: 100_000,
  roundMode: "manual",

  strings: {
    player: "PEMAIN",
    banker: "BANKER",
    tie: "SERI",
    playerPair: "PEMAIN PAIR",
    bankerPair: "BANKER PAIR",
    perfectPair: "PERFECT PAIR",
    natural: "NATURAL",
    min: "MIN",
    max: "MAKS",
    cash: "TUNAI",
    totalBet: "TOTAL TARUHAN",
    totalBetShort: "TARUHAN",
    clearBet: "HAPUS TARUHAN",
    deal: "BAGI KARTU",
    history: "RIWAYAT",
    undo: "URUNGKAN",
    repeat: "ULANGI",
    double: "GANDAKAN",
    placeYourBets: "PASANG TARUHAN ANDA",
    betsClosed: "TARUHAN DITUTUP",
    dealing: "MEMBAGIKAN KARTU",
    playerWins: "PEMAIN MENANG",
    bankerWins: "BANKER MENANG",
    tieWins: "SERI",
    naturalTag: "NATURAL",
    push: "SERI",
    results: "HASIL",
    noBet: "PASANG TARUHAN DULU",
  },

  chips: [
    { value: 1, label: "1", color: 0xf5c542, accent: 0xb8860b },
    { value: 5, label: "5", color: 0xe0413f, accent: 0x7c1b1a },
    { value: 10, label: "10", color: 0x2f7fe0, accent: 0x123a6b },
    { value: 25, label: "25", color: 0x2eb872, accent: 0x114a2c },
    { value: 50, label: "50", color: 0x8a4ad8, accent: 0x3d1a6b },
    { value: 100, label: "100", color: 0x1f1f24, accent: 0x000000 },
  ],

  limits: {
    [BetType.Player]: { min: 1, max: 100 },
    [BetType.Banker]: { min: 1, max: 100 },
    [BetType.Tie]: { min: 1, max: 100 },
    [BetType.PlayerPair]: { min: 1, max: 50 },
    [BetType.BankerPair]: { min: 1, max: 50 },
    [BetType.Natural]: { min: 1, max: 50 },
    [BetType.PerfectPair]: { min: 1, max: 25 },
  },

  payouts: {
    [BetType.Player]: 1,
    // Commission is folded into the odds, exactly as the table sign shows it.
    [BetType.Banker]: 0.95,
    [BetType.Tie]: 8,
    [BetType.PlayerPair]: 11,
    [BetType.BankerPair]: 11,
    [BetType.Natural]: 8,
    [BetType.PerfectPair]: 25,
  },

  rules: {
    // Zero: the 5% is already priced into the 0.95:1 banker payout above.
    bankerCommission: 0,
    noCommission: false,
    noCommissionSixPayout: 0.5,
    pushOnTie: true,
    perfectPairMixed: 5,
    decks: 8,
  },

  timing: {
    bettingSeconds: 15,
    resultSeconds: 5,
    waitingSeconds: 3,
    urgentSeconds: 5,
  },

  animation: {
    speedMultiplier: 1,
    dealDuration: 0.42,
    dealStagger: 0.26,
    flipDuration: 0.34,
    chipFlyDuration: 0.34,
    chipSettleStagger: 0.04,
    winGlowDuration: 0.9,
    loseFadeDuration: 0.45,
    clearDuration: 0.4,
    shuffleDuration: 1.6,
    squeezeDuration: 0.9,
    drawDecisionDelay: 0.55,
  },

  table: {
    width: 1520,
    height: 620,
    cardSpacing: 18,
    thirdCardOffset: 26,
    thirdCardRotation: Math.PI / 2,
    cardScale: 1,
    chipScatterRadius: 26,
    chipStackOffsetY: -7,
    maxVisibleChipsPerSpot: 12,
  },

  audio: {
    enabled: true,
    muted: false,
    masterVolume: 0.8,
    musicVolume: 0.35,
    sfxVolume: 0.9,
    fadeDuration: 0.6,
    basePath: "/assets/audio/",
  },

  assets: {
    basePath: "/assets/",
    useProceduralAtlas: true,
    atlasUrl: null,
    textures: {},
    sounds: {},
    atlasResolution: 2,
  },

  theme: {
    feltDeep: Palette.feltDeep,
    feltMid: Palette.feltMid,
    feltLight: Palette.feltLight,
    rail: Palette.rail,
    gold: Palette.gold,
    player: Palette.player,
    banker: Palette.banker,
    tie: Palette.tie,
    pair: Palette.pair,
    win: Palette.win,
    fontFamily: '"Trebuchet MS", "Segoe UI", Roboto, system-ui, sans-serif',
    numericFontFamily: '"Trebuchet MS", "Segoe UI", Roboto, system-ui, sans-serif',
  },

  features: {
    roadmaps: true,
    beadPlate: true,
    sidebets: false,
    commissionDisplay: false,
    squeezeReveal: true,
    burnCard: true,
    autoRepeatBet: false,
    particles: true,
    debugOverlay: false,
  },

  network: {
    mode: "local",
    url: null,
    reconnectDelayMs: 1500,
    maxReconnectAttempts: 8,
    seed: null,
  },

  renderer: {
    antialias: true,
    powerPreference: "high-performance",
    maxResolution: 2,
    preferWebGPU: false,
    targetFps: 60,
  },

  logLevel: "warn",
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Recursively merges a partial override onto a base config. Arrays are
 * replaced wholesale (a half-merged chip ladder is never what anyone wants).
 */
export function mergeConfig<T>(base: T, override?: DeepPartial<T>): T {
  if (!override) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    if (value === undefined) continue;
    const current = out[key];
    out[key] = isPlainObject(value) && isPlainObject(current) ? mergeConfig(current, value) : value;
  }
  return out as T;
}

export function createConfig(override?: DeepPartial<GameConfig>): GameConfig {
  return mergeConfig(DEFAULT_CONFIG, override);
}
