import { describe, expect, it } from "vitest";
import { getMarketStatus } from "./marketStatus";
import { istToEpoch } from "./time";

/** 2026-09-15 is a Tuesday and not on the configured holiday list. */
const TUESDAY = "2026-09-15";
const SATURDAY = "2026-09-19";
const HOLIDAY = "2026-10-02";

describe("getMarketStatus", () => {
  it("reports the market open during continuous trading", () => {
    const status = getMarketStatus(istToEpoch(TUESDAY, 11 * 60));
    expect(status.phase).toBe("OPEN");
    expect(status.isOpen).toBe(true);
    expect(status.label).toBe("MARKET OPEN");
  });

  it("reports pre-open between 09:00 and 09:08 IST", () => {
    const status = getMarketStatus(istToEpoch(TUESDAY, 9 * 60 + 3));
    expect(status.phase).toBe("PRE_OPEN");
    expect(status.isOpen).toBe(false);
  });

  it("closes exactly at 15:30 IST", () => {
    expect(getMarketStatus(istToEpoch(TUESDAY, 15 * 60 + 29)).isOpen).toBe(true);
    expect(getMarketStatus(istToEpoch(TUESDAY, 15 * 60 + 30)).isOpen).toBe(false);
  });

  it("opens exactly at 09:15 IST", () => {
    expect(getMarketStatus(istToEpoch(TUESDAY, 9 * 60 + 14)).isOpen).toBe(false);
    expect(getMarketStatus(istToEpoch(TUESDAY, 9 * 60 + 15)).isOpen).toBe(true);
  });

  it("treats weekends as closed regardless of the hour", () => {
    const status = getMarketStatus(istToEpoch(SATURDAY, 11 * 60));
    expect(status.phase).toBe("WEEKEND");
    expect(status.isOpen).toBe(false);
  });

  it("treats a configured trading holiday as closed", () => {
    const status = getMarketStatus(istToEpoch(HOLIDAY, 11 * 60));
    expect(status.phase).toBe("HOLIDAY");
    expect(status.isOpen).toBe(false);
  });

  it("points at the next session change", () => {
    const open = getMarketStatus(istToEpoch(TUESDAY, 11 * 60));
    expect(open.nextChangeLabel).toMatch(/15:30/);
    const closed = getMarketStatus(istToEpoch(TUESDAY, 17 * 60));
    expect(closed.nextChangeLabel).toMatch(/09:15/);
    expect(closed.msToNextChange).toBeGreaterThan(0);
  });

  it("is evaluated in IST, not in the host time zone", () => {
    // 04:00 UTC is 09:30 IST - inside the session.
    expect(getMarketStatus(Date.parse("2026-09-15T04:00:00Z")).isOpen).toBe(true);
    // 11:00 UTC is 16:30 IST - after the close.
    expect(getMarketStatus(Date.parse("2026-09-15T11:00:00Z")).isOpen).toBe(false);
  });
});
