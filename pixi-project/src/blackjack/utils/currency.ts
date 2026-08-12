import { BETTING } from "../config/gameConfig";

const formatter = new Intl.NumberFormat(BETTING.currencyLocale, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `1234.5` -> `$1,234.50` */
export function formatCurrency(value: number): string {
  return `${BETTING.currencySymbol}${formatter.format(value)}`;
}

/** Signed variant used for win/loss deltas. */
export function formatDelta(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

/** Compact chip face labels: 1000 -> 1K, 25000 -> 25K. */
export function formatChipLabel(value: number): string {
  if (value >= 1_000_000) return `${trim(value / 1_000_000)}M`;
  if (value >= 1_000) return `${trim(value / 1_000)}K`;
  return String(value);
}

function trim(value: number): string {
  return Number(value.toFixed(1)).toString();
}
