import { describe, expect, it } from "vitest";
import { bollingerBands } from "./bollinger";
import { ema, lastDefined, sma } from "./ema";
import { macd } from "./macd";
import { rsi } from "./rsi";
import { vwap } from "./vwap";
import type { Candle } from "../../types/market";

const FLAT = [10, 10, 10, 10, 10, 10];
const RAMP = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

describe("sma", () => {
  it("is null until the window is full, then the window mean", () => {
    const result = sma(RAMP, 3);
    expect(result.slice(0, 2)).toEqual([null, null]);
    expect(result[2]).toBe(2);
    expect(result[9]).toBe(9);
  });
});

describe("ema", () => {
  it("seeds with the simple average of the first period", () => {
    const result = ema(RAMP, 3);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBe(2); // (1+2+3)/3
  });

  it("applies the 2/(n+1) multiplier after the seed", () => {
    const result = ema(RAMP, 3);
    // previous 2, next value 4, multiplier 0.5 -> 3
    expect(result[3]).toBe(3);
  });

  it("stays flat on a constant series", () => {
    expect(lastDefined(ema(FLAT, 3))).toBe(10);
  });

  it("returns all nulls when the series is shorter than the period", () => {
    expect(ema([1, 2], 5)).toEqual([null, null]);
  });
});

describe("rsi", () => {
  it("is 100 when every change is a gain", () => {
    expect(lastDefined(rsi(RAMP, 3))).toBe(100);
  });

  it("is 100 for a strictly falling series inverted, and 0 falling", () => {
    const falling = [...RAMP].reverse();
    expect(lastDefined(rsi(falling, 3))).toBe(0);
  });

  it("reports 50 on a flat series", () => {
    expect(lastDefined(rsi(FLAT, 3))).toBe(50);
  });

  it("stays within 0-100", () => {
    const series = [44, 47, 45, 50, 48, 52, 51, 55, 53, 58, 57, 60, 59, 62, 61, 64];
    rsi(series, 14).forEach((value) => {
      if (value === null) return;
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    });
  });
});

describe("macd", () => {
  const series = Array.from({ length: 80 }, (_, i) => 100 + i);

  it("keeps the output index-aligned with the input", () => {
    expect(macd(series).length).toBe(series.length);
  });

  it("is null before the slow EMA is seeded", () => {
    expect(macd(series)[10].macd).toBeNull();
  });

  it("is positive when the fast EMA leads a rising series", () => {
    const last = macd(series)[series.length - 1];
    expect(last.macd).not.toBeNull();
    expect(last.macd as number).toBeGreaterThan(0);
  });

  it("computes the histogram as MACD minus signal", () => {
    const last = macd(series)[series.length - 1];
    expect(last.histogram as number).toBeCloseTo(
      (last.macd as number) - (last.signal as number),
      10,
    );
  });

  it("honours a custom configuration", () => {
    const custom = macd(series, { fastPeriod: 5, slowPeriod: 10, signalPeriod: 3 });
    expect(custom[9].macd).not.toBeNull();
  });
});

describe("bollingerBands", () => {
  it("collapses to the mean on a flat series", () => {
    const bands = bollingerBands(FLAT, { period: 3, standardDeviations: 2 });
    const last = bands[bands.length - 1];
    expect(last.middle).toBe(10);
    expect(last.upper).toBe(10);
    expect(last.lower).toBe(10);
  });

  it("brackets the middle band", () => {
    const bands = bollingerBands(RAMP, { period: 3, standardDeviations: 2 });
    const last = bands[bands.length - 1];
    expect(last.upper as number).toBeGreaterThan(last.middle as number);
    expect(last.lower as number).toBeLessThan(last.middle as number);
  });
});

describe("vwap", () => {
  const candles: Candle[] = [
    { time: 1, open: 10, high: 12, low: 8, close: 10, volume: 100 },
    { time: 2, open: 10, high: 22, low: 18, close: 20, volume: 100 },
  ];

  it("weights typical price by volume", () => {
    const result = vwap(candles);
    expect(result[0]).toBe(10); // (12+8+10)/3
    expect(result[1]).toBe(15); // mean of 10 and 20 at equal volume
  });

  it("restarts accumulation on a reset key", () => {
    const result = vwap(candles, (_, index) => index);
    expect(result[1]).toBe(20);
  });
});
