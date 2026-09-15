import { MARKET_HOURS } from "../config/marketHours";
import type { Candle, HistoricalSeries, Timeframe, UnderlyingSymbol } from "../types/market";
import { isTradingDay } from "../utils/marketStatus";
import { addDaysIso, istToEpoch, toIstParts } from "../utils/time";
import { MOCK_BASELINES } from "./mockBaselines";
import { createRng, gaussian, hashSeed, roundTo } from "./rng";

/** Minutes per bar for intraday timeframes; `null` marks higher timeframes. */
const INTRADAY_MINUTES: Partial<Record<Timeframe, number>> = {
  "1m": 1,
  "3m": 3,
  "5m": 5,
  "15m": 15,
  "30m": 30,
  "1H": 60,
};

const DEFAULT_BAR_COUNT: Record<Timeframe, number> = {
  "1m": 375,
  "3m": 375,
  "5m": 375,
  "15m": 300,
  "30m": 250,
  "1H": 250,
  "1D": 260,
  "1W": 160,
  "1M": 96,
};

const SESSION_MINUTES = MARKET_HOURS.close - MARKET_HOURS.open;

/**
 * Bar timestamps (epoch seconds) ending at `now`, skipping weekends, holidays
 * and non-session hours so the simulated series has the shape of a real one.
 */
function buildBarTimes(timeframe: Timeframe, count: number, now: number): number[] {
  const parts = toIstParts(now);
  const times: number[] = [];
  const intradayMinutes = INTRADAY_MINUTES[timeframe];

  if (intradayMinutes) {
    const barsPerDay = Math.floor(SESSION_MINUTES / intradayMinutes);
    let dateCursor = parts.isoDate;
    let guard = 0;
    while (times.length < count && guard < 400) {
      guard += 1;
      const weekday = toIstParts(istToEpoch(dateCursor, 12 * 60)).weekday;
      if (isTradingDay(dateCursor, weekday)) {
        const isToday = dateCursor === parts.isoDate;
        const lastBar = isToday
          ? Math.min(
              barsPerDay,
              Math.max(
                0,
                Math.floor((parts.minutesOfDay - MARKET_HOURS.open) / intradayMinutes),
              ),
            )
          : barsPerDay;
        for (let bar = lastBar - 1; bar >= 0 && times.length < count; bar -= 1) {
          const minuteOfDay = MARKET_HOURS.open + bar * intradayMinutes;
          times.push(istToEpoch(dateCursor, minuteOfDay) / 1000);
        }
      }
      dateCursor = addDaysIso(dateCursor, -1);
    }
    return times.reverse();
  }

  const stepDays = timeframe === "1D" ? 1 : timeframe === "1W" ? 7 : 30;
  let cursor = parts.isoDate;
  let guard = 0;
  while (times.length < count && guard < 4000) {
    guard += 1;
    const weekday = toIstParts(istToEpoch(cursor, 12 * 60)).weekday;
    if (timeframe !== "1D" || isTradingDay(cursor, weekday)) {
      times.push(istToEpoch(cursor, MARKET_HOURS.close) / 1000);
    }
    cursor = addDaysIso(cursor, -stepDays);
  }
  return times.reverse();
}

/** Annualised volatility scaled to one bar of the given timeframe. */
function perBarVolatility(timeframe: Timeframe, annualVolatility: number): number {
  const minutes = INTRADAY_MINUTES[timeframe];
  const barsPerYear = minutes
    ? (SESSION_MINUTES / minutes) * 250
    : timeframe === "1D"
      ? 250
      : timeframe === "1W"
        ? 52
        : 12;
  return annualVolatility / Math.sqrt(barsPerYear);
}

/**
 * Geometric-Brownian-motion price path. Deterministic for a given
 * symbol + timeframe + day, so charts do not reshuffle on re-render.
 */
export function generateHistoricalSeries(
  symbol: UnderlyingSymbol,
  timeframe: Timeframe,
  options: { count?: number; now?: number; endPrice?: number } = {},
): HistoricalSeries {
  const now = options.now ?? Date.now();
  const count = options.count ?? DEFAULT_BAR_COUNT[timeframe];
  const baseline = MOCK_BASELINES[symbol];
  const times = buildBarTimes(timeframe, count, now);
  const rng = createRng(hashSeed("history", symbol, timeframe, toIstParts(now).isoDate));
  const sigma = perBarVolatility(timeframe, baseline.annualVolatility);

  // Build the path backwards from the desired end price so the last candle
  // lines up with the quote the dashboard is showing.
  const endPrice = options.endPrice ?? baseline.base;
  const returns: number[] = [];
  for (let i = 0; i < times.length; i += 1) returns.push(gaussian(rng) * sigma);

  const closes: number[] = new Array(times.length);
  let price = endPrice;
  for (let i = times.length - 1; i >= 0; i -= 1) {
    closes[i] = price;
    price = price / Math.exp(returns[i]);
  }

  const candles: Candle[] = times.map((time, i) => {
    const close = closes[i];
    const open = i === 0 ? close / Math.exp(returns[0]) : closes[i - 1];
    const wick = Math.abs(gaussian(rng)) * sigma * close * 0.8;
    const high = Math.max(open, close) + wick;
    const low = Math.min(open, close) - wick;
    const volumeNoise = 0.6 + Math.abs(gaussian(rng)) * 0.9;
    return {
      time,
      open: roundTo(open, 2),
      high: roundTo(high, 2),
      low: roundTo(Math.max(low, 1), 2),
      close: roundTo(close, 2),
      volume: Math.round(baseline.baseVolume * volumeNoise),
    };
  });

  return { symbol, timeframe, candles, mode: "MOCK", generatedAt: now };
}
