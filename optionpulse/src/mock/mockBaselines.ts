import type { UnderlyingSymbol } from "../types/market";

/**
 * Starting levels for the mock generators.
 *
 * THESE ARE NOT MARKET DATA. They are arbitrary reference levels chosen so the
 * simulated series land in a plausible range for Indian indices. Everything the
 * UI renders in mock mode is generated from these by a seeded random walk, and
 * is labelled MOCK DATA throughout.
 */
export interface MockBaseline {
  base: number;
  /** Annualised volatility used by the simulated price path. */
  annualVolatility: number;
  /** Typical per-candle volume, in index "units" for the simulated series. */
  baseVolume: number;
}

export const MOCK_BASELINES: Record<UnderlyingSymbol, MockBaseline> = {
  NIFTY: { base: 25_900, annualVolatility: 0.13, baseVolume: 180_000 },
  BANKNIFTY: { base: 58_400, annualVolatility: 0.16, baseVolume: 120_000 },
  SENSEX: { base: 84_700, annualVolatility: 0.12, baseVolume: 90_000 },
};

export const MOCK_VIX_BASE = 12.6;

export const MOCK_NOTICE =
  "Simulated data generated on-device for development. Not market data.";
