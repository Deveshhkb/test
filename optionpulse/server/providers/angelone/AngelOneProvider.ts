import { getUnderlyingConfig } from "../../../src/config/underlyings";
import type {
  DataMode,
  HistoricalSeries,
  MarketSnapshot,
  Quote,
  Timeframe,
  UnderlyingSymbol,
} from "../../../src/types/market";
import type {
  ExpiryInfo,
  OptionChain,
  OptionChainRow,
  OptionLeg,
} from "../../../src/types/options";
import { getMarketStatus } from "../../../src/utils/marketStatus";
import { daysBetweenIso, formatExpiryLabel, toIstParts } from "../../../src/utils/time";
import type { ServerMarketDataProvider } from "../ServerMarketDataProvider";
import { QUOTE_BATCH_SIZE, ROUTES, type SmartApiTransport } from "./AngelOneClient";
import {
  getExpiryLadder,
  getIndexInstrument,
  getVixInstrument,
  inferStrikeInterval,
  listExpiries,
  type OptionInstrument,
} from "./instrumentMaster";
import { InstrumentMasterStore } from "./instrumentMasterStore";
import {
  QUOTE_FIELDS,
  aggregateCandles,
  batchTokens,
  bestBidAsk,
  candleWindow,
  extractQuoteRecords,
  greekKey,
  indexGreeksByStrike,
  indexQuotesByToken,
  mapCandles,
  missingQuoteFields,
  pickNumber,
  planForTimeframe,
  type OptionGreekRow,
  type SmartApiCandleRow,
} from "./mapping";

/**
 * Angel One SmartAPI provider.
 *
 * What SmartAPI can supply: index quotes, option quotes with open interest,
 * historical candles and published option greeks. What it cannot: index-wide
 * advance/decline breadth and FII/DII cash flow. Those are returned as null
 * rather than filled in with something plausible.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/** Quotes are cached briefly: the endpoint allows one request per second. */
const OPEN_MARKET_TTL_MS = 2500;
const CLOSED_MARKET_TTL_MS = 60_000;

export class AngelOneProvider implements ServerMarketDataProvider {
  readonly id = "angelone";

  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private loggedQuoteSchema = false;

  constructor(
    private readonly client: SmartApiTransport,
    private readonly instruments: InstrumentMasterStore,
    private readonly mode: DataMode = "LIVE",
  ) {}

  private ttl(): number {
    return getMarketStatus().isOpen ? OPEN_MARKET_TTL_MS : CLOSED_MARKET_TTL_MS;
  }

