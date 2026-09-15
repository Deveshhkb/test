import type { OptionChainRow, PcrResult } from "../../types/options";

/**
 * Put-Call Ratio by open interest, with the volume PCR alongside it.
 *
 * PCR = total put OI / total call OI.
 *
 * PCR describes current positioning; it is one input among many and does not
 * predict direction on its own.
 */
export function calculatePcr(rows: OptionChainRow[]): PcrResult {
  let totalPutOi = 0;
  let totalCallOi = 0;
  let totalPutVolume = 0;
  let totalCallVolume = 0;

  for (const row of rows) {
    totalPutOi += row.put.openInterest;
    totalCallOi += row.call.openInterest;
    totalPutVolume += row.put.volume;
    totalCallVolume += row.call.volume;
  }

  const pcr = totalCallOi > 0 ? totalPutOi / totalCallOi : 0;
  const volumePcr = totalCallVolume > 0 ? totalPutVolume / totalCallVolume : 0;

  return {
    totalPutOi,
    totalCallOi,
    pcr,
    volumePcr,
    interpretation: interpretPcr(pcr),
    mode: "CALCULATED",
  };
}

/** Thresholds are conventional reference bands, not signals. */
export const PCR_BANDS = {
  veryLow: 0.7,
  low: 0.9,
  high: 1.2,
  veryHigh: 1.5,
} as const;

export function interpretPcr(pcr: number): string {
  if (pcr <= 0) return "Not enough open interest to compute a ratio.";
  if (pcr < PCR_BANDS.veryLow) {
    return "Call writing dominates - positioning leans bearish, and readings this low are often stretched.";
  }
  if (pcr < PCR_BANDS.low)
    return "Call open interest exceeds put open interest - positioning leans bearish.";
  if (pcr <= PCR_BANDS.high)
    return "Call and put open interest are broadly balanced - no clear positioning skew.";
  if (pcr <= PCR_BANDS.veryHigh)
    return "Put open interest exceeds call open interest - positioning leans bullish.";
  return "Put writing dominates - positioning leans bullish, and readings this high are often stretched.";
}
