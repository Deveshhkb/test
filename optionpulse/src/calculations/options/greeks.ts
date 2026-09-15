import type { OptionGreeks, OptionType } from "../../types/options";

/**
 * Black-Scholes (1973) greeks for European index options.
 *
 * DOCUMENTED ASSUMPTIONS - these are approximations, and the UI must label
 * anything produced here as CALCULATED rather than market-published:
 *  - European exercise. Indian index options are European, so this holds.
 *  - Continuous compounding at a constant risk-free rate.
 *  - Constant volatility over the life of the option (no smile/skew term).
 *  - No dividends. Index options carry an implicit dividend drag; setting
 *    `dividendYield` models it as a continuous yield.
 *  - Time to expiry is measured in calendar years (ACT/365), not trading days.
 *
 * Theta is returned per calendar day and vega per 1 percentage-point change in
 * volatility, which is how trading screens conventionally present them.
 */

export interface GreeksInput {
  /** Underlying spot price. */
  spot: number;
  strike: number;
  /** Time to expiry in years. Use `yearsToExpiry` to derive it. */
  timeToExpiry: number;
  /** Annualised volatility as a decimal (0.18 = 18%). */
  volatility: number;
  /** Annualised continuously-compounded risk-free rate as a decimal. */
  riskFreeRate?: number;
  dividendYield?: number;
  optionType: OptionType;
}

/** Default risk-free rate. Configuration, not market data - override per build. */
export const DEFAULT_RISK_FREE_RATE = 0.065;

export const TRADING_DAYS_PER_YEAR = 252;
export const CALENDAR_DAYS_PER_YEAR = 365;

export function yearsToExpiry(daysToExpiry: number): number {
  return Math.max(daysToExpiry, 0) / CALENDAR_DAYS_PER_YEAR;
}

/** Standard normal probability density. */
export function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Standard normal CDF via Abramowitz & Stegun 7.1.26 applied to erf.
 * Absolute error below 1.5e-7, which is well inside display precision.
 */
export function normCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-z * z);
  return 0.5 * (1 + sign * y);
}

interface D1D2 {
  d1: number;
  d2: number;
}

function computeD(input: Required<Omit<GreeksInput, "optionType">>): D1D2 {
  const { spot, strike, timeToExpiry, volatility, riskFreeRate, dividendYield } = input;
  const sigmaRootT = volatility * Math.sqrt(timeToExpiry);
  const d1 =
    (Math.log(spot / strike) +
      (riskFreeRate - dividendYield + 0.5 * volatility * volatility) * timeToExpiry) /
    sigmaRootT;
  return { d1, d2: d1 - sigmaRootT };
}

function isDegenerate(input: GreeksInput): boolean {
  return (
    !Number.isFinite(input.spot) ||
    !Number.isFinite(input.strike) ||
    input.spot <= 0 ||
    input.strike <= 0 ||
    input.timeToExpiry <= 0 ||
    input.volatility <= 0
  );
}

/** Theoretical option price under the assumptions documented above. */
export function blackScholesPrice(input: GreeksInput): number {
  if (isDegenerate(input)) {
    // At or past expiry the option is worth its intrinsic value.
    return input.optionType === "CE"
      ? Math.max(0, input.spot - input.strike)
      : Math.max(0, input.strike - input.spot);
  }
  const resolved = withDefaults(input);
  const { d1, d2 } = computeD(resolved);
  const { spot, strike, timeToExpiry, riskFreeRate, dividendYield } = resolved;
  const discount = Math.exp(-riskFreeRate * timeToExpiry);
  const carry = Math.exp(-dividendYield * timeToExpiry);

  return input.optionType === "CE"
    ? spot * carry * normCdf(d1) - strike * discount * normCdf(d2)
    : strike * discount * normCdf(-d2) - spot * carry * normCdf(-d1);
}

function withDefaults(input: GreeksInput): Required<Omit<GreeksInput, "optionType">> {
  return {
    spot: input.spot,
    strike: input.strike,
    timeToExpiry: input.timeToExpiry,
    volatility: input.volatility,
    riskFreeRate: input.riskFreeRate ?? DEFAULT_RISK_FREE_RATE,
    dividendYield: input.dividendYield ?? 0,
  };
}

/**
 * Delta, gamma, theta and vega. Always returned with `source: "CALCULATED"` so
 * the UI can distinguish them from provider-published greeks.
 */
export function calculateGreeks(input: GreeksInput): OptionGreeks {
  if (isDegenerate(input)) {
    return { delta: 0, gamma: 0, theta: 0, vega: 0, source: "CALCULATED" };
  }
  const resolved = withDefaults(input);
  const { d1, d2 } = computeD(resolved);
  const { spot, strike, timeToExpiry, volatility, riskFreeRate, dividendYield } = resolved;

  const discount = Math.exp(-riskFreeRate * timeToExpiry);
  const carry = Math.exp(-dividendYield * timeToExpiry);
  const rootT = Math.sqrt(timeToExpiry);
  const pdfD1 = normPdf(d1);

  const delta = input.optionType === "CE" ? carry * normCdf(d1) : carry * (normCdf(d1) - 1);

  const gamma = (carry * pdfD1) / (spot * volatility * rootT);

  // Per-year theta, converted to per calendar day below.
  const sharedTheta = -(spot * carry * pdfD1 * volatility) / (2 * rootT);
  const thetaPerYear =
    input.optionType === "CE"
      ? sharedTheta -
        riskFreeRate * strike * discount * normCdf(d2) +
        dividendYield * spot * carry * normCdf(d1)
      : sharedTheta +
        riskFreeRate * strike * discount * normCdf(-d2) -
        dividendYield * spot * carry * normCdf(-d1);

  // Vega per 1 percentage point of volatility.
  const vega = (spot * carry * pdfD1 * rootT) / 100;

  return {
    delta,
    gamma,
    theta: thetaPerYear / CALENDAR_DAYS_PER_YEAR,
    vega,
    source: "CALCULATED",
  };
}

export interface ImpliedVolInput extends Omit<GreeksInput, "volatility"> {
  /** Observed market price of the option. */
  marketPrice: number;
}

/**
 * Solves for implied volatility by bisection on the Black-Scholes price.
 *
 * Bisection rather than Newton-Raphson: it is slower but cannot diverge on
 * deep-ITM or near-expiry quotes, where vega collapses. Returns null when the
 * quote sits outside the no-arbitrage bounds the model can reproduce.
 */
export function calculateImpliedVolatility(
  input: ImpliedVolInput,
  options: { lower?: number; upper?: number; tolerance?: number; maxIterations?: number } = {},
): number | null {
  const lower = options.lower ?? 0.001;
  const upper = options.upper ?? 5;
  const tolerance = options.tolerance ?? 1e-5;
  const maxIterations = options.maxIterations ?? 100;

  if (!Number.isFinite(input.marketPrice) || input.marketPrice <= 0) return null;
  if (input.timeToExpiry <= 0) return null;

  const priceAt = (volatility: number) =>
    blackScholesPrice({ ...input, volatility }) - input.marketPrice;

  let low = lower;
  let high = upper;
  if (priceAt(low) > 0 || priceAt(high) < 0) return null;

  for (let i = 0; i < maxIterations; i += 1) {
    const mid = (low + high) / 2;
    const value = priceAt(mid);
    if (Math.abs(value) < tolerance) return mid;
    if (value > 0) high = mid;
    else low = mid;
  }
  return (low + high) / 2;
}
