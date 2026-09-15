import {
  BIAS_BANDS,
  BIAS_FACTORS,
  BIAS_THRESHOLDS,
  MAX_ABSOLUTE_SCORE,
} from "../../config/marketBias.config";
import type { BiasFactor, BiasLabel, MarketBiasResult } from "../../types/market";

/**
 * Inputs to the bias engine. Every field is optional: a factor with no input is
 * simply skipped rather than scored as neutral, so the UI can show exactly
 * which signals were available.
 */
export interface MarketBiasInput {
  /** Day change in percent. */
  changePercent?: number;
  /** Close, and EMAs to compare it against. */
  close?: number;
  emaFast?: number | null;
  emaSlow?: number | null;
  rsi?: number | null;
  macdHistogram?: number | null;
  macdLine?: number | null;
  macdSignal?: number | null;
  vwap?: number | null;
  advanceDeclineRatio?: number;
  vix?: number;
  vixChangePercent?: number;
  fiiNetCrore?: number;
  diiNetCrore?: number;
  pcr?: number;
  /** Net call OI added minus net put OI added across the chain. */
  netCallOiChange?: number;
  netPutOiChange?: number;
  /** Nearest levels from the S/R engine, used to score where spot sits. */
  nearestSupport?: number | null;
  nearestResistance?: number | null;
  spot?: number;
}

type Scorer = (input: MarketBiasInput) => { score: number; detail: string } | null;

function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}

