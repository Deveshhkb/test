import { describe, expect, it } from "vitest";
import { calculateMarketBias, labelForScore } from "./marketBias";
import { advanceDeclineRatio } from "./marketBreadth";

describe("labelForScore", () => {
  it("maps scores onto the configured bands", () => {
    expect(labelForScore(10)).toBe("STRONG_BULLISH");
    expect(labelForScore(8)).toBe("STRONG_BULLISH");
    expect(labelForScore(5)).toBe("BULLISH");
    expect(labelForScore(0)).toBe("SIDEWAYS");
    expect(labelForScore(-5)).toBe("BEARISH");
    expect(labelForScore(-9)).toBe("STRONG_BEARISH");
  });

  it("treats the -2..+2 band as sideways", () => {
    expect(labelForScore(2)).toBe("SIDEWAYS");
    expect(labelForScore(-2)).toBe("SIDEWAYS");
    expect(labelForScore(3)).toBe("BULLISH");
    expect(labelForScore(-3)).toBe("BEARISH");
  });
});

describe("calculateMarketBias", () => {
  it("scores a uniformly bullish setup as bullish", () => {
    const result = calculateMarketBias({
      changePercent: 1.2,
      close: 23_500,
      emaFast: 23_400,
      emaSlow: 23_300,
      rsi: 62,
      macdLine: 15,
      macdSignal: 8,
      macdHistogram: 7,
      vwap: 23_450,
      advanceDeclineRatio: 2.1,
      vix: 11,
      vixChangePercent: -3,
      fiiNetCrore: 2500,
      diiNetCrore: 500,
      pcr: 1.35,
      netCallOiChange: 100_000,
      netPutOiChange: 900_000,
      spot: 23_500,
      nearestSupport: 23_000,
      nearestResistance: 23_600,
    });
    expect(result.score).toBeGreaterThan(2);
    expect(["BULLISH", "STRONG_BULLISH"]).toContain(result.label);
  });

  it("scores a uniformly bearish setup as bearish", () => {
    const result = calculateMarketBias({
      changePercent: -1.4,
      close: 22_800,
      emaFast: 22_900,
      emaSlow: 23_100,
      rsi: 38,
      macdLine: -12,
      macdSignal: -4,
      macdHistogram: -8,
      vwap: 22_950,
      advanceDeclineRatio: 0.4,
      vix: 21,
      vixChangePercent: 6,
      fiiNetCrore: -3200,
      diiNetCrore: 400,
      pcr: 0.65,
      netCallOiChange: 900_000,
      netPutOiChange: 50_000,
      spot: 22_800,
      nearestSupport: 22_700,
      nearestResistance: 23_200,
    });
    expect(result.score).toBeLessThan(-2);
    expect(["BEARISH", "STRONG_BEARISH"]).toContain(result.label);
  });

  it("skips factors it has no input for rather than scoring them neutral", () => {
    const result = calculateMarketBias({ changePercent: 1.0 });
    expect(result.factors).toHaveLength(1);
    expect(result.factors[0].key).toBe("priceMomentum");
  });

  it("returns an empty, sideways result when given nothing", () => {
    const result = calculateMarketBias({});
    expect(result.factors).toHaveLength(0);
    expect(result.score).toBe(0);
    expect(result.label).toBe("SIDEWAYS");
  });

  it("caps each factor at its configured maximum", () => {
    const result = calculateMarketBias({ changePercent: 25 });
    expect(result.factors[0].score).toBe(2);
  });

  it("explains every factor it scored", () => {
    const result = calculateMarketBias({ changePercent: -1.2, pcr: 1.4 });
    result.factors.forEach((factor) => {
      expect(factor.detail.length).toBeGreaterThan(0);
      expect(factor.label.length).toBeGreaterThan(0);
    });
  });

  it("reports signal strength as a 0-100 measure", () => {
    const result = calculateMarketBias({ changePercent: 2 });
    expect(result.strength).toBeGreaterThanOrEqual(0);
    expect(result.strength).toBeLessThanOrEqual(100);
  });
});

describe("advanceDeclineRatio", () => {
  it("guards against a zero denominator", () => {
    expect(advanceDeclineRatio(1200, 0)).toBe(1200);
    expect(advanceDeclineRatio(0, 0)).toBe(0);
  });

  it("divides advances by declines", () => {
    expect(advanceDeclineRatio(1200, 600)).toBe(2);
  });
});
