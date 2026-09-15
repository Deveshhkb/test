import type { BuildupType } from "../../types/options";

export interface BuildupResult {
  type: BuildupType;
  label: string;
  /** Short explanation of what the price/OI combination implies. */
  description: string;
  /** Directional lean of the buildup: 1 bullish, -1 bearish, 0 neutral. */
  bias: 1 | 0 | -1;
}

const BUILDUPS: Record<BuildupType, Omit<BuildupResult, "type">> = {
  LONG_BUILDUP: {
    label: "Long buildup",
    description: "Price up with open interest up - new long positions are being added.",
    bias: 1,
  },
  SHORT_BUILDUP: {
    label: "Short buildup",
    description: "Price down with open interest up - new short positions are being added.",
    bias: -1,
  },
  SHORT_COVERING: {
    label: "Short covering",
    description: "Price up with open interest down - existing shorts are being closed.",
    bias: 1,
  },
  LONG_UNWINDING: {
    label: "Long unwinding",
    description: "Price down with open interest down - existing longs are being closed.",
    bias: -1,
  },
  NEUTRAL: {
    label: "No clear buildup",
    description: "Price or open-interest change is too small to classify.",
    bias: 0,
  },
};

/**
 * Classifies option activity from the price change and the open-interest change.
 *
 * `epsilon` guards against classifying noise: changes at or below it are
 * treated as flat.
 */
export function detectBuildup(
  priceChange: number,
  oiChange: number,
  epsilon = 0,
): BuildupResult {
  const priceUp = priceChange > epsilon;
  const priceDown = priceChange < -epsilon;
  const oiUp = oiChange > epsilon;
  const oiDown = oiChange < -epsilon;

  let type: BuildupType = "NEUTRAL";
  if (priceUp && oiUp) type = "LONG_BUILDUP";
  else if (priceDown && oiUp) type = "SHORT_BUILDUP";
  else if (priceUp && oiDown) type = "SHORT_COVERING";
  else if (priceDown && oiDown) type = "LONG_UNWINDING";

  return { type, ...BUILDUPS[type] };
}

export function describeBuildup(type: BuildupType): Omit<BuildupResult, "type"> {
  return BUILDUPS[type];
}
