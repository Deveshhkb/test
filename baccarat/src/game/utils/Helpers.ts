import { BREAKPOINT_MOBILE, BREAKPOINT_TABLET } from "../Constants";
import { LayoutMode } from "../types";

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: string, fractionDigits: number): Intl.NumberFormat {
  const key = `${locale}:${fractionDigits}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

/** `1234567` -> `1,234,567`. Cached because this runs on every ticker frame. */
export function formatAmount(value: number, locale = "en-US", fractionDigits = 0): string {
  return getFormatter(locale, fractionDigits).format(value);
}

/** Compact chip/table-limit notation: `2500000` -> `2.5M`. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return trimZero(value / 1_000_000_000) + "B";
  if (abs >= 1_000_000) return trimZero(value / 1_000_000) + "M";
  if (abs >= 1_000) return trimZero(value / 1_000) + "K";
  return String(value);
}

function trimZero(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Money as the table shows it: symbol, grouped digits, fixed decimals —
 * `$100,000.00`. Uses the cached `Intl` formatters above.
 */
export function formatMoney(
  value: number,
  symbol: string,
  locale = "en-US",
  decimals = 2,
): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}${symbol}${formatAmount(Math.abs(value), locale, decimals)}`;
}

export function formatCountdown(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return whole < 10 ? `0${whole}` : String(whole);
}

/* ------------------------------------------------------------------ *
 * Ids & misc
 * ------------------------------------------------------------------ */

let idCounter = 0;

export function uid(prefix = "id"): string {
  idCounter = (idCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/* ------------------------------------------------------------------ *
 * Layout
 * ------------------------------------------------------------------ */

export function resolveLayoutMode(width: number, height: number): LayoutMode {
  if (height > width) return LayoutMode.Portrait;
  const shortEdge = Math.min(width, height);
  if (shortEdge <= BREAKPOINT_MOBILE) return LayoutMode.MobileLandscape;
  if (shortEdge <= BREAKPOINT_TABLET) return LayoutMode.TabletLandscape;
  return LayoutMode.DesktopLandscape;
}

export function isPortraitMode(mode: LayoutMode): boolean {
  return mode === LayoutMode.Portrait;
}

/* ------------------------------------------------------------------ *
 * Colour
 * ------------------------------------------------------------------ */

/** Blends two packed RGB colours. `t=0` returns `a`. */
export function mixColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

export function shade(color: number, amount: number): number {
  return amount >= 0 ? mixColor(color, 0xffffff, amount) : mixColor(color, 0x000000, -amount);
}

export function toCssColor(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

/* ------------------------------------------------------------------ *
 * Environment
 * ------------------------------------------------------------------ */

export function isTouchDevice(): boolean {
  return (
    typeof window !== "undefined" &&
    ("ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0)
  );
}

export function devicePixelRatioCapped(max: number): number {
  const dpr = typeof window === "undefined" ? 1 : (window.devicePixelRatio ?? 1);
  return Math.min(Math.max(dpr, 1), max);
}
