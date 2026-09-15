import { sma } from "./ema";

export interface BollingerBand {
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

export interface BollingerConfig {
  period: number;
  standardDeviations: number;
}

export const DEFAULT_BOLLINGER_CONFIG: BollingerConfig = {
  period: 20,
  standardDeviations: 2,
};

/**
 * Bollinger Bands around a simple moving average, using the population
 * standard deviation of the same window (the original formulation).
 */
export function bollingerBands(
  values: number[],
  config: Partial<BollingerConfig> = {},
): BollingerBand[] {
  const { period, standardDeviations } = { ...DEFAULT_BOLLINGER_CONFIG, ...config };
  const middle = sma(values, period);

  return values.map((_, i) => {
    const mean = middle[i];
    if (mean === null) return { upper: null, middle: null, lower: null };
    let varianceSum = 0;
    for (let j = i - period + 1; j <= i; j += 1) {
      varianceSum += (values[j] - mean) ** 2;
    }
    const deviation = Math.sqrt(varianceSum / period);
    return {
      upper: mean + standardDeviations * deviation,
      middle: mean,
      lower: mean - standardDeviations * deviation,
    };
  });
}
