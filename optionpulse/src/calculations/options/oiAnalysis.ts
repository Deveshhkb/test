import type { OiAnalysis, OiExtreme, OptionChainRow } from "../../types/options";

function maxBy(
  rows: OptionChainRow[],
  pick: (row: OptionChainRow) => number,
): OiExtreme | null {
  let best: OiExtreme | null = null;
  for (const row of rows) {
    const value = pick(row);
    if (!Number.isFinite(value)) continue;
    if (best === null || value > best.value) {
      best = { strike: row.strike, value };
    }
  }
  return best;
}

/**
 * Locates the notable strikes in a chain. Every value is derived from the
 * chain passed in - nothing here is hardcoded.
 */
export function analyseOpenInterest(rows: OptionChainRow[]): OiAnalysis {
  return {
    highestCallOi: maxBy(rows, (row) => row.call.openInterest),
    highestPutOi: maxBy(rows, (row) => row.put.openInterest),
    highestCallOiAddition: maxBy(rows, (row) => row.call.changeInOpenInterest),
    highestPutOiAddition: maxBy(rows, (row) => row.put.changeInOpenInterest),
    highestVolumeStrike: maxBy(rows, (row) => row.call.volume + row.put.volume),
    highestIvStrike: maxBy(rows, (row) =>
      Math.max(row.call.impliedVolatility, row.put.impliedVolatility),
    ),
    mode: "CALCULATED",
  };
}

/** Net OI change across the chain, split by side. */
export function netOiChange(rows: OptionChainRow[]): { call: number; put: number } {
  return rows.reduce(
    (totals, row) => ({
      call: totals.call + row.call.changeInOpenInterest,
      put: totals.put + row.put.changeInOpenInterest,
    }),
    { call: 0, put: 0 },
  );
}
