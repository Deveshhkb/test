import { getUnderlyingConfig } from "../config/underlyings";
import type { UnderlyingSymbol } from "../types/market";
import type { ExpiryInfo } from "../types/options";
import { isTradingDay } from "./marketStatus";
import { addDaysIso, daysBetweenIso, formatExpiryLabel, istToEpoch, toIstParts } from "./time";

function weekdayOf(isoDate: string): number {
  return toIstParts(istToEpoch(isoDate, 12 * 60)).weekday;
}

/** Walks back to the previous trading day when an expiry lands on a holiday. */
function rollBackToTradingDay(isoDate: string): string {
  let cursor = isoDate;
  for (let i = 0; i < 7; i += 1) {
    if (isTradingDay(cursor, weekdayOf(cursor))) return cursor;
    cursor = addDaysIso(cursor, -1);
  }
  return cursor;
}

function nextWeekdayOnOrAfter(isoDate: string, weekday: number): string {
  const current = weekdayOf(isoDate);
  const delta = (weekday - current + 7) % 7;
  return addDaysIso(isoDate, delta);
}

/** Last occurrence of `weekday` in the month containing `isoDate`. */
function lastWeekdayOfMonth(year: number, month: number, weekday: number): string {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const current = weekdayOf(iso);
  const delta = (current - weekday + 7) % 7;
  return addDaysIso(iso, -delta);
}

export interface ExpiryGenerationOptions {
  weeklyCount?: number;
  monthlyCount?: number;
}

/**
 * Builds the expiry ladder for an underlying from its configured expiry
 * weekday. Real chains come from the provider - this mirrors exchange
 * conventions closely enough to drive the UI in mock mode.
 */
export function generateExpiries(
  symbol: UnderlyingSymbol,
  fromIsoDate: string,
  options: ExpiryGenerationOptions = {},
): ExpiryInfo[] {
  const config = getUnderlyingConfig(symbol);
  const weeklyCount = config.hasWeeklyExpiry ? (options.weeklyCount ?? 4) : 0;
  const monthlyCount = options.monthlyCount ?? 3;

  const dates = new Map<string, boolean>();

  let weeklyCursor = nextWeekdayOnOrAfter(fromIsoDate, config.weeklyExpiryWeekday);
  for (let i = 0; i < weeklyCount; i += 1) {
    dates.set(rollBackToTradingDay(weeklyCursor), true);
    weeklyCursor = addDaysIso(weeklyCursor, 7);
  }

  const start = toIstParts(istToEpoch(fromIsoDate, 12 * 60));
  for (let i = 0; i < monthlyCount; i += 1) {
    const monthIndex = start.month + i;
    const year = start.year + Math.floor((monthIndex - 1) / 12);
    const month = ((monthIndex - 1) % 12) + 1;
    const monthly = rollBackToTradingDay(
      lastWeekdayOfMonth(year, month, config.weeklyExpiryWeekday),
    );
    if (daysBetweenIso(fromIsoDate, monthly) >= 0) dates.set(monthly, false);
  }

  return [...dates.entries()]
    .map(([date, isWeekly]) => ({
      date,
      label: formatExpiryLabel(date),
      daysToExpiry: daysBetweenIso(fromIsoDate, date),
      isWeekly,
    }))
    .filter((expiry) => expiry.daysToExpiry >= 0)
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry);
}
