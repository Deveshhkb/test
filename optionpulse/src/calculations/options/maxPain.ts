import type { MaxPainResult, MaxPainStrikeLoss, OptionChainRow } from "../../types/options";
import { intrinsicValue } from "./atm";

/**
 * Max Pain: the strike at which the aggregate intrinsic value owed by option
 * writers is smallest, given the current open interest.
 *
 * For each candidate settlement price S we sum, across every strike K:
 *   call loss = max(0, S - K) * call OI at K
 *   put  loss = max(0, K - S) * put OI at K
 * The candidate with the smallest total is the max-pain strike.
 *
 * Assumption: open interest stays as it is today. It does not, so max pain
 * moves during the expiry cycle - it is a positioning reference, not a target.
 */
export function calculateMaxPain(rows: OptionChainRow[], spot: number): MaxPainResult {
  const losses: MaxPainStrikeLoss[] = rows.map((candidate) => ({
    strike: candidate.strike,
    totalLoss: totalWriterLossAt(rows, candidate.strike),
  }));

  const best = losses.reduce<MaxPainStrikeLoss | null>((lowest, entry) => {
    if (lowest === null || entry.totalLoss < lowest.totalLoss) return entry;
    return lowest;
  }, null);

  const maxPainStrike = best?.strike ?? 0;
  const distance = maxPainStrike === 0 ? 0 : spot - maxPainStrike;

  return {
    maxPainStrike,
    spot,
    distance,
    distancePercent: maxPainStrike === 0 ? 0 : (distance / maxPainStrike) * 100,
    losses,
    mode: "CALCULATED",
  };
}

/** Aggregate intrinsic value option writers owe if expiry settled at `settlement`. */
export function totalWriterLossAt(rows: OptionChainRow[], settlement: number): number {
  let total = 0;
  for (const row of rows) {
    total += intrinsicValue(row.strike, "CE", settlement) * row.call.openInterest;
    total += intrinsicValue(row.strike, "PE", settlement) * row.put.openInterest;
  }
  return total;
}
