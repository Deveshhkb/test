import type { Moneyness, OptionType } from "../../types/options";

/**
 * Rounds the spot price to the nearest listed strike.
 *
 * Ties (spot exactly between two strikes) round up, matching the convention
 * most Indian option-chain screens use.
 */
export function getATMStrike(spot: number, strikeInterval: number): number {
  if (!Number.isFinite(spot) || !Number.isFinite(strikeInterval) || strikeInterval <= 0) {
    throw new Error("getATMStrike requires a finite spot and a positive strike interval");
  }
  return Math.round(spot / strikeInterval) * strikeInterval;
}

/**
 * Picks the listed strike closest to spot from an explicit ladder. Preferred
 * over `getATMStrike` when the provider's ladder has gaps.
 */
export function getNearestStrike(spot: number, strikes: number[]): number | null {
  if (strikes.length === 0) return null;
  return strikes.reduce((best, strike) =>
    Math.abs(strike - spot) < Math.abs(best - spot) ? strike : best,
  );
}

/**
 * Classifies a strike for a given option type.
 *
 * A strike counts as ATM when it is the strike nearest to spot; callers pass
 * that strike in so classification stays consistent with the rendered ladder.
 */
export function classifyMoneyness(
  strike: number,
  optionType: OptionType,
  spot: number,
  atmStrike?: number,
): Moneyness {
  if (atmStrike !== undefined && strike === atmStrike) return "ATM";
  if (atmStrike === undefined && strike === spot) return "ATM";
  if (optionType === "CE") return strike < spot ? "ITM" : "OTM";
  return strike > spot ? "ITM" : "OTM";
}

/** Intrinsic value of one option at a given underlying price. */
export function intrinsicValue(
  strike: number,
  optionType: OptionType,
  underlyingPrice: number,
): number {
  return optionType === "CE"
    ? Math.max(0, underlyingPrice - strike)
    : Math.max(0, strike - underlyingPrice);
}
