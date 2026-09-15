import type { MarketBreadth } from "../../types/market";

/** Advance/decline ratio, guarded against a zero denominator. */
export function advanceDeclineRatio(advances: number, declines: number): number {
  if (declines <= 0) return advances > 0 ? advances : 0;
  return advances / declines;
}

export function buildBreadth(
  advances: number,
  declines: number,
  unchanged: number,
  mode: MarketBreadth["mode"] = "CALCULATED",
): MarketBreadth {
  return {
    advances,
    declines,
    unchanged,
    advanceDeclineRatio: advanceDeclineRatio(advances, declines),
    mode,
  };
}

export function describeBreadth(ratio: number): string {
  if (ratio >= 2) return "Broad participation on the upside";
  if (ratio >= 1.2) return "More advances than declines";
  if (ratio >= 0.83) return "Advances and declines broadly balanced";
  if (ratio >= 0.5) return "More declines than advances";
  return "Broad participation on the downside";
}
