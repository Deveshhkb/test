import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  fetchExpiries,
  fetchOptionChain,
  type CustomStrikeRange,
  type StrikeFilterId,
} from "../../services/optionChain/optionChainService";
import type { UnderlyingSymbol } from "../../types/market";
import type { ExpiryInfo, OptionChain, OptionType } from "../../types/options";
import type { RequestStatus } from "./marketSlice";

export interface SelectedContract {
  strike: number;
  optionType: OptionType;
}

interface OptionChainState {
  symbol: UnderlyingSymbol;
  expiry: string | null;
  expiries: ExpiryInfo[];
  expiriesStatus: RequestStatus;
  chain: OptionChain | null;
  chainStatus: RequestStatus;
  error: string | null;
  lastUpdated: number | null;
  filter: StrikeFilterId;
  customRange: CustomStrikeRange;
  selectedContract: SelectedContract | null;
}

const initialState: OptionChainState = {
  symbol: "NIFTY",
  expiry: null,
  expiries: [],
  expiriesStatus: "idle",
  chain: null,
  chainStatus: "idle",
  error: null,
  lastUpdated: null,
  filter: "ATM10",
  customRange: { min: null, max: null },
  selectedContract: null,
};

export const loadExpiries = createAsyncThunk(
  "optionChain/loadExpiries",
  async (symbol: UnderlyingSymbol) => fetchExpiries(symbol),
);

export const loadOptionChain = createAsyncThunk(
  "optionChain/loadChain",
  async ({ symbol, expiry }: { symbol: UnderlyingSymbol; expiry: string }) =>
    fetchOptionChain(symbol, expiry),
);

const optionChainSlice = createSlice({
  name: "optionChain",
  initialState,
  reducers: {
    symbolChanged(state, action: PayloadAction<UnderlyingSymbol>) {
      if (state.symbol === action.payload) return;
      state.symbol = action.payload;
      // The expiry ladder and chain belong to the previous underlying.
      state.expiry = null;
      state.expiries = [];
      state.expiriesStatus = "idle";
      state.chain = null;
      state.chainStatus = "idle";
      state.selectedContract = null;
    },
    expiryChanged(state, action: PayloadAction<string>) {
      state.expiry = action.payload;
      state.selectedContract = null;
    },
    filterChanged(state, action: PayloadAction<StrikeFilterId>) {
      state.filter = action.payload;
    },
    customRangeChanged(state, action: PayloadAction<CustomStrikeRange>) {
      state.customRange = action.payload;
      state.filter = "CUSTOM";
    },
    contractSelected(state, action: PayloadAction<SelectedContract | null>) {
      state.selectedContract = action.payload;
    },
    /** Applied by the streaming layer; keeps the selected expiry untouched. */
    chainStreamed(state, action: PayloadAction<OptionChain>) {
      if (state.chain && action.payload.expiry !== state.chain.expiry) return;
      state.chain = action.payload;
      state.lastUpdated = action.payload.timestamp;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadExpiries.pending, (state) => {
        state.expiriesStatus = "loading";
        state.error = null;
      })
      .addCase(loadExpiries.fulfilled, (state, action) => {
        state.expiriesStatus = "succeeded";
        state.expiries = action.payload;
        const stillValid =
          state.expiry !== null && action.payload.some((item) => item.date === state.expiry);
        if (!stillValid) state.expiry = action.payload[0]?.date ?? null;
      })
      .addCase(loadExpiries.rejected, (state, action) => {
        state.expiriesStatus = "failed";
        state.error = action.error.message ?? "Could not load the expiry list.";
      })
      .addCase(loadOptionChain.pending, (state) => {
        state.chainStatus = "loading";
        state.error = null;
      })
      .addCase(loadOptionChain.fulfilled, (state, action) => {
        state.chainStatus = "succeeded";
        state.chain = action.payload;
        state.lastUpdated = action.payload.timestamp;
      })
      .addCase(loadOptionChain.rejected, (state, action) => {
        state.chainStatus = "failed";
        state.chain = null;
        state.error = action.error.message ?? "Option chain data is temporarily unavailable.";
      });
  },
});

export const {
  symbolChanged,
  expiryChanged,
  filterChanged,
  customRangeChanged,
  contractSelected,
  chainStreamed,
} = optionChainSlice.actions;
export default optionChainSlice.reducer;
