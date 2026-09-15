import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { fetchHistoricalData } from "../../services/historicalData/historicalDataService";
import type { HistoricalSeries, Timeframe, UnderlyingSymbol } from "../../types/market";
import type { RequestStatus } from "./marketSlice";

export type IndicatorId =
  "EMA9" | "EMA20" | "EMA50" | "EMA100" | "EMA200" | "VWAP" | "BOLLINGER";

interface ChartState {
  symbol: UnderlyingSymbol;
  timeframe: Timeframe;
  /** Keyed `SYMBOL:TIMEFRAME` so switching back is instant. */
  series: Record<string, HistoricalSeries>;
  status: RequestStatus;
  error: string | null;
  indicators: IndicatorId[];
  rsiPeriod: number;
  macdConfig: { fastPeriod: number; slowPeriod: number; signalPeriod: number };
}

const initialState: ChartState = {
  symbol: "NIFTY",
  timeframe: "15m",
  series: {},
  status: "idle",
  error: null,
  indicators: ["EMA20", "EMA50", "VWAP"],
  rsiPeriod: 14,
  macdConfig: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
};

export function seriesKey(symbol: UnderlyingSymbol, timeframe: Timeframe): string {
  return `${symbol}:${timeframe}`;
}

export const loadHistoricalSeries = createAsyncThunk(
  "chart/loadSeries",
  async ({ symbol, timeframe }: { symbol: UnderlyingSymbol; timeframe: Timeframe }) =>
    fetchHistoricalData(symbol, timeframe),
);

const chartSlice = createSlice({
  name: "chart",
  initialState,
  reducers: {
    chartSymbolChanged(state, action: PayloadAction<UnderlyingSymbol>) {
      state.symbol = action.payload;
    },
    timeframeChanged(state, action: PayloadAction<Timeframe>) {
      state.timeframe = action.payload;
    },
    indicatorToggled(state, action: PayloadAction<IndicatorId>) {
      state.indicators = state.indicators.includes(action.payload)
        ? state.indicators.filter((id) => id !== action.payload)
        : [...state.indicators, action.payload];
    },
    rsiPeriodChanged(state, action: PayloadAction<number>) {
      state.rsiPeriod = Math.max(2, Math.min(100, Math.round(action.payload)));
    },
    macdConfigChanged(state, action: PayloadAction<Partial<ChartState["macdConfig"]>>) {
      state.macdConfig = { ...state.macdConfig, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadHistoricalSeries.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loadHistoricalSeries.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.series[seriesKey(action.payload.symbol, action.payload.timeframe)] =
          action.payload;
      })
      .addCase(loadHistoricalSeries.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Historical data is temporarily unavailable.";
      });
  },
});

export const {
  chartSymbolChanged,
  timeframeChanged,
  indicatorToggled,
  rsiPeriodChanged,
  macdConfigChanged,
} = chartSlice.actions;
export default chartSlice.reducer;
