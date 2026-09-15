import type { OptionChainRow, SrLevel, SupportResistanceResult } from "../../types/options";

/**
 * Weights for the support/resistance model. Every factor is normalised to 0-1
 * across the chain before weighting, so the weights below are directly
 * comparable and can be tuned without touching the algorithm.
 */
export interface SrWeights {
  openInterest: number;
  oiChange: number;
  volume: number;
  /** Rewards levels nearer to spot; distant strikes matter less intraday. */
  proximity: number;
}

export const DEFAULT_SR_WEIGHTS: SrWeights = {
  openInterest: 0.45,
  oiChange: 0.25,
  volume: 0.15,
  proximity: 0.15,
};

export interface SrOptions {
  weights?: SrWeights;
  /** How many levels to return per side. */
  levels?: number;
  /**
   * Strikes further than this many percent from spot are ignored. Keeps the
   * model focused on levels that can realistically be tested in the session.
   */
  maxDistancePercent?: number;
}

function normalise(value: number, max: number): number {
  if (!Number.isFinite(value) || max <= 0) return 0;
  return Math.min(1, Math.max(0, value / max));
}

/**
 * Scores strikes as potential support (put writing below spot) and resistance
 * (call writing above spot).
 *
 * This is an analytical model built from open interest, open-interest change,
 * traded volume and distance from spot. It describes where positioning is
 * concentrated - it is not a forecast.
 */
export function calculateSupportResistance(
  rows: OptionChainRow[],
  spot: number,
  options: SrOptions = {},
): SupportResistanceResult {
  const weights = options.weights ?? DEFAULT_SR_WEIGHTS;
  const levels = options.levels ?? 3;
  const maxDistancePercent = options.maxDistancePercent ?? 8;

  const inRange = rows.filter(
    (row) => Math.abs(row.strike - spot) / spot <= maxDistancePercent / 100,
  );

  const maxima = {
    callOi: Math.max(0, ...inRange.map((row) => row.call.openInterest)),
    putOi: Math.max(0, ...inRange.map((row) => row.put.openInterest)),
    callOiChange: Math.max(0, ...inRange.map((row) => row.call.changeInOpenInterest)),
    putOiChange: Math.max(0, ...inRange.map((row) => row.put.changeInOpenInterest)),
    callVolume: Math.max(0, ...inRange.map((row) => row.call.volume)),
    putVolume: Math.max(0, ...inRange.map((row) => row.put.volume)),
    distance: Math.max(1e-9, ...inRange.map((row) => Math.abs(row.strike - spot))),
  };

  const supports: SrLevel[] = [];
  const resistances: SrLevel[] = [];

  for (const row of inRange) {
    const proximity = 1 - normalise(Math.abs(row.strike - spot), maxima.distance);

    if (row.strike <= spot && row.put.openInterest > 0) {
      supports.push(
        buildLevel(row.strike, weights, {
          openInterest: normalise(row.put.openInterest, maxima.putOi),
          oiChange: normalise(row.put.changeInOpenInterest, maxima.putOiChange),
          volume: normalise(row.put.volume, maxima.putVolume),
          proximity,
        }),
      );
    }

    if (row.strike >= spot && row.call.openInterest > 0) {
      resistances.push(
        buildLevel(row.strike, weights, {
          openInterest: normalise(row.call.openInterest, maxima.callOi),
          oiChange: normalise(row.call.changeInOpenInterest, maxima.callOiChange),
          volume: normalise(row.call.volume, maxima.callVolume),
          proximity,
        }),
      );
    }
  }

  const byStrength = (a: SrLevel, b: SrLevel) => b.strength - a.strength;

  return {
    supports: supports.sort(byStrength).slice(0, levels),
    resistances: resistances.sort(byStrength).slice(0, levels),
    mode: "CALCULATED",
  };
}

function buildLevel(
  strike: number,
  weights: SrWeights,
  normalised: Record<keyof SrWeights, number>,
): SrLevel {
  const components: Record<string, number> = {};
  let score = 0;
  let weightTotal = 0;

  (Object.keys(weights) as Array<keyof SrWeights>).forEach((key) => {
    const contribution = normalised[key] * weights[key];
    components[key] = Math.round(contribution * 100);
    score += contribution;
    weightTotal += weights[key];
  });

  return {
    strike,
    strength: Math.round((weightTotal > 0 ? score / weightTotal : 0) * 100),
    components,
  };
}
