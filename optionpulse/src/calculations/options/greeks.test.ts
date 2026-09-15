import { describe, expect, it } from "vitest";
import {
  blackScholesPrice,
  calculateGreeks,
  calculateImpliedVolatility,
  normCdf,
  yearsToExpiry,
} from "./greeks";

const BASE = {
  spot: 23_100,
  strike: 23_100,
  timeToExpiry: yearsToExpiry(30),
  volatility: 0.15,
  riskFreeRate: 0.065,
};

describe("normCdf", () => {
  it("is 0.5 at zero and symmetric about it", () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 6);
    expect(normCdf(1) + normCdf(-1)).toBeCloseTo(1, 6);
  });
});

describe("blackScholesPrice", () => {
  it("satisfies put-call parity", () => {
    const call = blackScholesPrice({ ...BASE, optionType: "CE" });
    const put = blackScholesPrice({ ...BASE, optionType: "PE" });
    const parity = BASE.spot - BASE.strike * Math.exp(-BASE.riskFreeRate * BASE.timeToExpiry);
    expect(call - put).toBeCloseTo(parity, 4);
  });

  it("falls back to intrinsic value at expiry", () => {
    expect(
      blackScholesPrice({ ...BASE, timeToExpiry: 0, spot: 23_200, optionType: "CE" }),
    ).toBe(100);
    expect(
      blackScholesPrice({ ...BASE, timeToExpiry: 0, spot: 23_000, optionType: "CE" }),
    ).toBe(0);
  });
});

describe("calculateGreeks", () => {
  it("keeps call delta in [0,1] and put delta in [-1,0]", () => {
    const call = calculateGreeks({ ...BASE, optionType: "CE" });
    const put = calculateGreeks({ ...BASE, optionType: "PE" });
    expect(call.delta).toBeGreaterThan(0);
    expect(call.delta).toBeLessThan(1);
    expect(put.delta).toBeLessThan(0);
    expect(put.delta).toBeGreaterThan(-1);
  });

  it("gives a spot-ATM call a delta just above 0.5", () => {
    // Slightly above 0.5 because the forward sits above spot at a positive
    // risk-free rate; a zero-rate, zero-dividend ATM call is the 0.5 case.
    const delta = calculateGreeks({ ...BASE, optionType: "CE" }).delta;
    expect(delta).toBeGreaterThan(0.5);
    expect(delta).toBeLessThan(0.6);
    expect(calculateGreeks({ ...BASE, riskFreeRate: 0, optionType: "CE" }).delta).toBeCloseTo(
      0.5,
      1,
    );
  });

  it("shares gamma and vega between calls and puts at the same strike", () => {
    const call = calculateGreeks({ ...BASE, optionType: "CE" });
    const put = calculateGreeks({ ...BASE, optionType: "PE" });
    expect(call.gamma).toBeCloseTo(put.gamma, 10);
    expect(call.vega).toBeCloseTo(put.vega, 10);
  });

  it("returns negative theta for a long at-the-money option", () => {
    expect(calculateGreeks({ ...BASE, optionType: "CE" }).theta).toBeLessThan(0);
  });

  it("always labels its output as calculated, not provider-supplied", () => {
    expect(calculateGreeks({ ...BASE, optionType: "CE" }).source).toBe("CALCULATED");
  });
});

describe("calculateImpliedVolatility", () => {
  it("recovers the volatility used to price the option", () => {
    const marketPrice = blackScholesPrice({ ...BASE, optionType: "CE" });
    const solved = calculateImpliedVolatility({ ...BASE, marketPrice, optionType: "CE" });
    expect(solved).not.toBeNull();
    expect(solved as number).toBeCloseTo(BASE.volatility, 3);
  });

  it("returns null for a price the model cannot reproduce", () => {
    expect(
      calculateImpliedVolatility({ ...BASE, marketPrice: 0, optionType: "CE" }),
    ).toBeNull();
  });
});
