import type { OptionChainRow, OptionLeg, OptionType } from "../../types/options";

interface LegSpec {
  ltp?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  openInterest?: number;
  changeInOpenInterest?: number;
  impliedVolatility?: number;
}

function leg(optionType: OptionType, strike: number, spec: LegSpec = {}): OptionLeg {
  const ltp = spec.ltp ?? 100;
  return {
    optionType,
    strike,
    ltp,
    change: spec.change ?? 0,
    changePercent: spec.changePercent ?? 0,
    bid: ltp - 0.5,
    ask: ltp + 0.5,
    volume: spec.volume ?? 0,
    openInterest: spec.openInterest ?? 0,
    changeInOpenInterest: spec.changeInOpenInterest ?? 0,
    impliedVolatility: spec.impliedVolatility ?? 15,
  };
}

export function row(strike: number, call: LegSpec = {}, put: LegSpec = {}): OptionChainRow {
  return { strike, call: leg("CE", strike, call), put: leg("PE", strike, put) };
}

/**
 * Deterministic four-strike chain used across the calculation tests.
 * Spot is assumed to be 100 for classification tests.
 */
export const TEST_CHAIN: OptionChainRow[] = [
  row(90, { openInterest: 100, volume: 10 }, { openInterest: 400, volume: 40 }),
  row(95, { openInterest: 200, volume: 20 }, { openInterest: 300, volume: 30 }),
  row(100, { openInterest: 300, volume: 30 }, { openInterest: 200, volume: 20 }),
  row(105, { openInterest: 400, volume: 40 }, { openInterest: 100, volume: 10 }),
];
