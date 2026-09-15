import { describe, expect, it } from "vitest";
import { classifyMoneyness, getATMStrike, getNearestStrike, intrinsicValue } from "./atm";

describe("getATMStrike", () => {
  it("rounds to the nearest listed strike", () => {
    expect(getATMStrike(23_118.6, 50)).toBe(23_100);
    expect(getATMStrike(23_140, 50)).toBe(23_150);
    expect(getATMStrike(58_449, 100)).toBe(58_400);
  });

  it("rounds a midpoint up", () => {
    expect(getATMStrike(23_125, 50)).toBe(23_150);
  });

  it("respects the interval supplied by the underlying configuration", () => {
    expect(getATMStrike(84_749, 100)).toBe(84_700);
    expect(getATMStrike(84_749, 500)).toBe(84_500);
  });

  it("rejects a non-positive interval", () => {
    expect(() => getATMStrike(100, 0)).toThrow();
  });
});

describe("getNearestStrike", () => {
  it("picks the closest strike from a gappy ladder", () => {
    expect(getNearestStrike(23_118, [23_000, 23_100, 23_300])).toBe(23_100);
  });

  it("returns null for an empty ladder", () => {
    expect(getNearestStrike(100, [])).toBeNull();
  });
});

describe("classifyMoneyness", () => {
  const spot = 23_118;
  const atm = 23_100;

  it("marks the ATM strike for both option types", () => {
    expect(classifyMoneyness(atm, "CE", spot, atm)).toBe("ATM");
    expect(classifyMoneyness(atm, "PE", spot, atm)).toBe("ATM");
  });

  it("classifies calls below spot as ITM and above spot as OTM", () => {
    expect(classifyMoneyness(23_000, "CE", spot, atm)).toBe("ITM");
    expect(classifyMoneyness(23_300, "CE", spot, atm)).toBe("OTM");
  });

  it("classifies puts above spot as ITM and below spot as OTM", () => {
    expect(classifyMoneyness(23_300, "PE", spot, atm)).toBe("ITM");
    expect(classifyMoneyness(23_000, "PE", spot, atm)).toBe("OTM");
  });
});

describe("intrinsicValue", () => {
  it("is never negative", () => {
    expect(intrinsicValue(100, "CE", 90)).toBe(0);
    expect(intrinsicValue(100, "PE", 110)).toBe(0);
  });

  it("returns the in-the-money amount", () => {
    expect(intrinsicValue(100, "CE", 110)).toBe(10);
    expect(intrinsicValue(100, "PE", 90)).toBe(10);
  });
});