  private async cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const existing = this.cache.get(key);
    if (existing && existing.expiresAt > Date.now()) return existing.value as T;
    const value = await load();
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttl() });
    return value;
  }

  /** One /quote call for a set of tokens grouped by exchange segment. */
  private async fetchQuotes(
    tokensBySegment: Record<string, string[]>,
  ): Promise<Map<string, Record<string, unknown>>> {
    const data = await this.client.post<unknown>(
      ROUTES.quote,
      { mode: "FULL", exchangeTokens: tokensBySegment },
      "quote",
    );
    const { fetched, unfetched } = extractQuoteRecords(data);

    if (unfetched.length > 0) {
      console.warn(
        `[optionpulse] SmartAPI could not quote ${unfetched.length} instrument(s) in this batch.`,
      );
    }
    // Announce a schema change the first time we see one, instead of letting it
    // surface as a screen full of dashes.
    if (!this.loggedQuoteSchema && fetched[0]) {
      this.loggedQuoteSchema = true;
      const missing = missingQuoteFields(fetched[0]);
      if (missing.length > 0) {
        console.warn(
          `[optionpulse] SmartAPI quote payload is missing expected field(s): ${missing.join(", ")}.`,
          `Received keys: ${Object.keys(fetched[0]).join(", ")}`,
        );
      }
    }
    return indexQuotesByToken(fetched);
  }

  private toQuote(
    symbol: UnderlyingSymbol,
    record: Record<string, unknown> | undefined,
  ): Quote | null {
    if (!record) return null;
    const ltp = pickNumber(record, [...QUOTE_FIELDS.ltp]);
    if (ltp === null) return null;

    const previousClose = pickNumber(record, [...QUOTE_FIELDS.close]) ?? ltp;
    const change = pickNumber(record, [...QUOTE_FIELDS.netChange]) ?? ltp - previousClose;
    const changePercent =
      pickNumber(record, [...QUOTE_FIELDS.percentChange]) ??
      (previousClose !== 0 ? (change / previousClose) * 100 : 0);
    const exchangeTime = pickNumber(record, [...QUOTE_FIELDS.exchangeTime]);

    return {
      symbol,
      name: getUnderlyingConfig(symbol).name,
      ltp,
      change,
      changePercent,
      open: pickNumber(record, [...QUOTE_FIELDS.open]) ?? ltp,
      high: pickNumber(record, [...QUOTE_FIELDS.high]) ?? ltp,
      low: pickNumber(record, [...QUOTE_FIELDS.low]) ?? ltp,
      previousClose,
      timestamp: exchangeTime && exchangeTime > 1e12 ? exchangeTime : Date.now(),
      mode: this.mode,
    };
  }

  async getMarketSnapshot(): Promise<MarketSnapshot> {
    return this.cached("snapshot", async () => {
      const index = await this.instruments.get();
      const symbols: UnderlyingSymbol[] = ["NIFTY", "BANKNIFTY", "SENSEX"];

      const tokensBySegment: Record<string, string[]> = {};
      const tokenBySymbol = new Map<UnderlyingSymbol, string>();
      for (const symbol of symbols) {
        const instrument = getIndexInstrument(index, symbol);
        if (!instrument) continue;
        tokenBySymbol.set(symbol, instrument.token);
        (tokensBySegment[instrument.exchange] ??= []).push(instrument.token);
      }
      const vix = getVixInstrument(index);
      if (vix) (tokensBySegment[vix.exchange] ??= []).push(vix.token);

      const quotes = await this.fetchQuotes(tokensBySegment);

      const mapped = {} as Record<UnderlyingSymbol, Quote>;
      for (const symbol of symbols) {
        const token = tokenBySymbol.get(symbol);
        const quote = this.toQuote(symbol, token ? quotes.get(token) : undefined);
        if (quote) mapped[symbol] = quote;
      }

      const vixRecord = vix ? quotes.get(vix.token) : undefined;
      const vixLtp = vixRecord ? pickNumber(vixRecord, [...QUOTE_FIELDS.ltp]) : null;

      return {
        quotes: mapped,
        vix:
          vixRecord && vixLtp !== null
            ? {
                value: vixLtp,
                change: pickNumber(vixRecord, [...QUOTE_FIELDS.netChange]) ?? 0,
                changePercent: pickNumber(vixRecord, [...QUOTE_FIELDS.percentChange]) ?? 0,
                timestamp: Date.now(),
                mode: this.mode,
              }
            : null,
        // SmartAPI publishes neither of these. Null, never a stand-in.
        breadth: null,
        institutional: null,
        status: getMarketStatus(),
      };
    });
  }

  async getIndexQuote(symbol: UnderlyingSymbol): Promise<Quote> {
    const snapshot = await this.getMarketSnapshot();
    const quote = snapshot.quotes[symbol];
    if (!quote) throw new Error(`SmartAPI did not return a quote for ${symbol}.`);
    return quote;
  }

  async getExpiries(symbol: UnderlyingSymbol): Promise<ExpiryInfo[]> {
    const index = await this.instruments.get();
    const today = toIstParts().isoDate;
    const dates = listExpiries(index, symbol).filter(
      (date) => daysBetweenIso(today, date) >= 0,
    );

    // An expiry is "monthly" when it is the last one listed in its month.
    const lastOfMonth = new Set<string>();
    const byMonth = new Map<string, string>();
    for (const date of dates) byMonth.set(date.slice(0, 7), date);
    for (const date of byMonth.values()) lastOfMonth.add(date);

    return dates.map((date) => ({
      date,
      label: formatExpiryLabel(date),
      daysToExpiry: daysBetweenIso(today, date),
      isWeekly: !lastOfMonth.has(date),
    }));
  }

  async getOptionChain(symbol: UnderlyingSymbol, expiry: string): Promise<OptionChain> {
    return this.cached(`chain:${symbol}:${expiry}`, async () => {
      const index = await this.instruments.get();
      const ladder = getExpiryLadder(index, symbol, expiry);
      if (ladder.length === 0) {
        throw new Error(`No listed contracts for ${symbol} expiring ${expiry}.`);
      }

      const spotQuote = await this.getIndexQuote(symbol);
      const spot = spotQuote.ltp;

      const config = getUnderlyingConfig(symbol);
      const strikes = [...new Set(ladder.map((option) => option.strike))];
      const strikeInterval = inferStrikeInterval(strikes, spot) ?? config.strikeInterval;

      // Quote only the strikes around the money: the full ladder can be 180+
      // contracts, and the quote endpoint allows one request per second.
      const wanted = nearestStrikes(strikes, spot, config.defaultStrikeDepth);
      const contracts = ladder.filter((option) => wanted.has(option.strike));

      const segment = contracts[0]?.exchange ?? config.exchange;
      const quotes = new Map<string, Record<string, unknown>>();
      for (const batch of batchTokens(contracts, QUOTE_BATCH_SIZE)) {
        const batchQuotes = await this.fetchQuotes({
          [segment]: batch.map((option) => option.token),
        });
        batchQuotes.forEach((value, key) => quotes.set(key, value));
      }

      const greeks = await this.fetchGreeks(symbol, contracts[0]?.expiryRaw);

      const byStrike = new Map<number, { call?: OptionInstrument; put?: OptionInstrument }>();
      for (const option of contracts) {
        const entry = byStrike.get(option.strike) ?? {};
        if (option.optionType === "CE") entry.call = option;
        else entry.put = option;
        byStrike.set(option.strike, entry);
      }

      const rows: OptionChainRow[] = [...byStrike.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([strike, pair]) => ({
          strike,
          call: this.toLeg("CE", strike, pair.call, quotes, greeks),
          put: this.toLeg("PE", strike, pair.put, quotes, greeks),
        }));

      return {
        symbol,
        expiry,
        spot,
        strikeInterval,
        rows,
        timestamp: Date.now(),
        mode: this.mode,
      };
    });
  }

  /** Published greeks and IV for the whole expiry, in one call. */
  private async fetchGreeks(
    symbol: UnderlyingSymbol,
    expiryRaw: string | undefined,
  ): Promise<Map<string, OptionGreekRow>> {
    if (!expiryRaw) return new Map();
    try {
      const rows = await this.client.post<OptionGreekRow[]>(
        ROUTES.optionGreek,
        { name: symbol, expirydate: expiryRaw },
        "optionGreek",
      );
      return indexGreeksByStrike(Array.isArray(rows) ? rows : []);
    } catch (error) {
      // Greeks are an enhancement; a chain without them is still useful, and
      // the UI falls back to its own calculated values.
      console.warn(`[optionpulse] SmartAPI optionGreek unavailable for ${symbol}.`, error);
      return new Map();
    }
  }

  private toLeg(
    optionType: "CE" | "PE",
    strike: number,
    instrument: OptionInstrument | undefined,
    quotes: Map<string, Record<string, unknown>>,
    greeks: Map<string, OptionGreekRow>,
  ): OptionLeg {
    const record = instrument ? quotes.get(instrument.token) : undefined;
    const greek = greeks.get(greekKey(strike, optionType));

    const ltp = record ? (pickNumber(record, [...QUOTE_FIELDS.ltp]) ?? 0) : 0;
    const previousClose = record ? (pickNumber(record, [...QUOTE_FIELDS.close]) ?? ltp) : ltp;
    const change = record
      ? (pickNumber(record, [...QUOTE_FIELDS.netChange]) ?? ltp - previousClose)
      : 0;
    const { bid, ask } = record ? bestBidAsk(record) : { bid: null, ask: null };
    const iv = greek ? Number(greek.impliedVolatility) : Number.NaN;

    return {
      optionType,
      strike,
      ltp,
      change,
      changePercent:
        record && previousClose !== 0
          ? (pickNumber(record, [...QUOTE_FIELDS.percentChange]) ??
            (change / previousClose) * 100)
          : 0,
      bid: bid ?? ltp,
      ask: ask ?? ltp,
      volume: record ? (pickNumber(record, [...QUOTE_FIELDS.volume]) ?? 0) : 0,
      openInterest: record ? (pickNumber(record, [...QUOTE_FIELDS.openInterest]) ?? 0) : 0,
      // SmartAPI's quote carries open interest but not the day's OI change;
      // it is left at zero rather than invented, and the buildup panel treats
      // zero as "no classification".
      changeInOpenInterest: 0,
      impliedVolatility: Number.isFinite(iv) ? iv : 0,
      greeks: greek
        ? {
            delta: Number(greek.delta) || 0,
            gamma: Number(greek.gamma) || 0,
            theta: Number(greek.theta) || 0,
            vega: Number(greek.vega) || 0,
            impliedVolatility: Number.isFinite(iv) ? iv : undefined,
            source: "MARKET",
          }
        : undefined,
    };
  }

  async getHistoricalData(
    symbol: UnderlyingSymbol,
    timeframe: Timeframe,
  ): Promise<HistoricalSeries> {
    return this.cached(`history:${symbol}:${timeframe}`, async () => {
      const index = await this.instruments.get();
      const instrument = getIndexInstrument(index, symbol);
      if (!instrument) throw new Error(`No index instrument found for ${symbol}.`);

      const plan = planForTimeframe(timeframe);
      const window = candleWindow(plan);
      const rows = await this.client.post<SmartApiCandleRow[]>(
        ROUTES.candles,
        {
          exchange: instrument.exchange,
          symboltoken: instrument.token,
          interval: plan.interval,
          ...window,
        },
        "candles",
      );

      const candles = mapCandles(Array.isArray(rows) ? rows : []);
      return {
        symbol,
        timeframe,
        candles: plan.aggregateTo ? aggregateCandles(candles, plan.aggregateTo) : candles,
        mode: this.mode,
        generatedAt: Date.now(),
      };
    });
  }
}

/** The `depth` strikes nearest to spot, either side. */
export function nearestStrikes(strikes: number[], spot: number, depth: number): Set<number> {
  const sorted = [...strikes].sort((a, b) => Math.abs(a - spot) - Math.abs(b - spot));
  return new Set(sorted.slice(0, depth * 2 + 1));
}
