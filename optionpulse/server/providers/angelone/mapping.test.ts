import { describe, expect, it } from "vitest";
import type { Candle } from "../../../src/types/market";
import {
  SMARTAPI_INTERVALS,
  batchTokens,
  extractQuoteRecords,
  greekKey,
  indexGreeksByStrike,
  indexQuotesByToken,
  aggregateCandles,
  bestBidAsk,
  candleWindow,
  formatCandleDate,
  mapCandle,
  mapCandles,
  missingQuoteFields,
  pickNumber,
  planForTimeframe,
  type SmartApiCandleRow,
} from "./mapping";

describe("planForTimeframe", () => {
  it("maps every product timeframe onto an interval SmartAPI supports", () => {
    (["1m", "3m", "5m", "15m", "30m", "1H", "1D", "1W", "1M"] as const).forEach((timeframe) => {
      const plan = planForTimeframe(timeframe);
      expect(SMARTAPI_INTERVALS).toContain(plan.interval);
      expect(plan.lookbackDays).toBeGreaterThan(0);
    });
  });

  it("aggregates weekly and monthly from daily, because SmartAPI has neither", () => {
    expect(planForTimeframe("1W")).toMatchObject({ interval: "ONE_DAY", aggregateTo: "week" });
    expect(planForTimeframe("1M")).toMatchObject({ interval: "ONE_DAY", aggregateTo: "month" });
  });

  it("keeps the one-minute lookback inside the documented 30-day cap", () => {
    expect(planForTimeframe("1m").lookbackDays).toBeLessThanOrEqual(30);
  });

  it("does not aggregate intraday timeframes", () => {
    expect(planForTimeframe("15m").aggregateTo).toBeUndefined();
    expect(planForTimeframe("1D").aggregateTo).toBeUndefined();
  });
});

describe("mapCandle", () => {
  it("converts an IST timestamp row to epoch seconds", () => {
    const row: SmartApiCandleRow = ["2026-09-15T09:15:00+05:30", 100, 105, 99, 104, 1200];
    const candle = mapCandle(row)!;
    expect(candle.time).toBe(Date.parse("2026-09-15T03:45:00Z") / 1000);
    expect(candle).toMatchObject({ open: 100, high: 105, low: 99, close: 104, volume: 1200 });
  });

  it("rejects a row with an unparseable timestamp or price", () => {
    expect(mapCandle(["not-a-date", 1, 2, 3, 4, 5] as SmartApiCandleRow)).toBeNull();
    expect(
      mapCandle(["2026-09-15T09:15:00+05:30", Number.NaN, 2, 3, 4, 5] as SmartApiCandleRow),
    ).toBeNull();
  });

  it("defaults a missing volume to zero rather than NaN", () => {
    const row = [
      "2026-09-15T09:15:00+05:30",
      1,
      2,
      0.5,
      1.5,
      null,
    ] as unknown as SmartApiCandleRow;
    expect(mapCandle(row)?.volume).toBe(0);
  });
});

describe("mapCandles", () => {
  it("drops bad rows and returns the rest in ascending time order", () => {
    const rows = [
      ["2026-09-15T09:30:00+05:30", 2, 3, 1, 2, 10],
      ["bad", 1, 1, 1, 1, 1],
      ["2026-09-15T09:15:00+05:30", 1, 2, 1, 2, 5],
    ] as SmartApiCandleRow[];
    const candles = mapCandles(rows);
    expect(candles).toHaveLength(2);
    expect(candles[0].time).toBeLessThan(candles[1].time);
  });
});

describe("aggregateCandles", () => {
  const daily: Candle[] = [
    // Mon 14 Sep to Thu 17 Sep 2026, then the following Monday.
    {
      time: Date.parse("2026-09-14T10:00:00+05:30") / 1000,
      open: 100,
      high: 110,
      low: 95,
      close: 105,
      volume: 10,
    },
    {
      time: Date.parse("2026-09-15T10:00:00+05:30") / 1000,
      open: 105,
      high: 120,
      low: 104,
      close: 118,
      volume: 20,
    },
    {
      time: Date.parse("2026-09-17T10:00:00+05:30") / 1000,
      open: 118,
      high: 119,
      low: 90,
      close: 92,
      volume: 30,
    },
    {
      time: Date.parse("2026-09-21T10:00:00+05:30") / 1000,
      open: 92,
      high: 96,
      low: 91,
      close: 95,
      volume: 40,
    },
  ];

  it("rolls a week into one bar: first open, last close, extreme high and low", () => {
    const weekly = aggregateCandles(daily, "week");
    expect(weekly).toHaveLength(2);
    expect(weekly[0]).toMatchObject({ open: 100, high: 120, low: 90, close: 92, volume: 60 });
    expect(weekly[1]).toMatchObject({ open: 92, close: 95, volume: 40 });
  });

  it("rolls a month into one bar", () => {
    const monthly = aggregateCandles(daily, "month");
    expect(monthly).toHaveLength(1);
    expect(monthly[0]).toMatchObject({ open: 100, high: 120, low: 90, close: 95, volume: 100 });
  });

  it("returns nothing for no input", () => {
    expect(aggregateCandles([], "week")).toEqual([]);
  });
});

