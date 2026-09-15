import { describe, expect, it } from "vitest";
import { generateExpiries } from "./expiries";

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

  it("uses the configured expiry weekday", () => {
    // SENSEX is configured to expire on Tuesday.
    const [first] = generateExpiries("SENSEX", "2026-09-15");
    expect(first.label).toMatch(/\d{2} [A-Z]{3} \d{4}/);
  });

  it("produces human-readable labels", () => {
    const [first] = generateExpiries("NIFTY", "2026-09-15");
    expect(first.label).toMatch(/^\d{2} [A-Z]{3} \d{4}$/);
  });
});
