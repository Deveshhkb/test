import { MOCK_BASELINES, MOCK_VIX_BASE } from "./mockBaselines";
import { buildBreadth } from "../calculations/market/marketBreadth";
import { UNDERLYINGS } from "../config/underlyings";
import type {
  InstitutionalActivity,
  MarketBreadth,
  Quote,
  UnderlyingSymbol,
  VixQuote,
} from "../types/market";
import { toIstParts } from "../utils/time";
import { createRng, gaussian, hashSeed, randomBetween, roundTo } from "./rng";

/**
 * The mock session is deterministic per calendar day: the same date always
 * produces the same open/high/low, while the LTP drifts with the clock so the
 * UI visibly updates without ever contradicting itself.
 */
function sessionRng(symbol: string, isoDate: string) {
  return createRng(hashSeed("session", symbol, isoDate));
}

export function generateQuote(symbol: UnderlyingSymbol, now: number = Date.now()): Quote {
  const parts = toIstParts(now);
  const baseline = MOCK_BASELINES[symbol];
  const rng = sessionRng(symbol, parts.isoDate);

  // Previous close drifts a little from the configured baseline each day.
  const previousClose = roundTo(baseline.base * (1 + gaussian(rng) * 0.01), 2);
  const gapPercent = gaussian(rng) * 0.35;
  const open = roundTo(previousClose * (1 + gapPercent / 100), 2);

  // Intraday path: a slow drift plus a bounded oscillation keyed to the minute.
  const trendPercent = gaussian(rng) * 0.9;
  const progress = sessionProgress(parts.minutesOfDay);
  const wobble = Math.sin((parts.minutesOfDay + (hashSeed(symbol) % 60)) / 37) * 0.18;
  const ltp = roundTo(open * (1 + (trendPercent * progress + wobble) / 100), 2);

  const swing = Math.abs(gaussian(rng)) * 0.45 + 0.15;
  const high = roundTo(Math.max(open, ltp) * (1 + swing / 100), 2);
  const low = roundTo(Math.min(open, ltp) * (1 - swing / 100), 2);
  const change = roundTo(ltp - previousClose, 2);

  return {
    symbol,
    name: UNDERLYINGS[symbol].name,
    ltp,
    change,
    changePercent: roundTo((change / previousClose) * 100, 2),
    open,
    high,
    low,
    previousClose,
    timestamp: now,
    mode: "MOCK",
  };
}

/** 0 at the open, 1 at the close; clamped outside session hours. */
function sessionProgress(minutesOfDay: number): number {
  const open = 9 * 60 + 15;
  const close = 15 * 60 + 30;
  if (minutesOfDay <= open) return 0;
  if (minutesOfDay >= close) return 1;
  return (minutesOfDay - open) / (close - open);
}

export function generateVix(now: number = Date.now()): VixQuote {
  const parts = toIstParts(now);
  const rng = sessionRng("INDIAVIX", parts.isoDate);
  const previous = roundTo(MOCK_VIX_BASE * (1 + gaussian(rng) * 0.06), 2);
  const changePercent = roundTo(gaussian(rng) * 4, 2);
  const value = roundTo(previous * (1 + changePercent / 100), 2);
  return {
    value,
    change: roundTo(value - previous, 2),
    changePercent,
    timestamp: now,
    mode: "MOCK",
  };
}

export function generateBreadth(now: number = Date.now()): MarketBreadth {
  const parts = toIstParts(now);
  const rng = sessionRng("BREADTH", parts.isoDate);
  const total = 2000;
  const advances = Math.round(randomBetween(rng, 600, 1400));
  const unchanged = Math.round(randomBetween(rng, 40, 120));
  return buildBreadth(advances, total - advances - unchanged, unchanged, "MOCK");
}

export function generateInstitutionalActivity(now: number = Date.now()): InstitutionalActivity {
  const parts = toIstParts(now);
  const rng = sessionRng("FIIDII", parts.isoDate);
  return {
    date: parts.isoDate,
    fiiNetCrore: roundTo(gaussian(rng) * 2600, 0),
    diiNetCrore: roundTo(gaussian(rng) * 1800, 0),
    mode: "MOCK",
  };
}