describe("formatCandleDate / candleWindow", () => {
  it("formats in IST as YYYY-MM-DD HH:MM", () => {
    expect(formatCandleDate(Date.parse("2026-09-15T03:45:00Z"))).toBe("2026-09-15 09:15");
  });

  it("builds a window that ends now and starts lookbackDays earlier", () => {
    const now = Date.parse("2026-09-15T03:45:00Z");
    const window = candleWindow({ interval: "ONE_DAY", lookbackDays: 2 }, now);
    expect(window.todate).toBe("2026-09-15 09:15");
    expect(window.fromdate).toBe("2026-09-13 09:15");
  });
});

describe("pickNumber", () => {
  it("returns the first candidate field that holds a finite number", () => {
    expect(pickNumber({ b: 5 }, ["a", "b"])).toBe(5);
    expect(pickNumber({ a: 1, b: 5 }, ["a", "b"])).toBe(1);
  });

  it("coerces numeric strings, which SmartAPI sometimes returns", () => {
    expect(pickNumber({ ltp: "25958.70" }, ["ltp"])).toBe(25958.7);
  });

  it("returns null rather than zero when nothing matches", () => {
    // Zero here would be indistinguishable from a real price of zero.
    expect(pickNumber({}, ["ltp"])).toBeNull();
    expect(pickNumber({ ltp: "" }, ["ltp"])).toBeNull();
    expect(pickNumber({ ltp: null }, ["ltp"])).toBeNull();
  });
});

describe("bestBidAsk", () => {
  it("reads the top of the depth ladder", () => {
    const quote = {
      depth: {
        buy: [{ price: 101.2, quantity: 50 }, { price: 101.1 }],
        sell: [{ price: 101.5, quantity: 75 }],
      },
    };
    expect(bestBidAsk(quote)).toEqual({ bid: 101.2, ask: 101.5 });
  });

  it("reports null when depth is absent or empty, never zero", () => {
    expect(bestBidAsk({})).toEqual({ bid: null, ask: null });
    expect(bestBidAsk({ depth: { buy: [], sell: [] } })).toEqual({ bid: null, ask: null });
    expect(bestBidAsk({ depth: { buy: [{ price: 0 }], sell: [{ price: 0 }] } })).toEqual({
      bid: null,
      ask: null,
    });
  });
});

describe("missingQuoteFields", () => {
  it("names nothing when a full payload arrives", () => {
    const quote = {
      ltp: 25958.7,
      open: 26279.8,
      high: 26490.2,
      low: 25750.9,
      close: 26392.3,
      netChange: -433.6,
      percentChange: -1.64,
      tradeVolume: 120000,
      opnInterest: 4500,
      exchFeedTime: 1,
    };
    expect(missingQuoteFields(quote)).toEqual([]);
  });

  it("names exactly what a schema change dropped", () => {
    const quote = { ltp: 1, open: 1, high: 1, low: 1, close: 1 };
    expect(missingQuoteFields(quote)).toEqual([
      "netChange",
      "percentChange",
      "volume",
      "openInterest",
      "exchangeTime",
    ]);
  });
});

describe("extractQuoteRecords", () => {
  it("reads the documented fetched/unfetched envelope", () => {
    const result = extractQuoteRecords({
      fetched: [{ symbolToken: "99926000" }],
      unfetched: [{ symbolToken: "1", message: "no data" }],
    });
    expect(result.fetched).toHaveLength(1);
    expect(result.unfetched).toHaveLength(1);
  });

  it("tolerates a bare array", () => {
    expect(extractQuoteRecords([{ symbolToken: "1" }]).fetched).toHaveLength(1);
  });

  it("returns empty lists for anything else rather than throwing", () => {
    expect(extractQuoteRecords(null)).toEqual({ fetched: [], unfetched: [] });
    expect(extractQuoteRecords("nope")).toEqual({ fetched: [], unfetched: [] });
  });
});

describe("indexQuotesByToken", () => {
  it("accepts the token under any of its spellings, string or number", () => {
    const map = indexQuotesByToken([
      { symbolToken: "99926000", ltp: 1 },
      { symboltoken: "99926009", ltp: 2 },
      { token: 12345, ltp: 3 },
    ]);
    expect(map.get("99926000")?.ltp).toBe(1);
    expect(map.get("99926009")?.ltp).toBe(2);
    expect(map.get("12345")?.ltp).toBe(3);
  });

  it("skips records with no usable token", () => {
    expect(indexQuotesByToken([{ ltp: 1 }]).size).toBe(0);
  });
});

describe("batchTokens", () => {
  it("splits into batches no larger than the limit", () => {
    const batches = batchTokens(
      Array.from({ length: 122 }, (_, i) => i),
      50,
    );
    expect(batches.map((b) => b.length)).toEqual([50, 50, 22]);
  });

  it("returns nothing for an empty list", () => {
    expect(batchTokens([], 50)).toEqual([]);
  });
});

describe("indexGreeksByStrike", () => {
  it("joins greek rows by strike and option type", () => {
    const map = indexGreeksByStrike([
      { strikePrice: "25900", optionType: "CE", delta: "0.52", impliedVolatility: "13.4" },
      { strikePrice: 25900, optionType: "pe", delta: -0.48 },
    ]);
    expect(map.get(greekKey(25900, "CE"))?.delta).toBe("0.52");
    expect(map.get(greekKey(25900, "PE"))?.delta).toBe(-0.48);
  });

  it("ignores rows with an unusable strike or option type", () => {
    expect(indexGreeksByStrike([{ strikePrice: "abc", optionType: "CE" }]).size).toBe(0);
    expect(indexGreeksByStrike([{ strikePrice: 100, optionType: "XX" }]).size).toBe(0);
  });
});
