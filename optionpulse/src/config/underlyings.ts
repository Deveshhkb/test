import type { UnderlyingSymbol } from "../types/market";

/**
 * Per-underlying contract specification. Every strike-ladder, ATM and lot-size
 * calculation reads from here so none of those numbers are hardcoded in the UI.
 */
export interface UnderlyingConfig {
  symbol: UnderlyingSymbol;
  name: string;
  shortName: string;
  exchange: "NSE" | "BSE";
  /** Distance between consecutive listed strikes. */
  strikeInterval: number;
  /** Contract multiplier used by the strategy builder. */
  lotSize: number;
  /** 0 = Monday ... 6 = Sunday. Weekly expiry day for the index. */
  weeklyExpiryWeekday: number;
  /** Some indices no longer list weekly expiries. */
  hasWeeklyExpiry: boolean;
  /** How many strikes either side of ATM a full chain typically publishes. */
  defaultStrikeDepth: number;
}

export const UNDERLYINGS: Record<UnderlyingSymbol, UnderlyingConfig> = {
  NIFTY: {
    symbol: "NIFTY",
    name: "NIFTY 50",
    shortName: "NIFTY",
    exchange: "NSE",
    strikeInterval: 50,
    lotSize: 75,
    weeklyExpiryWeekday: 4, // Thursday
    hasWeeklyExpiry: true,
    defaultStrikeDepth: 30,
  },
  BANKNIFTY: {
    symbol: "BANKNIFTY",
    name: "BANK NIFTY",
    shortName: "BANKNIFTY",
    exchange: "NSE",
    strikeInterval: 100,
    lotSize: 30,
    weeklyExpiryWeekday: 4,
    hasWeeklyExpiry: false,
    defaultStrikeDepth: 30,
  },
  SENSEX: {
    symbol: "SENSEX",
    name: "SENSEX",
    shortName: "SENSEX",
    exchange: "BSE",
    strikeInterval: 100,
    lotSize: 20,
    weeklyExpiryWeekday: 2, // Tuesday
    hasWeeklyExpiry: true,
    defaultStrikeDepth: 30,
  },
};

export const UNDERLYING_LIST: UnderlyingConfig[] = Object.values(UNDERLYINGS);

export function getUnderlyingConfig(symbol: UnderlyingSymbol): UnderlyingConfig {
  const config = UNDERLYINGS[symbol];
  if (!config) {
    throw new Error(`Unknown underlying: ${symbol}`);
  }
  return config;
}

/**
 * Contract specifications change from time to time (lot sizes in particular).
 * These values are configuration, not market truth - verify them against the
 * exchange circular before wiring a live provider.
 */
export const CONTRACT_SPEC_NOTE =
  "Strike intervals and lot sizes are configuration values. Verify against the current exchange circular before live use.";
