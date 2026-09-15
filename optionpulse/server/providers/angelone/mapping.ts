import type { Candle, Timeframe } from "../../../src/types/market";

/**
 * Pure mappers from SmartAPI payloads to OptionPulse domain types.
 *
 * Kept free of I/O so every shape decision below is covered by tests rather
 * than discovered in production.
 */

/** SmartAPI's supported candle intervals. There is no weekly or monthly one. */
export const SMARTAPI_INTERVALS = [
  "ONE_MINUTE",
  "THREE_MINUTE",
  "FIVE_MINUTE",
  "TEN_MINUTE",
  "FIFTEEN_MINUTE",
  "THIRTY_MINUTE",
  "ONE_HOUR",
  "ONE_DAY",
] as const;

export type SmartApiInterval = (typeof SMARTAPI_INTERVALS)[number];

export interface IntervalPlan {
  interval: SmartApiInterval;
  /** Set when the timeframe must be rolled up from a smaller interval. */
  aggregateTo?: "week" | "month";
  /** Calendar days of history to request. */
  lookbackDays: number;
}

/**
 * Maps a product timeframe onto what SmartAPI can actually serve.
 *
 * Weekly and monthly candles are not offered, so they are aggregated from
 * daily bars rather than quietly dropped from the timeframe selector.
 * Lookbacks respect the documented per-interval history limits (one-minute
 * data, for instance, is capped at 30 days per request).
 */
export function planForTimeframe(timeframe: Timeframe): IntervalPlan {
  switch (timeframe) {
    case "1m":
      return { interval: "ONE_MINUTE", lookbackDays: 5 };
    case "3m":
      return { interval: "THREE_MINUTE", lookbackDays: 10 };
    case "5m":
      return { interval: "FIVE_MINUTE", lookbackDays: 15 };
    case "15m":
      return { interval: "FIFTEEN_MINUTE", lookbackDays: 40 };
    case "30m":
      return { interval: "THIRTY_MINUTE", lookbackDays: 70 };
    case "1H":
      return { interval: "ONE_HOUR", lookbackDays: 120 };
    case "1D":
      return { interval: "ONE_DAY", lookbackDays: 400 };
    case "1W":
      return { interval: "ONE_DAY", aggregateTo: "week", lookbackDays: 1200 };
    case "1M":
      return { interval: "ONE_DAY", aggregateTo: "month", lookbackDays: 2400 };
  }
}

/** SmartAPI candle rows: [timestamp, open, high, low, close, volume]. */
export type SmartApiCandleRow = [string, number, number, number, number, number];

export function mapCandle(row: SmartApiCandleRow): Candle | null {
  const [timestamp, open, high, low, close, volume] = row;
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return null;
  if (![open, high, low, close].every((value) => Number.isFinite(value))) return null;
  return {
    time: Math.floor(parsed / 1000),
    open,
    high,
    low,
    close,
    volume: Number.isFinite(volume) ? volume : 0,
  };
}

export function mapCandles(rows: SmartApiCandleRow[]): Candle[] {
  return rows
    .map(mapCandle)
    .filter((candle): candle is Candle => candle !== null)
    .sort((a, b) => a.time - b.time);
}

/** Bucket key for weekly (ISO week start) and monthly aggregation, in IST. */
function bucketKey(timeSeconds: number, unit: "week" | "month"): string {
  const date = new Date(timeSeconds * 1000 + 5.5 * 3600 * 1000);
  if (unit === "month") {
    return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
  }
  // Roll back to Monday so a week is one bucket.
  const day = (date.getUTCDay() + 6) % 7;
  const monday = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day);
  return `w${monday}`;
}

/**
 * Rolls daily candles up into weekly or monthly bars: first open, last close,
 * extreme high and low, summed volume.
 */
export function aggregateCandles(candles: Candle[], unit: "week" | "month"): Candle[] {
  const buckets = new Map<string, Candle>();
  for (const candle of candles) {
    const key = bucketKey(candle.time, unit);
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, { ...candle });
      continue;
    }
    existing.high = Math.max(existing.high, candle.high);
    existing.low = Math.min(existing.low, candle.low);
    existing.close = candle.close;
    existing.volume += candle.volume;
  }
  return [...buckets.values()].sort((a, b) => a.time - b.time);
}

