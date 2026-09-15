import type { CustomStrikeRange, StrikeFilterId } from "./chainFilters";
import type { OptionChain, OptionChainAnalytics, OptionChainRow } from "../../types/options";
import { getATMStrike, getNearestStrike } from "./atm";
import { calculateMaxPain } from "./maxPain";
import { analyseOpenInterest } from "./oiAnalysis";
import { calculatePcr } from "./pcr";
import { calculateSupportResistance } from "./supportResistance";

export type { CustomStrikeRange, StrikeFilterId };

/**
 * Resolves the ATM strike for a chain, preferring the nearest listed strike so
 * a gappy ladder from a provider still highlights a strike that exists.
 */
export function resolveAtmStrike(chain: OptionChain): number {
  const listed = getNearestStrike(
    chain.spot,
    chain.rows.map((row: OptionChainRow) => row.strike),
  );
  return listed ?? getATMStrike(chain.spot, chain.strikeInterval);
}

/**
 * Derives every chain-level analytic in one pass.
 *
 * Shared by the browser and the backend so the two can never disagree about a
 * PCR or a max-pain strike.
 */
export function buildOptionChainAnalytics(chain: OptionChain): OptionChainAnalytics {
  return {
    symbol: chain.symbol,
    expiry: chain.expiry,
    spot: chain.spot,
    atmStrike: resolveAtmStrike(chain),
    pcr: calculatePcr(chain.rows),
    maxPain: calculateMaxPain(chain.rows, chain.spot),
    oi: analyseOpenInterest(chain.rows),
    supportResistance: calculateSupportResistance(chain.rows, chain.spot),
    timestamp: chain.timestamp,
  };
}
