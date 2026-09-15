import type { UnderlyingSymbol } from "../../types/market";
import type { ExpiryInfo, OptionChain } from "../../types/options";
import { getMarketDataProvider } from "../providers";

/**
 * Chain fetching for the browser. The analytics themselves live in
 * `calculations/options` so the backend can reuse the exact same code.
 */
export function fetchExpiries(symbol: UnderlyingSymbol): Promise<ExpiryInfo[]> {
  return getMarketDataProvider().getExpiries(symbol);
}

export function fetchOptionChain(
  symbol: UnderlyingSymbol,
  expiry: string,
): Promise<OptionChain> {
  return getMarketDataProvider().getOptionChain(symbol, expiry);
}

export function subscribeToOptionChain(
  symbol: UnderlyingSymbol,
  expiry: string,
  onUpdate: (chain: OptionChain) => void,
): () => void {
  const provider = getMarketDataProvider();
  if (!provider.supportsStreaming()) return () => {};
  return provider.subscribeOptionChain(symbol, expiry, onUpdate);
}

export {
  buildOptionChainAnalytics,
  resolveAtmStrike,
} from "../../calculations/options/chainAnalytics";
export {
  STRIKE_FILTERS,
  filterChainRows,
  type CustomStrikeRange,
  type StrikeFilter,
  type StrikeFilterId,
} from "../../calculations/options/chainFilters";
