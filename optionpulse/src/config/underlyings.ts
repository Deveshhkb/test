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

/**
 * Values below were reconciled against the Angel One instrument master
 * (OpenAPIScripMaster.json) rather than assumed. Re-check them whenever the
 * exchanges change contract specifications - `npm run verify:contracts`
 * compares this file against the live master and reports any drift.
 */
export const UNDERLYINGS: Record<UnderlyingSymbol, UnderlyingConfig> = {
  NIFTY: {
    symbol: "NIFTY",
    name: "NIFTY 50",
    shortName: "NIFTY",
    exchange: "NSE",
    strikeInterval: 50,
    lotSize: 65,
    weeklyExpiryWeekday: 2, // Tuesday
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
    weeklyExpiryWeekday: 2, // Tuesday (monthly only - no weekly series)
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
    weeklyExpiryWeekday: 4, // Thursday
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
 * These values are configuration, not market truth.
 */
export const CONTRACT_SPEC_NOTE =
  "Contract specs are configuration, reconciled against the broker instrument master. Re-verify after any exchange circular.";

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function expiryWeekdayName(symbol: UnderlyingSymbol): string {
  return WEEKDAY_NAMES[getUnderlyingConfig(symbol).weeklyExpiryWeekday] ?? "Unknown";
}
