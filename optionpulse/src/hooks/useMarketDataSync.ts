import { useEffect } from "react";
import { DATA_MODE } from "../config/dataMode";
import { subscribeToQuotes } from "../services/marketData/marketDataService";
import { subscribeToOptionChain } from "../services/optionChain/optionChainService";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { BIAS_TIMEFRAME } from "../store/selectors";
import { loadHistoricalSeries, seriesKey } from "../store/slices/chartSlice";
import {
  loadMarketSnapshot,
  marketStatusTicked,
  quoteUpdated,
  streamingChanged,
} from "../store/slices/marketSlice";
import { chainStreamed, loadExpiries, loadOptionChain } from "../store/slices/optionChainSlice";

const STATUS_TICK_MS = 20_000;

/**
 * Keeps the derived session phase fresh without re-fetching anything.
 */
export function useMarketStatusTicker(): void {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const timer = setInterval(() => dispatch(marketStatusTicked()), STATUS_TICK_MS);
    return () => clearInterval(timer);
  }, [dispatch]);
}

/**
 * Loads the market snapshot once and then applies streamed quote updates.
 *
 * Streaming writes one quote at a time rather than replacing the snapshot, so
 * only the index card that actually moved re-renders.
 */
export function useMarketSnapshotSync(): void {
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.market.status);
  const isOpen = useAppSelector((state) => state.market.marketStatus.isOpen);

  useEffect(() => {
    if (status === "idle") dispatch(loadMarketSnapshot());
  }, [dispatch, status]);

  useEffect(() => {
    // Outside market hours a real feed is silent; in mock mode we keep the
    // simulated stream running so the plumbing stays exercised.
    if (!isOpen && DATA_MODE !== "MOCK") return;
    if (status !== "succeeded") return;

    dispatch(streamingChanged(true));
    const unsubscribe = subscribeToQuotes(["NIFTY", "BANKNIFTY", "SENSEX"], (symbol, quote) =>
      dispatch(quoteUpdated({ symbol, quote })),
    );
    return () => {
      unsubscribe();
      dispatch(streamingChanged(false));
    };
  }, [dispatch, isOpen, status]);
}

/** Loads the expiry ladder and chain for the selected underlying. */
export function useOptionChainSync(): void {
  const dispatch = useAppDispatch();
  const symbol = useAppSelector((state) => state.optionChain.symbol);
  const expiry = useAppSelector((state) => state.optionChain.expiry);
  const expiriesStatus = useAppSelector((state) => state.optionChain.expiriesStatus);
  const isOpen = useAppSelector((state) => state.market.marketStatus.isOpen);

  useEffect(() => {
    if (expiriesStatus === "idle") dispatch(loadExpiries(symbol));
  }, [dispatch, symbol, expiriesStatus]);

  useEffect(() => {
    if (!expiry) return;
    dispatch(loadOptionChain({ symbol, expiry }));
  }, [dispatch, symbol, expiry]);

  useEffect(() => {
    if (!expiry) return;
    if (!isOpen && DATA_MODE !== "MOCK") return;
    const unsubscribe = subscribeToOptionChain(symbol, expiry, (chain) =>
      dispatch(chainStreamed(chain)),
    );
    return unsubscribe;
  }, [dispatch, symbol, expiry, isOpen]);
}

/** Loads the candle series the bias engine reads its technical factors from. */
export function useBiasSeriesSync(): void {
  const dispatch = useAppDispatch();
  const symbol = useAppSelector((state) => state.optionChain.symbol);
  const hasSeries = useAppSelector(
    (state) => state.chart.series[seriesKey(symbol, BIAS_TIMEFRAME)] !== undefined,
  );

  useEffect(() => {
    if (!hasSeries) dispatch(loadHistoricalSeries({ symbol, timeframe: BIAS_TIMEFRAME }));
  }, [dispatch, symbol, hasSeries]);
}
