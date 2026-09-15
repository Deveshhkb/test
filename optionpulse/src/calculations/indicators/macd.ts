import { ema } from "./ema";

export interface MacdPoint {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

export interface MacdConfig {
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
}

export const DEFAULT_MACD_CONFIG: MacdConfig = {
  fastPeriod: 12,
  slowPeriod: 26,
  signalPeriod: 9,
};

/**
 * MACD line = EMA(fast) - EMA(slow); signal = EMA of the MACD line;
 * histogram = MACD - signal. The signal EMA is seeded only once the MACD line
 * exists, so early bars stay null rather than being fabricated.
 */
export function macd(values: number[], config: Partial<MacdConfig> = {}): MacdPoint[] {
  const { fastPeriod, slowPeriod, signalPeriod } = { ...DEFAULT_MACD_CONFIG, ...config };
  const fast = ema(values, fastPeriod);
  const slow = ema(values, slowPeriod);

  const macdLine: Array<number | null> = values.map((_, i) => {
    const f = fast[i];
    const s = slow[i];
    return f === null || s === null ? null : f - s;
  });

  const firstDefined = macdLine.findIndex((value) => value !== null);
  const compact = firstDefined === -1 ? [] : (macdLine.slice(firstDefined) as number[]);
  const signalCompact = ema(compact, signalPeriod);

  return values.map((_, i) => {
    const macdValue = macdLine[i];
    const signalValue =
      firstDefined === -1 || i < firstDefined ? null : signalCompact[i - firstDefined];
    return {
      macd: macdValue,
      signal: signalValue ?? null,
      histogram:
        macdValue === null || signalValue === null || signalValue === undefined
          ? null
          : macdValue - signalValue,
    };
  });
}
