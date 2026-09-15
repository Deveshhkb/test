import type { Candle } from "../../types/market";

/**
 * Volume-weighted average price using the typical price (H+L+C)/3.
 *
 * VWAP is a session statistic: `resetKey` decides where the accumulation
 * restarts. Pass a per-day key for intraday series; omit it for a continuous
 * anchored VWAP.
 */
export function vwap(
  candles: Candle[],
  resetKey?: (candle: Candle, index: number) => string | number,
): Array<number | null> {
  let cumulativePv = 0;
  let cumulativeVolume = 0;
  let currentKey: string | number | null = null;

  return candles.map((candle, index) => {
    if (resetKey) {
      const key = resetKey(candle, index);
      if (key !== currentKey) {
        currentKey = key;
        cumulativePv = 0;
        cumulativeVolume = 0;
      }
    }
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativePv += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;
    return cumulativeVolume > 0 ? cumulativePv / cumulativeVolume : null;
  });
}

/** Groups intraday candles by UTC calendar day - the usual intraday VWAP reset. */
export function dailyResetKey(candle: Candle): number {
  return Math.floor(candle.time / 86_400);
}
