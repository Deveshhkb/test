import type { MarketSnapshot, Quote, UnderlyingSymbol } from "../../types/market";
import { getMarketDataProvider } from "../providers";

/**
 * Thin façade over the active provider. Components and store thunks call these
 * functions rather than reaching for a provider directly, so the provider can
 * change without touching call sites.
 */
export function fetchMarketSnapshot(): Promise<MarketSnapshot> {
  return getMarketDataProvider().getMarketSnapshot();
}

export function fetchIndexQuote(symbol: UnderlyingSymbol): Promise<Quote> {
  return getMarketDataProvider().getIndexQuote(symbol);
}

export function subscribeToQuotes(
  symbols: UnderlyingSymbol[],
  onUpdate: (symbol: UnderlyingSymbol, quote: Quote) => void,
): () => void {
  const provider = getMarketDataProvider();
  if (!provider.supportsStreaming()) return () => {};
  return provider.subscribeQuotes(symbols, ({ symbol, quote }) => onUpdate(symbol, quote));
}
