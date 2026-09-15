import { buildOptionChainAnalytics } from "../../src/calculations/options/chainAnalytics";
import type { Timeframe, UnderlyingSymbol } from "../../src/types/market";
import type { OptionChainAnalytics } from "../../src/types/options";
import { getProvider } from "../providers";
import { HttpError } from "../middleware/validation";

/**
 * Application services sit between the HTTP layer and the provider, so
 * controllers stay thin and provider-specific code stays isolated.
 */
export function getMarketSnapshot() {
  return getProvider().getMarketSnapshot();
}

export function getIndexQuote(symbol: UnderlyingSymbol) {
  return getProvider().getIndexQuote(symbol);
}

export function getExpiries(symbol: UnderlyingSymbol) {
  return getProvider().getExpiries(symbol);
}

/** Resolves the nearest expiry when the caller does not name one. */
export async function resolveExpiry(
  symbol: UnderlyingSymbol,
  requested: string | null,
): Promise<string> {
  if (requested) return requested;
  const expiries = await getProvider().getExpiries(symbol);
  const nearest = expiries[0]?.date;
  if (!nearest) throw new HttpError(503, `No expiries are available for ${symbol}.`);
  return nearest;
}

export async function getOptionChain(symbol: UnderlyingSymbol, requestedExpiry: string | null) {
  const expiry = await resolveExpiry(symbol, requestedExpiry);
  return getProvider().getOptionChain(symbol, expiry);
}

export function getHistoricalData(symbol: UnderlyingSymbol, timeframe: Timeframe) {
  return getProvider().getHistoricalData(symbol, timeframe);
}

/**
 * Analytics are computed server-side with the same modules the browser uses, so
 * the two can never disagree.
 */
export async function getAnalytics(
  symbol: UnderlyingSymbol,
  requestedExpiry: string | null,
): Promise<OptionChainAnalytics> {
  const chain = await getOptionChain(symbol, requestedExpiry);
  return buildOptionChainAnalytics(chain);
}
