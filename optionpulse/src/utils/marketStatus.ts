import { MARKET_HOURS, TRADING_HOLIDAYS_ISO } from "../config/marketHours";
import type { MarketPhase, MarketStatus } from "../types/market";
import { addDaysIso, istToEpoch, toIstParts } from "./time";

const holidaySet = new Set(TRADING_HOLIDAYS_ISO);

export function isWeekend(weekday: number): boolean {
  return weekday === 0 || weekday === 6;
}

export function isTradingHoliday(isoDate: string): boolean {
  return holidaySet.has(isoDate);
}

export function isTradingDay(isoDate: string, weekday: number): boolean {
  return !isWeekend(weekday) && !isTradingHoliday(isoDate);
}

function nextTradingDay(isoDate: string): string {
  let cursor = addDaysIso(isoDate, 1);
  for (let i = 0; i < 14; i += 1) {
    const parts = toIstParts(istToEpoch(cursor, 12 * 60));
    if (isTradingDay(cursor, parts.weekday)) return cursor;
    cursor = addDaysIso(cursor, 1);
  }
  return cursor;
}

function phaseFor(minutesOfDay: number): MarketPhase {
  if (minutesOfDay >= MARKET_HOURS.preOpenStart && minutesOfDay < MARKET_HOURS.preOpenEnd) {
    return "PRE_OPEN";
  }
  if (minutesOfDay >= MARKET_HOURS.open && minutesOfDay < MARKET_HOURS.close) {
    return "OPEN";
  }
  return "CLOSED";
}

const PHASE_LABELS: Record<MarketPhase, string> = {
  PRE_OPEN: "PRE-OPEN",
  OPEN: "MARKET OPEN",
  CLOSED: "MARKET CLOSED",
  WEEKEND: "MARKET CLOSED",
  HOLIDAY: "MARKET HOLIDAY",
};

/**
 * Derives the current session phase from an instant. Nothing about the status
 * is hardcoded: pass any timestamp and the result follows IST session rules.
 */
export function getMarketStatus(instant: Date | number = Date.now()): MarketStatus {
  const nowMs = instant instanceof Date ? instant.getTime() : instant;
  const parts = toIstParts(nowMs);

  let phase: MarketPhase;
  if (isWeekend(parts.weekday)) {
    phase = "WEEKEND";
  } else if (isTradingHoliday(parts.isoDate)) {
    phase = "HOLIDAY";
  } else {
    phase = phaseFor(parts.minutesOfDay);
  }

  const { nextChangeMs, nextChangeLabel } = nextChange(
    parts.isoDate,
    parts.minutesOfDay,
    phase,
  );

  return {
    phase,
    isOpen: phase === "OPEN",
    label: PHASE_LABELS[phase],
    asOf: new Date(nowMs).toISOString(),
    msToNextChange: nextChangeMs === null ? null : Math.max(0, nextChangeMs - nowMs),
    nextChangeLabel,
  };
}

function nextChange(
  isoDate: string,
  minutesOfDay: number,
  phase: MarketPhase,
): { nextChangeMs: number | null; nextChangeLabel: string | null } {
  if (phase === "OPEN") {
    return {
      nextChangeMs: istToEpoch(isoDate, MARKET_HOURS.close),
      nextChangeLabel: "Closes 15:30 IST",
    };
  }
  if (phase === "PRE_OPEN") {
    return {
      nextChangeMs: istToEpoch(isoDate, MARKET_HOURS.open),
      nextChangeLabel: "Opens 09:15 IST",
    };
  }
  // Closed for the day, weekend or holiday: next open is the next trading day,
  // unless we are before this session's open on a trading day.
  const beforeTodaysOpen = phase === "CLOSED" && minutesOfDay < MARKET_HOURS.preOpenStart;
  const targetDate = beforeTodaysOpen ? isoDate : nextTradingDay(isoDate);
  return {
    nextChangeMs: istToEpoch(targetDate, MARKET_HOURS.open),
    nextChangeLabel: beforeTodaysOpen ? "Opens 09:15 IST" : "Opens next session, 09:15 IST",
  };
}
