import { createSelector } from "@reduxjs/toolkit";
import {
  buildOptionChainAnalytics,
  filterChainRows,
} from "../services/optionChain/optionChainService";
import {
  computeMarketBias,
  summariseTechnicals,
} from "../services/analysis/marketAnalysisService";
import type { RootState } from "./index";
import { seriesKey } from "./slices/chartSlice";
import { DATA_MODE } from "../config/dataMode";
import type { DataMode, Timeframe } from "../types/market";

/** Timeframe the bias engine reads its technical factors from. */
export const BIAS_TIMEFRAME: Timeframe = "15m";

export const selectMarketSnapshot = (state: RootState) => state.market.snapshot;
export const selectMarketStatus = (state: RootState) => state.market.marketStatus;
export const selectMarketRequestStatus = (state: RootState) => state.market.status;
export const selectMarketError = (state: RootState) => state.market.error;

/**
 * Provenance of the data actually loaded, not what configuration claims.
 *
 * A build configured as LIVE that is being served simulated payloads must show
 * MOCK: the payload's own mode always wins, and the configured mode is only a
 * fallback for the moment before anything has loaded.
 */
export const selectActiveDataMode = (state: RootState): DataMode =>
  state.market.snapshot?.quotes.NIFTY.mode ?? state.optionChain.chain?.mode ?? DATA_MODE;

/** True when configuration and payload disagree - always worth surfacing. */
export const selectDataModeMismatch = (state: RootState): boolean => {
  const actual = state.market.snapshot?.quotes.NIFTY.mode ?? state.optionChain.chain?.mode;
  return actual !== undefined && actual !== DATA_MODE;
};

export const selectChainSymbol = (state: RootState) => state.optionChain.symbol;
export const selectChain = (state: RootState) => state.optionChain.chain;
export const selectChainStatus = (state: RootState) => state.optionChain.chainStatus;
export const selectExpiries = (state: RootState) => state.optionChain.expiries;
export const selectSelectedExpiry = (state: RootState) => state.optionChain.expiry;
export const selectStrikeFilter = (state: RootState) => state.optionChain.filter;
export const selectCustomRange = (state: RootState) => state.optionChain.customRange;
export const selectSelectedContract = (state: RootState) => state.optionChain.selectedContract;

/**
 * Chain analytics are derived, not stored: computing them in a memoised
 * selector keeps a single source of truth and avoids a second Redux write on
 * every streamed chain update.
 */
export const selectChainAnalytics = createSelector([selectChain], (chain) =>
  chain ? buildOptionChainAnalytics(chain) : null,
);

export const selectAtmStrike = createSelector(
  [selectChainAnalytics],
  (analytics) => analytics?.atmStrike ?? null,
);

export const selectVisibleChainRows = createSelector(
  [selectChain, selectChainAnalytics, selectStrikeFilter, selectCustomRange],
  (chain, analytics, filter, customRange) => {
    if (!chain || !analytics) return [];
    return filterChainRows(
      chain.rows,
      filter,
      analytics.atmStrike,
      chain.strikeInterval,
      customRange,
    );
  },
);

export const selectBiasSeries = (state: RootState) =>
  state.chart.series[seriesKey(state.optionChain.symbol, BIAS_TIMEFRAME)] ?? null;

export const selectTechnicalSummary = createSelector([selectBiasSeries], (series) =>
  summariseTechnicals(series),
);

export const selectMarketBias = createSelector(
  [
    selectChainSymbol,
    selectMarketSnapshot,
    selectChain,
    selectChainAnalytics,
    selectTechnicalSummary,
  ],
  (symbol, snapshot, chain, analytics, technicals) =>
    computeMarketBias({ symbol, snapshot, chain, analytics, technicals }),
);

export const selectExpiryInfo = createSelector(
  [selectExpiries, selectSelectedExpiry],
  (expiries, expiry) => expiries.find((item) => item.date === expiry) ?? null,
);
