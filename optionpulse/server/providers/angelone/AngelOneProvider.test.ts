import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SCRIP_MASTER_FIXTURE } from "./__fixtures__/scripMaster";
import { AngelOneProvider, nearestStrikes } from "./AngelOneProvider";
import { ROUTES, type SmartApiTransport } from "./AngelOneClient";
import { InstrumentMasterStore } from "./instrumentMasterStore";

/**
 * Exercises the provider against a fake SmartAPI transport, so chain assembly,
 * batching and field mapping are all covered without credentials or network.
 */

interface Call {
  route: string;
  body: unknown;
}

function quoteRecord(token: string, overrides: Record<string, unknown> = {}) {
  return {
    symbolToken: token,
    ltp: 25958.7,
    open: 26279.83,
    high: 26490.21,
    low: 25750.91,
    close: 26392.29,
    netChange: -433.59,
    percentChange: -1.64,
    tradeVolume: 120_000,
    opnInterest: 450_000,
    depth: { buy: [{ price: 100.1 }], sell: [{ price: 100.6 }] },
    ...overrides,
  };
}

function createTransport(overrides: Partial<Record<string, unknown>> = {}) {
  const calls: Call[] = [];
  const transport: SmartApiTransport = {
    async post<T>(route: string, body: unknown): Promise<T> {
      calls.push({ route, body });
      if (route === ROUTES.quote) {
        const tokens = Object.values(
          (body as { exchangeTokens: Record<string, string[]> }).exchangeTokens,
        ).flat();
        return {
          fetched: tokens.map((token) => quoteRecord(token)),
          unfetched: [],
        } as T;
      }
      if (route === ROUTES.optionGreek) {
        return (overrides[ROUTES.optionGreek] ?? [
          {
            strikePrice: "25800",
            optionType: "CE",
            delta: "0.58",
            gamma: "0.0004",
            theta: "-8.1",
            vega: "12.4",
            impliedVolatility: "13.62",
          },
        ]) as T;
      }
      if (route === ROUTES.candles) {
        return [
          ["2026-09-14T15:30:00+05:30", 100, 110, 95, 105, 10],
          ["2026-09-15T15:30:00+05:30", 105, 120, 104, 118, 20],
        ] as T;
      }
      throw new Error(`Unexpected route ${route}`);
    },
    async get<T>(): Promise<T> {
      throw new Error("not used");
    },
  };
  return { transport, calls };
}

async function createProvider(overrides?: Partial<Record<string, unknown>>) {
  const dir = await mkdtemp(join(tmpdir(), "optionpulse-provider-"));
  const instruments = new InstrumentMasterStore({
    cacheFile: join(dir, "instruments.json"),
    fetchRows: async () => SCRIP_MASTER_FIXTURE,
  });
  const { transport, calls } = createTransport(overrides);
  return { provider: new AngelOneProvider(transport, instruments, "LIVE"), calls };
}

describe("nearestStrikes", () => {
  it("keeps the requested depth either side of spot", () => {
    const strikes = [25700, 25750, 25800, 25850, 25900, 25950, 26000];
    const picked = nearestStrikes(strikes, 25850, 1);
    expect([...picked].sort()).toEqual([25800, 25850, 25900]);
  });

  it("does not fail when the ladder is shorter than the depth", () => {
    expect(nearestStrikes([100, 200], 150, 30).size).toBe(2);
  });
});

