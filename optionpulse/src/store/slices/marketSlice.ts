import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { fetchMarketSnapshot } from "../../services/marketData/marketDataService";
import type { MarketSnapshot, MarketStatus, Quote, UnderlyingSymbol } from "../../types/market";
import { getMarketStatus } from "../../utils/marketStatus";

export type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

interface MarketState {
  snapshot: MarketSnapshot | null;
  status: RequestStatus;
  error: string | null;
  lastUpdated: number | null;
  /** Recomputed on a timer so the header never shows a stale session phase. */
  marketStatus: MarketStatus;
  streaming: boolean;
}

const initialState: MarketState = {
  snapshot: null,
  status: "idle",
  error: null,
  lastUpdated: null,
  marketStatus: getMarketStatus(),
  streaming: false,
};

export const loadMarketSnapshot = createAsyncThunk("market/loadSnapshot", async () =>
  fetchMarketSnapshot(),
);

const marketSlice = createSlice({
  name: "market",
  initialState,
  reducers: {
    /** Applies a single streamed quote without replacing the whole snapshot. */
    quoteUpdated(state, action: PayloadAction<{ symbol: UnderlyingSymbol; quote: Quote }>) {
      if (!state.snapshot) return;
      state.snapshot.quotes[action.payload.symbol] = action.payload.quote;
      state.lastUpdated = action.payload.quote.timestamp;
    },
    marketStatusTicked(state) {
      state.marketStatus = getMarketStatus();
    },
    streamingChanged(state, action: PayloadAction<boolean>) {
      state.streaming = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMarketSnapshot.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loadMarketSnapshot.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.snapshot = action.payload;
        state.marketStatus = action.payload.status;
        state.lastUpdated = Date.now();
      })
      .addCase(loadMarketSnapshot.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Market data is temporarily unavailable.";
      });
  },
});

export const { quoteUpdated, marketStatusTicked, streamingChanged } = marketSlice.actions;
export default marketSlice.reducer;
