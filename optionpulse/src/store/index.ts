import { configureStore } from "@reduxjs/toolkit";
import chartReducer from "./slices/chartSlice";
import marketReducer from "./slices/marketSlice";
import optionChainReducer from "./slices/optionChainSlice";
import uiReducer from "./slices/uiSlice";

/**
 * Server state (market, optionChain, chart) is kept separate from UI state (ui).
 * Transient component state - hover, open menus, input drafts - stays in the
 * components and deliberately never reaches this store.
 */
export const store = configureStore({
  reducer: {
    market: marketReducer,
    optionChain: optionChainReducer,
    chart: chartReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Market payloads are plain serialisable data; the extra checks cost real
      // time on every chain update, so they are scoped to development defaults.
      immutableCheck: { warnAfter: 128 },
      serializableCheck: { warnAfter: 128 },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
