import { UNDERLYING_LIST } from "../../src/config/underlyings";
import { generateHistoricalSeries } from "../../src/mock/mockHistoricalData";
import {
  generateBreadth,
  generateInstitutionalActivity,
  generateQuote,
  generateVix,
} from "../../src/mock/mockMarketData";
import { generateOptionChain } from "../../src/mock/mockOptionChain";
import type {
  HistoricalSeries,
  MarketSnapshot,
  Quote,
  Timeframe,
  UnderlyingSymbol,
} from "../../src/types/market";
import type { ExpiryInfo, OptionChain } from "../../src/types/options";
import { generateExpiries } from "../../src/utils/expiries";
import { getMarketStatus } from "../../src/utils/marketStatus";
import { toIstParts } from "../../src/utils/time";
import type { ServerMarketDataProvider } from "./ServerMarketDataProvider";

/**
 * Serves the same simulated data the browser mock provider produces, so the
 * API contract can be exercised end to end before a vendor is connected.
 */
export class MockProvider implements ServerMarketDataProvider {
  readonly id = "mock";

  async getMarketSnapshot(): Promise<MarketSnapshot> {
    const now = Date.now();
    const quotes = UNDERLYING_LIST.reduce(
      (acc, config) => {
        acc[config.symbol] = generateQuote(config.symbol, now);
        return acc;
      },
      {} as Record<UnderlyingSymbol, Quote>,
    );
    return {
      quotes,
      vix: generateVix(now),
      breadth: generateBreadth(now),
      institutional: generateInstitutionalActivity(now),
      status: getMarketStatus(now),
    };
  }

  async getIndexQuote(symbol: UnderlyingSymbol): Promise<Quote> {
    return generateQuote(symbol);
  }

  async getExpiries(symbol: UnderlyingSymbol): Promise<ExpiryInfo[]> {
    return generateExpiries(symbol, toIstParts().isoDate);
  }

  async getOptionChain(symbol: UnderlyingSymbol, expiry: string): Promise<OptionChain> {
    const quote = generateQuote(symbol);
    return generateOptionChain(symbol, expiry, quote.ltp, {
      dayChangePercent: quote.changePercent,
    });
  }

  async getHistoricalData(
    symbol: UnderlyingSymbol,
    timeframe: Timeframe,
  ): Promise<HistoricalSeries> {
    const quote = generateQuote(symbol);
    return generateHistoricalSeries(symbol, timeframe, { endPrice: quote.ltp });
  }
}
