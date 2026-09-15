import type {
  DataMode,
  HistoricalSeries,
  MarketSnapshot,
  Quote,
  Timeframe,
  UnderlyingSymbol,
} from "../../types/market";
import type { ExpiryInfo, OptionChain } from "../../types/options";

export type Unsubscribe = () => void;

export interface QuoteUpdate {
  symbol: UnderlyingSymbol;
  quote: Quote;
}

/**
 * The single seam between OptionPulse and whoever supplies market data.
 *
 * Everything above this line (services, store, components) is provider-agnostic.
 * To plug in a licensed vendor later, implement this class - no UI change is
 * required. Provider credentials must never live in a browser-side
 * implementation; use the backend provider instead.
 */
export abstract class MarketDataProvider {
  /** Stable identifier, surfaced in diagnostics. */
  abstract readonly id: string;

  /** Provenance of everything this provider returns. */
  abstract readonly mode: DataMode;

  abstract getIndexQuote(symbol: UnderlyingSymbol): Promise<Quote>;

  abstract getMarketSnapshot(): Promise<MarketSnapshot>;

  abstract getExpiries(symbol: UnderlyingSymbol): Promise<ExpiryInfo[]>;

  abstract getOptionChain(symbol: UnderlyingSymbol, expiry: string): Promise<OptionChain>;

  abstract getHistoricalData(
    symbol: UnderlyingSymbol,
    timeframe: Timeframe,
  ): Promise<HistoricalSeries>;

  /**
   * Optional push channel. Providers that support streaming override this;
   * callers must treat a missing implementation as "poll instead".
   */
  supportsStreaming(): boolean {
    return false;
  }

  subscribeQuotes(
    _symbols: UnderlyingSymbol[],
    _onUpdate: (update: QuoteUpdate) => void,
  ): Unsubscribe {
    return () => {};
  }

  subscribeOptionChain(
    _symbol: UnderlyingSymbol,
    _expiry: string,
    _onUpdate: (chain: OptionChain) => void,
  ): Unsubscribe {
    return () => {};
  }
}

/** Thrown by providers so the UI can distinguish transport failures from bugs. */
export class MarketDataError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "MarketDataError";
  }
}
