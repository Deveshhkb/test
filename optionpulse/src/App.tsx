import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import {
  useBiasSeriesSync,
  useMarketSnapshotSync,
  useMarketStatusTicker,
  useOptionChainSync,
} from "./hooks/useMarketDataSync";
import { AnalysisPage } from "./pages/AnalysisPage";
import { ChartsPage } from "./pages/ChartsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OptionChainPage } from "./pages/OptionChainPage";
import { PlannedPage } from "./pages/PlannedPage";
import { SettingsPage } from "./pages/SettingsPage";

/**
 * Data synchronisation is started once at the app root rather than per page, so
 * navigating between screens never refetches what is already loaded.
 */
export default function App() {
  useMarketStatusTicker();
  useMarketSnapshotSync();
  useOptionChainSync();
  useBiasSeriesSync();

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="option-chain" element={<OptionChainPage />} />
        <Route path="analysis" element={<AnalysisPage />} />
        <Route path="charts" element={<ChartsPage />} />
        <Route
          path="strategy"
          element={
            <PlannedPage
              phase="Phase 5"
              title="Strategy builder"
              summary="Build a multi-leg position and see its payoff profile."
              scope={[
                "Add buy/sell call and put legs with strike, quantity and premium",
                "Net premium, maximum profit, maximum loss, breakeven and risk/reward",
                "Payoff graph that recalculates as any leg input changes",
                "Presets: long call, long put, bull call spread, bear put spread, bull put spread, bear call spread, straddle, strangle, iron condor",
              ]}
            />
          }
        />
        <Route
          path="watchlist"
          element={
            <PlannedPage
              phase="Phase 6"
              title="Watchlist"
              summary="Track indices and individual option contracts."
              scope={[
                "Add NIFTY 50, BANK NIFTY, SENSEX and individual contracts",
                "LTP, change, change %, OI, OI change and IV per row",
                "Local persistence first, with the store shaped for backend sync later",
              ]}
            />
          }
        />
        <Route
          path="alerts"
          element={
            <PlannedPage
              phase="Phase 6"
              title="Alerts"
              summary="Price, OI, PCR and IV alerts evaluated against the live data stream."
              scope={[
                "Price alerts such as NIFTY above or below a level",
                "OI alerts such as a strike's call OI rising more than a set percentage",
                "PCR and IV threshold alerts",
                "Browser notifications first, behind an abstraction that can move server-side",
              ]}
            />
          }
        />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  );
}
