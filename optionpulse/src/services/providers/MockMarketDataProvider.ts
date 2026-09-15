import { UNDERLYING_LIST } from "../../config/underlyings";
import {
  generateBreadth,
  generateInstitutionalActivity,
  generateQuote,
  generateVix,
} from "../../mock/mockMarketData";
import { generateHistoricalSeries } from "../../mock/mockHistoricalData";
import { generateOptionChain } from "../../mock/mockOptionChain";
import type {
  DataMode,
  HistoricalSeries,
  MarketSnapshot,
  Quote,
  Timeframe,
  UnderlyingSymbol,
} from "../../types/market";
import type { ExpiryInfo, OptionChain } from "../../types/options";
import { generateExpiries } from "../../utils/expiries";
import { getMarketStatus } from "../../utils/marketStatus";
import { toIstParts } from "../../utils/time";
import { MarketDataProvider, type QuoteUpdate, type Unsubscribe } from "./MarketDataProvider";

/**
 * In-browser provider used for development and demos.
 *
 * It deliberately behaves like a network provider - async, with a small
 * simulated latency - so swapping in a real provider does not change any
 * calling code. Everything it returns is tagged MOCK.
 */
export class MockMarketDataProvider extends MarketDataProvider {
  readonly id = "mock";
  readonly mode: DataMode = "MOCK";

  /** Simulated round-trip latency in milliseconds. */
  constructor(private readonly latencyMs = 180) {
    super();
  }

  private delay<T>(value: T): Promise<T> {
    if (this.latencyMs <= 0) return Promise.resolve(value);
    return new Promise((resolve) => setTimeout(() => resolve(value), this.latencyMs));
  }

  async getIndexQuote(symbol: UnderlyingSymbol): Promise<Quote> {
    return this.delay(generateQuote(symbol));
  }

  async getMarketSnapshot(): Promise<MarketSnapshot> {
    const now = Date.now();
    const quotes = UNDERLYING_LIST.reduce(
      (acc, config) => {
        acc[config.symbol] = generateQuote(config.symbol, now);
        return acc;
      },
      {} as Record<UnderlyingSymbol, Quote>,
    );

    return this.delay({
      quotes,
      vix: generateVix(now),
      breadth: generateBreadth(now),
      institutional: generateInstitutionalActivity(now),
      status: getMarketStatus(now),
    });
  }

  async getExpiries(symbol: UnderlyingSymbol): Promise<ExpiryInfo[]> {
    return this.delay(generateExpiries(symbol, toIstParts().isoDate));
  }

  async getOptionChain(symbol: UnderlyingSymbol, expiry: string): Promise<OptionChain> {
    const quote = generateQuote(symbol);
    return this.delay(
      generateOptionChain(symbol, expiry, quote.ltp, {
        dayChangePercent: quote.changePercent,
      }),
    );
  }

  async getHistoricalData(
    symbol: UnderlyingSymbol,
    timeframe: Timeframe,
  ): Promise<HistoricalSeries> {
    const quote = generateQuote(symbol);
    return this.delay(generateHistoricalSeries(symbol, timeframe, { endPrice: quote.ltp }));
  }

  /**
   * Mock streaming: a timer stands in for a websocket so the realtime plumbing
   * in the store can be exercised before a real feed exists.
   */
  supportsStreaming(): boolean {
    return true;
  }

  subscribeQuotes(
    symbols: UnderlyingSymbol[],
    onUpdate: (update: QuoteUpdate) => void,
    intervalMs = 3000,
  ): Unsubscribe {
    const timer = setInterval(() => {
      const now = Date.now();
      symbols.forEach((symbol) => onUpdate({ symbol, quote: generateQuote(symbol, now) }));
    }, intervalMs);
    return () => clearInterval(timer);
  }

  subscribeOptionChain(
    symbol: UnderlyingSymbol,
    expiry: string,
    onUpdate: (chain: OptionChain) => void,
    intervalMs = 5000,
  ): Unsubscribe {
    const timer = setInterval(() => {
      const quote = generateQuote(symbol);
      onUpdate(
        generateOptionChain(symbol, expiry, quote.ltp, {
          dayChangePercent: quote.changePercent,
        }),
      );
    }, intervalMs);
    return () => clearInterval(timer);
  }
}
