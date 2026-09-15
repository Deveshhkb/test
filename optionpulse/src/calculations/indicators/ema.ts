/**
 * Exponential moving average.
 *
 * Seeded with the simple average of the first `period` values, which is the
 * convention charting platforms use. Entries before the seed are `null` so the
 * result stays index-aligned with the input series.
 */
export function ema(values: number[], period: number): Array<number | null> {
  if (period <= 0) throw new Error("EMA period must be positive");
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (values.length < period) return out;

  const multiplier = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i += 1) seed += values[i];
  let previous = seed / period;
  out[period - 1] = previous;

  for (let i = period; i < values.length; i += 1) {
    previous = (values[i] - previous) * multiplier + previous;
    out[i] = previous;
  }
  return out;
}

/** Simple moving average, index-aligned with the input. */
export function sma(values: number[], period: number): Array<number | null> {
  if (period <= 0) throw new Error("SMA period must be positive");
  const out: Array<number | null> = new Array(values.length).fill(null);
  let windowSum = 0;
  for (let i = 0; i < values.length; i += 1) {
    windowSum += values[i];
    if (i >= period) windowSum -= values[i - period];
    if (i >= period - 1) out[i] = windowSum / period;
  }
  return out;
}

/** Last defined value of an indicator series. */
export function lastDefined(series: Array<number | null>): number | null {
  for (let i = series.length - 1; i >= 0; i -= 1) {
    const value = series[i];
    if (value !== null && Number.isFinite(value)) return value;
  }
  return null;
}
