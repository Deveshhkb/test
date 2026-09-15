import type {
  DataMode,
  HistoricalSeries,
  MarketSnapshot,
  Quote,
  Timeframe,
  UnderlyingSymbol,
} from "../../types/market";
import type { ExpiryInfo, OptionChain } from "../../types/options";
import { MarketDataError, MarketDataProvider } from "./MarketDataProvider";

/**
 * Talks to the OptionPulse backend, which owns any vendor credentials.
 *
 * The browser never sees a provider key: it only ever calls our own API.
 */
export class HttpMarketDataProvider extends MarketDataProvider {
  readonly id = "http";

  constructor(
    private readonly baseUrl: string,
    readonly mode: DataMode = "MOCK",
  ) {
    super();
  }

  private async request<T>(path: string, signal?: AbortSignal): Promise<T> {
    const url = `${this.baseUrl.replace(/\/$/, "")}${path}`;
    let response: Response;
    try {
      response = await fetch(url, { signal, headers: { Accept: "application/json" } });
    } catch (error) {
      throw new MarketDataError("Could not reach the market-data service.", error);
    }
    if (!response.ok) {
      throw new MarketDataError(`Market-data service returned ${response.status} for ${path}.`);
    }
    const payload = (await response.json()) as { data?: T };
    if (payload?.data === undefined) {
      throw new MarketDataError(`Malformed response from ${path}.`);
    }
    return payload.data;
  }

  getIndexQuote(symbol: UnderlyingSymbol): Promise<Quote> {
    return this.request<Quote>(`/market/index/${symbol}`);
  }

  getMarketSnapshot(): Promise<MarketSnapshot> {
    return this.request<MarketSnapshot>("/market/indices");
  }

  getExpiries(symbol: UnderlyingSymbol): Promise<ExpiryInfo[]> {
    return this.request<ExpiryInfo[]>(`/options/expiries/${symbol}`);
  }

  getOptionChain(symbol: UnderlyingSymbol, expiry: string): Promise<OptionChain> {
    return this.request<OptionChain>(
      `/options/chain/${symbol}?expiry=${encodeURIComponent(expiry)}`,
    );
  }

  getHistoricalData(symbol: UnderlyingSymbol, timeframe: Timeframe): Promise<HistoricalSeries> {
    return this.request<HistoricalSeries>(
      `/options/history/${symbol}?timeframe=${encodeURIComponent(timeframe)}`,
    );
  }
}