/** `YYYY-MM-DD HH:MM` in IST, the format getCandleData expects. */
export function formatCandleDate(epochMs: number): string {
  const ist = new Date(epochMs + 5.5 * 3600 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}` +
    ` ${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`
  );
}

export function candleWindow(
  plan: IntervalPlan,
  now = Date.now(),
): { fromdate: string; todate: string } {
  return {
    fromdate: formatCandleDate(now - plan.lookbackDays * 86_400_000),
    todate: formatCandleDate(now),
  };
}

/**
 * Reads a numeric field, accepting the spellings SmartAPI is known to use.
 *
 * Angel One does not publish a machine-readable schema for the quote payload,
 * so rather than assume one spelling and silently render zeros, every field is
 * looked up through a list of candidates and reports absence as null.
 */
export function pickNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

/** Field candidates for each quote value, most likely first. */
export const QUOTE_FIELDS = {
  ltp: ["ltp", "lastTradedPrice", "last_traded_price"],
  open: ["open", "openPrice"],
  high: ["high", "highPrice"],
  low: ["low", "lowPrice"],
  close: ["close", "closePrice", "previousClose", "prevClose"],
  netChange: ["netChange", "change", "net_change"],
  percentChange: ["percentChange", "changePercent", "percent_change"],
  volume: ["tradeVolume", "volume", "totalTradedVolume", "volumeTradedToday"],
  openInterest: ["opnInterest", "openInterest", "oi"],
  exchangeTime: ["exchFeedTime", "exchTradeTime", "feedTime"],
} as const;

export interface QuoteDepthLevel {
  price?: number;
  quantity?: number;
}

/** Best bid and ask from the FULL-mode depth ladder, when present. */
export function bestBidAsk(source: Record<string, unknown>): {
  bid: number | null;
  ask: number | null;
} {
  const depth = source.depth as
    { buy?: QuoteDepthLevel[]; sell?: QuoteDepthLevel[] } | undefined;
  const bid = depth?.buy?.[0]?.price;
  const ask = depth?.sell?.[0]?.price;
  return {
    bid: typeof bid === "number" && bid > 0 ? bid : null,
    ask: typeof ask === "number" && ask > 0 ? ask : null,
  };
}

/**
 * Names the quote fields a payload did NOT supply.
 *
 * Logged once on the first live response so a schema change announces itself
 * immediately instead of showing up as a column of zeros.
 */
export function missingQuoteFields(source: Record<string, unknown>): string[] {
  return (Object.keys(QUOTE_FIELDS) as Array<keyof typeof QUOTE_FIELDS>).filter(
    (field) => pickNumber(source, [...QUOTE_FIELDS[field]]) === null,
  );
}

/**
 * Pulls the quote records out of a /quote response.
 *
 * SmartAPI returns `{ fetched: [...], unfetched: [...] }`, but the shape is
 * accepted defensively so a bare array does not break the provider. Anything
 * listed as unfetched is reported rather than silently treated as absent.
 */
export function extractQuoteRecords(data: unknown): {
  fetched: Array<Record<string, unknown>>;
  unfetched: Array<Record<string, unknown>>;
} {
  if (Array.isArray(data)) {
    return { fetched: data as Array<Record<string, unknown>>, unfetched: [] };
  }
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const fetched = Array.isArray(record.fetched)
      ? (record.fetched as Array<Record<string, unknown>>)
      : [];
    const unfetched = Array.isArray(record.unfetched)
      ? (record.unfetched as Array<Record<string, unknown>>)
      : [];
    return { fetched, unfetched };
  }
  return { fetched: [], unfetched: [] };
}

/** Indexes quote records by the symbol token they carry. */
export function indexQuotesByToken(
  records: Array<Record<string, unknown>>,
): Map<string, Record<string, unknown>> {
  const byToken = new Map<string, Record<string, unknown>>();
  for (const record of records) {
    const token = record.symbolToken ?? record.symboltoken ?? record.token;
    if (typeof token === "string" && token !== "") byToken.set(token, record);
    else if (typeof token === "number") byToken.set(String(token), record);
  }
  return byToken;
}

/** Splits a token list into batches the quote endpoint will accept. */
export function batchTokens<T>(tokens: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < tokens.length; i += size) batches.push(tokens.slice(i, i + size));
  return batches;
}

export interface OptionGreekRow {
  name?: string;
  expiry?: string;
  strikePrice?: string | number;
  optionType?: string;
  delta?: string | number;
  gamma?: string | number;
  theta?: string | number;
  vega?: string | number;
  impliedVolatility?: string | number;
  tradeVolume?: string | number;
}

/** Key used to join optionGreek rows onto chain strikes. */
export function greekKey(strike: number, optionType: string): string {
  return `${Math.round(strike * 100)}:${optionType.toUpperCase()}`;
}

export function indexGreeksByStrike(rows: OptionGreekRow[]): Map<string, OptionGreekRow> {
  const byStrike = new Map<string, OptionGreekRow>();
  for (const row of rows) {
    const strike = Number(row.strikePrice);
    const type = String(row.optionType ?? "").toUpperCase();
    if (!Number.isFinite(strike) || (type !== "CE" && type !== "PE")) continue;
    byStrike.set(greekKey(strike, type), row);
  }
  return byStrike;
}