const SCORERS: Record<string, Scorer> = {
  priceMomentum: (input) => {
    if (input.changePercent === undefined) return null;
    const move = input.changePercent;
    const { momentumStrong, momentumMild } = BIAS_THRESHOLDS;
    let score = 0;
    if (move >= momentumStrong) score = 2;
    else if (move >= momentumMild) score = 1;
    else if (move <= -momentumStrong) score = -2;
    else if (move <= -momentumMild) score = -1;
    return { score, detail: `Day change ${move.toFixed(2)}%` };
  },

  emaTrend: (input) => {
    if (
      input.close === undefined ||
      input.emaFast === undefined ||
      input.emaSlow === undefined ||
      input.emaFast === null ||
      input.emaSlow === null
    ) {
      return null;
    }
    const aboveFast = input.close > input.emaFast;
    const aboveSlow = input.close > input.emaSlow;
    const fastAboveSlow = input.emaFast > input.emaSlow;
    const bullishCount = [aboveFast, aboveSlow, fastAboveSlow].filter(Boolean).length;
    const score = bullishCount === 3 ? 2 : bullishCount === 0 ? -2 : bullishCount >= 2 ? 1 : -1;
    return {
      score,
      detail: `Price ${aboveSlow ? "above" : "below"} slow EMA, fast EMA ${fastAboveSlow ? "above" : "below"} slow EMA`,
    };
  },

  rsi: (input) => {
    if (input.rsi === undefined || input.rsi === null) return null;
    const value = input.rsi;
    const t = BIAS_THRESHOLDS;
    let score = 0;
    let detail = `RSI ${value.toFixed(1)} - neutral zone`;
    if (value >= t.rsiOverbought) {
      score = -1;
      detail = `RSI ${value.toFixed(1)} - overbought, momentum stretched`;
    } else if (value >= t.rsiBullish) {
      score = 1;
      detail = `RSI ${value.toFixed(1)} - momentum favours upside`;
    } else if (value <= t.rsiOversold) {
      score = 1;
      detail = `RSI ${value.toFixed(1)} - oversold, downside stretched`;
    } else if (value <= t.rsiBearish) {
      score = -1;
      detail = `RSI ${value.toFixed(1)} - momentum favours downside`;
    }
    return { score, detail };
  },

  macd: (input) => {
    if (input.macdHistogram === undefined || input.macdHistogram === null) return null;
    const histogram = input.macdHistogram;
    const lineAboveSignal =
      input.macdLine !== undefined &&
      input.macdLine !== null &&
      input.macdSignal !== undefined &&
      input.macdSignal !== null
        ? input.macdLine > input.macdSignal
        : histogram > 0;
    let score = histogram > 0 ? 1 : histogram < 0 ? -1 : 0;
    if (lineAboveSignal && histogram > 0) score = 2;
    if (!lineAboveSignal && histogram < 0) score = -2;
    return {
      score,
      detail: `MACD histogram ${histogram >= 0 ? "positive" : "negative"} (${histogram.toFixed(2)})`,
    };
  },

  vwap: (input) => {
    if (input.vwap === undefined || input.vwap === null || input.close === undefined)
      return null;
    const above = input.close > input.vwap;
    return {
      score: above ? 1 : -1,
      detail: `Price trading ${above ? "above" : "below"} VWAP`,
    };
  },

  breadth: (input) => {
    if (input.advanceDeclineRatio === undefined) return null;
    const ratio = input.advanceDeclineRatio;
    const score =
      ratio >= BIAS_THRESHOLDS.breadthBullish
        ? 1
        : ratio <= BIAS_THRESHOLDS.breadthBearish
          ? -1
          : 0;
    return { score, detail: `Advance/decline ratio ${ratio.toFixed(2)}` };
  },

  vix: (input) => {
    if (input.vix === undefined) return null;
    const { vixElevated, vixCalm } = BIAS_THRESHOLDS;
    const rising = (input.vixChangePercent ?? 0) > 0;
    let score = 0;
    if (input.vix >= vixElevated && rising) score = -1;
    else if (input.vix <= vixCalm && !rising) score = 1;
    return {
      score,
      detail: `India VIX ${input.vix.toFixed(2)} and ${rising ? "rising" : "easing"}`,
    };
  },

  institutional: (input) => {
    if (input.fiiNetCrore === undefined && input.diiNetCrore === undefined) return null;
    const net = (input.fiiNetCrore ?? 0) + (input.diiNetCrore ?? 0);
    const threshold = BIAS_THRESHOLDS.institutionalCrore;
    const score = net >= threshold ? 1 : net <= -threshold ? -1 : 0;
    return {
      score,
      detail: `Net institutional flow ${net >= 0 ? "+" : "-"}₹${Math.abs(net).toFixed(0)} Cr`,
    };
  },

  pcr: (input) => {
    if (input.pcr === undefined || !Number.isFinite(input.pcr) || input.pcr <= 0) return null;
    const { pcrBullish, pcrBearish } = BIAS_THRESHOLDS;
    const score = input.pcr >= pcrBullish ? 1 : input.pcr <= pcrBearish ? -1 : 0;
    return { score, detail: `PCR ${input.pcr.toFixed(2)}` };
  },

  oiStructure: (input) => {
    if (input.netCallOiChange === undefined || input.netPutOiChange === undefined) return null;
    const callAdd = input.netCallOiChange;
    const putAdd = input.netPutOiChange;
    const total = Math.abs(callAdd) + Math.abs(putAdd);
    if (total === 0) return { score: 0, detail: "No meaningful OI change on either side" };
    // Put writing (put OI added) is supportive; call writing is a drag.
    const skew = (putAdd - callAdd) / total;
    const score = clamp(Math.round(skew * 2), 2);
    return {
      score,
      detail:
        skew > 0
          ? "Put open interest added faster than call open interest"
          : skew < 0
            ? "Call open interest added faster than put open interest"
            : "Call and put open-interest additions are balanced",
    };
  },

  supportResistance: (input) => {
    if (
      input.spot === undefined ||
      input.nearestSupport === undefined ||
      input.nearestResistance === undefined ||
      input.nearestSupport === null ||
      input.nearestResistance === null
    ) {
      return null;
    }
    const range = input.nearestResistance - input.nearestSupport;
    if (range <= 0) return { score: 0, detail: "Support and resistance levels overlap" };
    const position = (input.spot - input.nearestSupport) / range;
    const score = position >= 0.66 ? 1 : position <= 0.34 ? -1 : 0;
    return {
      score,
      detail: `Spot sits in the ${(position * 100).toFixed(0)}% band between support and resistance`,
    };
  },
};

export function labelForScore(score: number): BiasLabel {
  const band = BIAS_BANDS.find((candidate) => score >= candidate.min && score <= candidate.max);
  return band?.label ?? "SIDEWAYS";
}

/**
 * Computes a transparent market-bias score.
 *
 * The result always carries the individual factor contributions so the UI can
 * show why the score came out the way it did. This is an analytical score, not
 * a prediction.
 */
export function calculateMarketBias(input: MarketBiasInput): MarketBiasResult {
  const factors: BiasFactor[] = [];
  let total = 0;
  let availableMagnitude = 0;

  for (const config of BIAS_FACTORS) {
    if (!config.enabled) continue;
    const scorer = SCORERS[config.key];
    if (!scorer) continue;
    const outcome = scorer(input);
    if (outcome === null) continue;

    const score = clamp(outcome.score, config.maxScore);
    total += score;
    availableMagnitude += config.maxScore;
    factors.push({
      key: config.key,
      label: config.label,
      score,
      detail: outcome.detail,
    });
  }

  const denominator = availableMagnitude || MAX_ABSOLUTE_SCORE;

  return {
    label: labelForScore(total),
    score: total,
    strength: Math.round((Math.abs(total) / denominator) * 100),
    factors,
    mode: "CALCULATED",
  };
}
