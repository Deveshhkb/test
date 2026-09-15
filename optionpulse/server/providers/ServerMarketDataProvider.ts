import type {
  HistoricalSeries,
  MarketSnapshot,
  Quote,
  Timeframe,
  UnderlyingSymbol,
} from "../../src/types/market";
import type { ExpiryInfo, OptionChain } from "../../src/types/options";

/**
 * Backend counterpart of the frontend provider interface.
 *
 * A licensed vendor integration implements this one class; routes, controllers
 * and calculations stay untouched. Vendor SDKs and credentials must not escape
 * this folder.
 */
export interface ServerMarketDataProvider {
  readonly id: string;
  getMarketSnapshot(): Promise<MarketSnapshot>;
  getIndexQuote(symbol: UnderlyingSymbol): Promise<Quote>;
  getExpiries(symbol: UnderlyingSymbol): Promise<ExpiryInfo[]>;
  getOptionChain(symbol: UnderlyingSymbol, expiry: string): Promise<OptionChain>;
  getHistoricalData(symbol: UnderlyingSymbol, timeframe: Timeframe): Promise<HistoricalSeries>;
}
