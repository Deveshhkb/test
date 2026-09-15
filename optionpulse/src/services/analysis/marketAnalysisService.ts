import { ema, lastDefined } from "../../calculations/indicators/ema";
import { macd } from "../../calculations/indicators/macd";
import { rsi } from "../../calculations/indicators/rsi";
import { dailyResetKey, vwap } from "../../calculations/indicators/vwap";
import {
  calculateMarketBias,
  type MarketBiasInput,
} from "../../calculations/market/marketBias";
import { netOiChange } from "../../calculations/options/oiAnalysis";
import type {
  HistoricalSeries,
  MarketBiasResult,
  MarketSnapshot,
  UnderlyingSymbol,
} from "../../types/market";
import type { OptionChain, OptionChainAnalytics } from "../../types/options";

export interface TechnicalSummary {
  close: number | null;
  emaFast: number | null;
  emaSlow: number | null;
  rsi: number | null;
  macdLine: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  vwap: number | null;
}

export const BIAS_EMA_FAST = 20;
export const BIAS_EMA_SLOW = 50;
export const BIAS_RSI_PERIOD = 14;

/**
 * Condenses a candle series into the handful of indicator readings the bias
 * engine consumes. Indicator maths lives in `calculations/`; this only selects.
 */
export function summariseTechnicals(series: HistoricalSeries | null): TechnicalSummary {
  const empty: TechnicalSummary = {
    close: null,
    emaFast: null,
    emaSlow: null,
    rsi: null,
    macdLine: null,
    macdSignal: null,
    macdHistogram: null,
    vwap: null,
  };
  if (!series || series.candles.length === 0) return empty;

  const closes = series.candles.map((candle) => candle.close);
  const macdSeries = macd(closes);
  const lastMacd = macdSeries[macdSeries.length - 1];
  const vwapSeries = vwap(series.candles, dailyResetKey);

  return {
    close: closes[closes.length - 1] ?? null,
    emaFast: lastDefined(ema(closes, BIAS_EMA_FAST)),
    emaSlow: lastDefined(ema(closes, BIAS_EMA_SLOW)),
    rsi: lastDefined(rsi(closes, BIAS_RSI_PERIOD)),
    macdLine: lastMacd?.macd ?? null,
    macdSignal: lastMacd?.signal ?? null,
    macdHistogram: lastMacd?.histogram ?? null,
    vwap: vwapSeries[vwapSeries.length - 1] ?? null,
  };
}

export interface BiasAssemblyInput {
  symbol: UnderlyingSymbol;
  snapshot: MarketSnapshot | null;
  chain: OptionChain | null;
  analytics: OptionChainAnalytics | null;
  technicals: TechnicalSummary;
}

/**
 * Assembles the bias engine's inputs from whatever data is currently loaded.
 * Missing pieces are simply omitted - the engine then reports on the factors it
 * could actually evaluate rather than inventing neutral ones.
 */
export function buildBiasInput({
  symbol,
  snapshot,
  chain,
  analytics,
  technicals,
}: BiasAssemblyInput): MarketBiasInput {
  const quote = snapshot?.quotes[symbol] ?? null;
  const oiChange = chain ? netOiChange(chain.rows) : null;

  const input: MarketBiasInput = {
    close: technicals.close ?? quote?.ltp,
    emaFast: technicals.emaFast,
    emaSlow: technicals.emaSlow,
    rsi: technicals.rsi,
    macdLine: technicals.macdLine,
    macdSignal: technicals.macdSignal,
    macdHistogram: technicals.macdHistogram,
    vwap: technicals.vwap,
  };

  if (quote) {
    input.changePercent = quote.changePercent;
    input.spot = quote.ltp;
  }
  if (snapshot) {
    input.advanceDeclineRatio = snapshot.breadth.advanceDeclineRatio;
    input.vix = snapshot.vix.value;
    input.vixChangePercent = snapshot.vix.changePercent;
    input.fiiNetCrore = snapshot.institutional.fiiNetCrore;
    input.diiNetCrore = snapshot.institutional.diiNetCrore;
  }
  if (analytics) {
    input.pcr = analytics.pcr.pcr;
    input.spot = analytics.spot;
    input.nearestSupport = analytics.supportResistance.supports[0]?.strike ?? null;
    input.nearestResistance = analytics.supportResistance.resistances[0]?.strike ?? null;
  }
  if (oiChange) {
    input.netCallOiChange = oiChange.call;
    input.netPutOiChange = oiChange.put;
  }

  return input;
}

export function computeMarketBias(input: BiasAssemblyInput): MarketBiasResult {
  return calculateMarketBias(buildBiasInput(input));
}
