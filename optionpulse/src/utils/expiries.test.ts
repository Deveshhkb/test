import { describe, expect, it } from "vitest";
import { generateExpiries } from "./expiries";
import { istToEpoch, toIstParts } from "./time";

describe("generateExpiries", () => {
  it("returns weekly and monthly expiries for NIFTY in ascending order", () => {
    const expiries = generateExpiries("NIFTY", "2026-09-15");
    expect(expiries.length).toBeGreaterThan(0);
    const days = expiries.map((item) => item.daysToExpiry);
    expect([...days].sort((a, b) => a - b)).toEqual(days);
    expect(days.every((value) => value >= 0)).toBe(true);
  });

  it("omits weeklies for an underlying configured without them", () => {
    const expiries = generateExpiries("BANKNIFTY", "2026-09-15");
    expect(expiries.every((item) => !item.isWeekly)).toBe(true);
  });

  it("places every expiry on the underlying's configured weekday", () => {
    // 0 = Sunday. NIFTY expires Tuesday (2), SENSEX Thursday (4).
    const weekdayOf = (iso: string) => toIstParts(istToEpoch(iso, 12 * 60)).weekday;

    generateExpiries("NIFTY", "2026-09-15").forEach((expiry) => {
      expect(weekdayOf(expiry.date)).toBe(2);
    });
    generateExpiries("SENSEX", "2026-09-15").forEach((expiry) => {
      expect(weekdayOf(expiry.date)).toBe(4);
    });
  });

  it("matches the near expiries listed by the exchange for this date", () => {
    // Verified against the Angel One instrument master on 2026-09-15.
    const nifty = generateExpiries("NIFTY", "2026-09-15").map((item) => item.date);
    expect(nifty.slice(0, 3)).toEqual(["2026-09-15", "2026-09-22", "2026-09-29"]);

    const sensex = generateExpiries("SENSEX", "2026-09-15").map((item) => item.date);
    expect(sensex.slice(0, 3)).toEqual(["2026-09-17", "2026-09-24", "2026-10-01"]);
  });

  it("produces human-readable labels", () => {
    const [first] = generateExpiries("NIFTY", "2026-09-15");
    expect(first.label).toMatch(/^\d{2} [A-Z]{3} \d{4}$/);
  });
});
