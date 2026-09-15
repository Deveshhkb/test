import { describe, expect, it } from "vitest";
import { TEST_CHAIN, row } from "../__fixtures__/chain";
import { calculatePcr, interpretPcr } from "./pcr";

describe("calculatePcr", () => {
  it("divides total put OI by total call OI", () => {
    const result = calculatePcr(TEST_CHAIN);
    expect(result.totalPutOi).toBe(1000);
    expect(result.totalCallOi).toBe(1000);
    expect(result.pcr).toBe(1);
  });

  it("computes the volume PCR alongside the OI PCR", () => {
    const result = calculatePcr([
      row(100, { openInterest: 100, volume: 50 }, { openInterest: 200, volume: 150 }),
    ]);
    expect(result.pcr).toBe(2);
    expect(result.volumePcr).toBe(3);
  });

  it("returns zero rather than Infinity when there is no call OI", () => {
    const result = calculatePcr([row(100, { openInterest: 0 }, { openInterest: 500 })]);
    expect(result.pcr).toBe(0);
  });

  it("labels the result as calculated, never as quoted data", () => {
    expect(calculatePcr(TEST_CHAIN).mode).toBe("CALCULATED");
  });
});

describe("interpretPcr", () => {
  it("describes positioning without claiming a prediction", () => {
    expect(interpretPcr(0.5)).toMatch(/bearish/i);
    expect(interpretPcr(1.0)).toMatch(/balanced/i);
    expect(interpretPcr(1.8)).toMatch(/bullish/i);
    expect(interpretPcr(1.0)).not.toMatch(/will|guarantee/i);
  });
});
