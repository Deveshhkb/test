import type { HistoricalSeries, Timeframe, UnderlyingSymbol } from "../../types/market";
import { getMarketDataProvider } from "../providers";

export const TIMEFRAMES: Timeframe[] = ["1m", "3m", "5m", "15m", "30m", "1H", "1D", "1W", "1M"];

export function fetchHistoricalData(
  symbol: UnderlyingSymbol,
  timeframe: Timeframe,
): Promise<HistoricalSeries> {
  return getMarketDataProvider().getHistoricalData(symbol, timeframe);
}