describe("AngelOneProvider", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns null breadth and institutional flow, which SmartAPI does not publish", async () => {
    const { provider } = await createProvider();
    const snapshot = await provider.getMarketSnapshot();
    // The honest answer is "not available", never a fabricated number.
    expect(snapshot.breadth).toBeNull();
    expect(snapshot.institutional).toBeNull();
  });

  it("maps index quotes and labels them with the configured live mode", async () => {
    const { provider } = await createProvider();
    const snapshot = await provider.getMarketSnapshot();
    expect(snapshot.quotes.NIFTY).toMatchObject({
      symbol: "NIFTY",
      name: "NIFTY 50",
      ltp: 25958.7,
      previousClose: 26392.29,
      mode: "LIVE",
    });
    expect(snapshot.vix?.value).toBe(25958.7);
  });

  it("quotes all three indices and VIX in a single request", async () => {
    const { provider, calls } = await createProvider();
    await provider.getMarketSnapshot();
    const quoteCalls = calls.filter((call) => call.route === ROUTES.quote);
    expect(quoteCalls).toHaveLength(1);
    const tokens = (quoteCalls[0].body as { exchangeTokens: Record<string, string[]> })
      .exchangeTokens;
    expect(tokens.NSE).toEqual(expect.arrayContaining(["99926000", "99926009", "99926017"]));
    expect(tokens.BSE).toEqual(["99919000"]);
  });

  it("serves repeat calls from cache instead of re-quoting", async () => {
    const { provider, calls } = await createProvider();
    await provider.getMarketSnapshot();
    await provider.getMarketSnapshot();
    expect(calls.filter((call) => call.route === ROUTES.quote)).toHaveLength(1);
  });

  it("marks the last expiry of a month as monthly and the rest as weekly", async () => {
    const { provider } = await createProvider();
    const expiries = await provider.getExpiries("SENSEX");
    const october = expiries.filter((item) => item.date.startsWith("2026-10"));
    expect(october.length).toBeGreaterThan(0);
    expect(october[october.length - 1].isWeekly).toBe(false);
  });

  it("builds a chain with paired call and put legs per strike", async () => {
    const { provider } = await createProvider();
    const chain = await provider.getOptionChain("NIFTY", "2026-09-22");
    expect(chain.rows.length).toBeGreaterThan(0);
    chain.rows.forEach((row) => {
      expect(row.call.optionType).toBe("CE");
      expect(row.put.optionType).toBe("PE");
      expect(row.call.strike).toBe(row.strike);
    });
    expect(chain.mode).toBe("LIVE");
  });

  it("reads bid and ask from the depth ladder", async () => {
    const { provider } = await createProvider();
    const chain = await provider.getOptionChain("NIFTY", "2026-09-22");
    expect(chain.rows[0].call.bid).toBe(100.1);
    expect(chain.rows[0].call.ask).toBe(100.6);
  });

  it("attaches provider-published greeks and marks them as market-sourced", async () => {
    const { provider } = await createProvider();
    const chain = await provider.getOptionChain("NIFTY", "2026-09-22");
    const row = chain.rows.find((item) => item.strike === 25800)!;
    expect(row.call.greeks).toMatchObject({ source: "MARKET", delta: 0.58 });
    expect(row.call.impliedVolatility).toBeCloseTo(13.62, 2);
  });

  it("still returns a chain when the greeks endpoint fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dir = await mkdtemp(join(tmpdir(), "optionpulse-greekfail-"));
    const instruments = new InstrumentMasterStore({
      cacheFile: join(dir, "instruments.json"),
      fetchRows: async () => SCRIP_MASTER_FIXTURE,
    });
    const transport: SmartApiTransport = {
      async post<T>(route: string, body: unknown): Promise<T> {
        if (route === ROUTES.optionGreek) throw new Error("greeks down");
        if (route === ROUTES.quote) {
          const tokens = Object.values(
            (body as { exchangeTokens: Record<string, string[]> }).exchangeTokens,
          ).flat();
          return { fetched: tokens.map((token) => quoteRecord(token)) } as T;
        }
        throw new Error(`Unexpected route ${route}`);
      },
      async get<T>(): Promise<T> {
        throw new Error("not used");
      },
    };
    const provider = new AngelOneProvider(transport, instruments, "LIVE");
    const chain = await provider.getOptionChain("NIFTY", "2026-09-22");
    expect(chain.rows.length).toBeGreaterThan(0);
    expect(chain.rows[0].call.greeks).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it("infers the strike interval actually listed rather than trusting config", async () => {
    const { provider } = await createProvider();
    const chain = await provider.getOptionChain("NIFTY", "2026-09-22");
    expect(chain.strikeInterval).toBe(50);
  });

  it("aggregates weekly candles from the daily series", async () => {
    const { provider, calls } = await createProvider();
    const weekly = await provider.getHistoricalData("NIFTY", "1W");
    const candleCall = calls.find((call) => call.route === ROUTES.candles)!;
    expect((candleCall.body as { interval: string }).interval).toBe("ONE_DAY");
    // Both fixture days fall in the same week, so they roll into one bar.
    expect(weekly.candles).toHaveLength(1);
    expect(weekly.candles[0]).toMatchObject({ open: 100, high: 120, low: 95, close: 118 });
  });

  it("requests intraday candles at the matching interval", async () => {
    const { provider, calls } = await createProvider();
    await provider.getHistoricalData("NIFTY", "15m");
    const candleCall = calls.find((call) => call.route === ROUTES.candles)!;
    expect((candleCall.body as { interval: string }).interval).toBe("FIFTEEN_MINUTE");
    expect((candleCall.body as { symboltoken: string }).symboltoken).toBe("99926000");
  });

  it("fails loudly for an expiry with no listed contracts", async () => {
    const { provider } = await createProvider();
    await expect(provider.getOptionChain("NIFTY", "2030-01-01")).rejects.toThrow(
      /No listed contracts/,
    );
  });
});
