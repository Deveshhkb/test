import type { BiasLabel } from "../types/market";

/**
 * Scoring configuration for the market-bias engine.
 *
 * Every factor contributes an integer in [-maxScore, +maxScore]. Keeping the
 * thresholds here means the engine can be re-tuned without touching logic, and
 * the UI can explain exactly why a score was produced.
 */
export interface BiasFactorConfig {
  key: string;
  label: string;
  /** Absolute cap on this factor's contribution. */
  maxScore: number;
  enabled: boolean;
}

export const BIAS_FACTORS: BiasFactorConfig[] = [
  { key: "priceMomentum", label: "Price momentum", maxScore: 2, enabled: true },
  { key: "emaTrend", label: "EMA trend", maxScore: 2, enabled: true },
  { key: "rsi", label: "RSI", maxScore: 1, enabled: true },
  { key: "macd", label: "MACD", maxScore: 2, enabled: true },
  { key: "vwap", label: "VWAP position", maxScore: 1, enabled: true },
  { key: "breadth", label: "Market breadth", maxScore: 1, enabled: true },
  { key: "vix", label: "India VIX", maxScore: 1, enabled: true },
  { key: "institutional", label: "FII / DII flow", maxScore: 1, enabled: true },
  { key: "pcr", label: "PCR", maxScore: 1, enabled: true },
  { key: "oiStructure", label: "OI structure", maxScore: 2, enabled: true },
  { key: "supportResistance", label: "Support / resistance", maxScore: 1, enabled: true },
];

/** Total achievable magnitude, used to normalise signal strength to 0-100. */
export const MAX_ABSOLUTE_SCORE = BIAS_FACTORS.filter((f) => f.enabled).reduce(
  (total, factor) => total + factor.maxScore,
  0,
);

export interface BiasBand {
  label: BiasLabel;
  /** Inclusive lower bound of the band. */
  min: number;
  /** Inclusive upper bound of the band. */
  max: number;
  display: string;
}

export const BIAS_BANDS: BiasBand[] = [
  { label: "STRONG_BULLISH", min: 8, max: Number.POSITIVE_INFINITY, display: "STRONG BULLISH" },
  { label: "BULLISH", min: 3, max: 7, display: "BULLISH" },
  { label: "SIDEWAYS", min: -2, max: 2, display: "SIDEWAYS" },
  { label: "BEARISH", min: -7, max: -3, display: "BEARISH" },
  {
    label: "STRONG_BEARISH",
    min: Number.NEGATIVE_INFINITY,
    max: -8,
    display: "STRONG BEARISH",
  },
];

export const BIAS_DISPLAY: Record<BiasLabel, string> = BIAS_BANDS.reduce(
  (map, band) => ({ ...map, [band.label]: band.display }),
  {} as Record<BiasLabel, string>,
);

/** Reference levels used by individual factor scorers. */
export const BIAS_THRESHOLDS = {
  /** Percent move on the day that counts as a strong / mild directional push. */
  momentumStrong: 0.75,
  momentumMild: 0.2,
  rsiOverbought: 70,
  rsiBullish: 55,
  rsiBearish: 45,
  rsiOversold: 30,
  /** India VIX levels: elevated volatility is treated as a risk-off input. */
  vixElevated: 18,
  vixCalm: 12,
  breadthBullish: 1.5,
  breadthBearish: 0.67,
  pcrBullish: 1.2,
  pcrBearish: 0.8,
  /** Net institutional flow, INR crore, that counts as meaningful. */
  institutionalCrore: 1000,
} as const;

export const BIAS_DISCLAIMER =
  "Market Bias is an analytical score computed from the inputs listed below. It describes current conditions and is not a prediction or a recommendation.";
