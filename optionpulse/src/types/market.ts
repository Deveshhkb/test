/** Core market-domain types shared by the frontend, the API layer and the backend. */

/** Internal identifiers for the instruments this product analyses. */
export type UnderlyingSymbol = "NIFTY" | "BANKNIFTY" | "SENSEX";

/**
 * Provenance of every number rendered in the UI. This is deliberately explicit:
 * the product must never present simulated numbers as live market data.
 */
export type DataMode = "MOCK" | "DELAYED" | "LIVE" | "CALCULATED" | "ESTIMATED";

export type MarketPhase = "PRE_OPEN" | "OPEN" | "CLOSED" | "WEEKEND" | "HOLIDAY";

export interface MarketStatus {
  phase: MarketPhase;
  /** True only during continuous trading. */
  isOpen: boolean;
  label: string;
  /** IST wall-clock time the status was evaluated for, ISO-8601. */
  asOf: string;
  /** Milliseconds until the next phase change, when it can be determined. */
  msToNextChange: number | null;
  nextChangeLabel: string | null;
}

export interface Quote {
  symbol: UnderlyingSymbol;
  name: string;
  ltp: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  /** Epoch milliseconds of the last update from the provider. */
  timestamp: number;
  mode: DataMode;
}

export interface VixQuote {
  value: number;
  change: number;
  changePercent: number;
  timestamp: number;
  mode: DataMode;
}

export interface MarketBreadth {
  advances: number;
  declines: number;
  unchanged: number;
  /** advances / declines, guarded against division by zero. */
  advanceDeclineRatio: number;
  mode: DataMode;
}

/** Net institutional cash-market activity for the session, in INR crore. */
export interface InstitutionalActivity {
  date: string;
  fiiNetCrore: number;
  diiNetCrore: number;
  mode: DataMode;
}

export interface MarketSnapshot {
  quotes: Record<UnderlyingSymbol, Quote>;
  vix: VixQuote | null;
  /**
   * Nullable on purpose. Broker APIs generally do not publish index-wide
   * breadth or institutional cash flow, and a provider that cannot supply them
   * must return null so the UI can say "not available from this provider"
   * instead of showing a number nobody measured.
   */
  breadth: MarketBreadth | null;
  institutional: InstitutionalActivity | null;
  status: MarketStatus;
}

export type Timeframe = "1m" | "3m" | "5m" | "15m" | "30m" | "1H" | "1D" | "1W" | "1M";

export interface Candle {
  /** Epoch seconds (UTC) - the unit expected by most charting libraries. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalSeries {
  symbol: UnderlyingSymbol;
  timeframe: Timeframe;
  candles: Candle[];
  mode: DataMode;
  /** Epoch milliseconds when the series was produced. */
  generatedAt: number;
}

export type BiasLabel =
  "STRONG_BULLISH" | "BULLISH" | "SIDEWAYS" | "BEARISH" | "STRONG_BEARISH";

export interface BiasFactor {
  key: string;
  label: string;
  /** Contribution to the total score, typically in the -2..+2 range. */
  score: number;
  /** Plain-language reason, shown in the UI so the score is never a black box. */
  detail: string;
}

export interface MarketBiasResult {
  label: BiasLabel;
  score: number;
  /** 0-100 confidence-style measure derived from |score| and factor agreement. */
  strength: number;
  factors: BiasFactor[];
  mode: DataMode;
}
