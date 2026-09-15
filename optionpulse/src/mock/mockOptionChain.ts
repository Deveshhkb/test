import { getATMStrike } from "../calculations/options/atm";
import { blackScholesPrice, yearsToExpiry } from "../calculations/options/greeks";
import { getUnderlyingConfig } from "../config/underlyings";
import type { UnderlyingSymbol } from "../types/market";
import type { OptionChain, OptionChainRow, OptionLeg, OptionType } from "../types/options";
import { daysBetweenIso, toIstParts } from "../utils/time";
import { MOCK_BASELINES } from "./mockBaselines";
import { createRng, gaussian, hashSeed, randomBetween, roundTo } from "./rng";

export interface MockChainOptions {
  depth?: number;
  now?: number;
  /** Day change percent of the underlying, used to skew OI additions. */
  dayChangePercent?: number;
}

/**
 * Builds a simulated option chain.
 *
 * Shape of the simulation (all of it invented, none of it market data):
 *  - Implied volatility follows a smile: a quadratic in log-moneyness plus a
 *    put-side skew, anchored on the underlying's baseline volatility.
 *  - Premiums are Black-Scholes values at that IV, plus a small random spread.
 *  - Open interest is a hump centred a little above spot for calls and a little
 *    below spot for puts, with extra weight on round-number strikes - which is
 *    what produces recognisable support/resistance structure downstream.
 */
export function generateOptionChain(
  symbol: UnderlyingSymbol,
  expiry: string,
  spot: number,
  options: MockChainOptions = {},
): OptionChain {
  const config = getUnderlyingConfig(symbol);
  const now = options.now ?? Date.now();
  const depth = options.depth ?? config.defaultStrikeDepth;
  const today = toIstParts(now).isoDate;
  const daysToExpiry = Math.max(0, daysBetweenIso(today, expiry));
  const timeToExpiry = Math.max(yearsToExpiry(daysToExpiry), 1 / 365 / 8);

  const atmStrike = getATMStrike(spot, config.strikeInterval);
  const rng = createRng(hashSeed("chain", symbol, expiry, today));
  const baseIv = MOCK_BASELINES[symbol].annualVolatility * randomBetween(rng, 0.95, 1.2);
  const dayChangePercent = options.dayChangePercent ?? 0;

  const rows: OptionChainRow[] = [];
  for (let step = -depth; step <= depth; step += 1) {
    const strike = atmStrike + step * config.strikeInterval;
    if (strike <= 0) continue;
    rows.push({
      strike,
      call: buildLeg(
        "CE",
        strike,
        spot,
        timeToExpiry,
        baseIv,
        rng,
        dayChangePercent,
        config.strikeInterval,
      ),
      put: buildLeg(
        "PE",
        strike,
        spot,
        timeToExpiry,
        baseIv,
        rng,
        dayChangePercent,
        config.strikeInterval,
      ),
    });
  }

  return {
    symbol,
    expiry,
    spot,
    strikeInterval: config.strikeInterval,
    rows,
    timestamp: now,
    mode: "MOCK",
  };
}

/** Quadratic smile with a put-side skew, expressed in log-moneyness. */
function smileIv(baseIv: number, strike: number, spot: number, timeToExpiry: number): number {
  const moneyness = Math.log(strike / spot);
  const curvature = 2.2 / Math.sqrt(Math.max(timeToExpiry, 0.01));
  const skew = 0.9;
  return Math.max(0.04, baseIv * (1 + curvature * moneyness * moneyness - skew * moneyness));
}

function buildLeg(
  optionType: OptionType,
  strike: number,
  spot: number,
  timeToExpiry: number,
  baseIv: number,
  rng: () => number,
  dayChangePercent: number,
  strikeInterval: number,
): OptionLeg {
  const iv = smileIv(baseIv, strike, spot, timeToExpiry);
  const theoretical = blackScholesPrice({
    spot,
    strike,
    timeToExpiry,
    volatility: iv,
    optionType,
  });

  const ltp = roundTo(Math.max(0.05, theoretical * randomBetween(rng, 0.97, 1.03)), 2);
  const spreadPercent = randomBetween(rng, 0.004, 0.02);
  const halfSpread = Math.max(0.05, ltp * spreadPercent);
  const bid = roundTo(Math.max(0.05, ltp - halfSpread), 2);
  const ask = roundTo(ltp + halfSpread, 2);

  // A directional day lifts calls and drags puts (and vice versa).
  const directional = optionType === "CE" ? dayChangePercent : -dayChangePercent;
  const changePercent = roundTo(directional * randomBetween(rng, 3, 9) + gaussian(rng) * 4, 2);
  const change = roundTo((ltp * changePercent) / (100 + changePercent), 2);

  const openInterest = simulateOpenInterest(optionType, strike, spot, rng, strikeInterval);
  const oiChangeBias = optionType === "CE" ? -dayChangePercent : dayChangePercent;
  const changeInOpenInterest = Math.round(
    openInterest * (gaussian(rng) * 0.08 + oiChangeBias * 0.03),
  );

  const distanceFactor = Math.exp(-(((strike - spot) / (spot * 0.035)) ** 2));
  const volume = Math.round(
    openInterest * randomBetween(rng, 0.25, 1.4) * (0.35 + distanceFactor),
  );

  return {
    optionType,
    strike,
    ltp,
    change,
    changePercent,
    bid,
    ask,
    volume,
    openInterest,
    changeInOpenInterest,
    impliedVolatility: roundTo(iv * 100, 2),
  };
}

/**
 * Open-interest hump. Writers concentrate above spot on calls and below spot on
 * puts, and round-number strikes attract disproportionate interest.
 */
function simulateOpenInterest(
  optionType: OptionType,
  strike: number,
  spot: number,
  rng: () => number,
  strikeInterval: number,
): number {
  const offsetDirection = optionType === "CE" ? 1 : -1;
  const peak = spot * (1 + offsetDirection * 0.012);
  const width = spot * 0.028;
  const hump = Math.exp(-(((strike - peak) / width) ** 2));

  const roundStep = strikeInterval * 10;
  const roundnessBoost =
    strike % roundStep === 0 ? 1.7 : strike % (roundStep / 2) === 0 ? 1.25 : 1;

  const scale = 900_000;
  const value = scale * hump * roundnessBoost * randomBetween(rng, 0.45, 1.25);
  // Tails never go fully to zero on a real chain.
  return Math.round(Math.max(value, scale * 0.01 * rng()));
}
