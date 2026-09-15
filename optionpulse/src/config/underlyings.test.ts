import { describe, expect, it } from "vitest";
import { UNDERLYINGS, expiryWeekdayName, getUnderlyingConfig } from "./underlyings";

/**
 * These values were reconciled against the Angel One instrument master. They
 * are locked down here because getting them wrong is silent: the app still
 * renders, it just builds the wrong expiry ladder and the wrong lot size.
 */
describe("contract specifications", () => {
  it("expires NIFTY on Tuesday with weekly series", () => {
    expect(expiryWeekdayName("NIFTY")).toBe("Tuesday");
    expect(UNDERLYINGS.NIFTY.hasWeeklyExpiry).toBe(true);
    expect(UNDERLYINGS.NIFTY.lotSize).toBe(65);
    expect(UNDERLYINGS.NIFTY.strikeInterval).toBe(50);
  });

  it("expires BANK NIFTY on Tuesday, monthly only", () => {
    expect(expiryWeekdayName("BANKNIFTY")).toBe("Tuesday");
    expect(UNDERLYINGS.BANKNIFTY.hasWeeklyExpiry).toBe(false);
    expect(UNDERLYINGS.BANKNIFTY.lotSize).toBe(30);
    expect(UNDERLYINGS.BANKNIFTY.strikeInterval).toBe(100);
  });

  it("expires SENSEX on Thursday with weekly series", () => {
    expect(expiryWeekdayName("SENSEX")).toBe("Thursday");
    expect(UNDERLYINGS.SENSEX.hasWeeklyExpiry).toBe(true);
    expect(UNDERLYINGS.SENSEX.lotSize).toBe(20);
    expect(UNDERLYINGS.SENSEX.exchange).toBe("BSE");
  });

  it("rejects an unknown underlying rather than returning a default", () => {
    // @ts-expect-error - deliberately passing an invalid symbol
    expect(() => getUnderlyingConfig("RELIANCE")).toThrow();
  });
});
