import { Link } from "react-router-dom";
import { BreadthCard, InstitutionalFlowCard } from "../components/market/BreadthCard";
import { MarketBiasCard } from "../components/market/MarketBiasCard";
import { MarketSummary } from "../components/market/MarketSummary";
import { PriceChart } from "../components/charts/PriceChart";
import {
  MaxPainCard,
  PcrCard,
  SupportResistanceCard,
} from "../components/optionChain/OptionAnalytics";
import { Panel } from "../components/common/Panel";
import { StatePanel } from "../components/common/StatePanel";
import { UNDERLYINGS } from "../config/underlyings";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  BIAS_TIMEFRAME,
  selectBiasSeries,
  selectChainAnalytics,
  selectChainSymbol,
  selectMarketBias,
  selectMarketError,
  selectMarketRequestStatus,
  selectMarketSnapshot,
  selectMarketStatus,
} from "../store/selectors";
import { symbolChanged } from "../store/slices/optionChainSlice";

/**
 * Answers the product's core question at a glance: what the three indices are
 * doing, what the option chain says about positioning, and what the bias engine
 * scores from those inputs.
 */
export function DashboardPage() {
  const dispatch = useAppDispatch();
  const snapshot = useAppSelector(selectMarketSnapshot);
  const status = useAppSelector(selectMarketRequestStatus);
  const error = useAppSelector(selectMarketError);
  const symbol = useAppSelector(selectChainSymbol);
  const analytics = useAppSelector(selectChainAnalytics);
  const bias = useAppSelector(selectMarketBias);
  const series = useAppSelector(selectBiasSeries);
  const indicators = useAppSelector((state) => state.chart.indicators);
  const marketStatus = useAppSelector(selectMarketStatus);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Market dashboard</h1>
          <p className="page-head__subtitle">
            NIFTY 50, BANK NIFTY and SENSEX with option-chain derived analytics.
          </p>
        </div>
        {!marketStatus.isOpen && marketStatus.nextChangeLabel && (
          <span className="inline-note">{marketStatus.nextChangeLabel}</span>
        )}
      </div>

      <MarketSummary
        snapshot={snapshot}
        loading={status === "loading"}
        error={error}
        selectedSymbol={symbol}
        onSelect={(next) => dispatch(symbolChanged(next))}
      />

      <div className="grid grid--analysis">
        <MarketBiasCard bias={bias} />

        <Panel
          title={`${UNDERLYINGS[symbol].name} price`}
          subtitle={`${BIAS_TIMEFRAME} candles · the bias engine reads its technical factors from this series`}
          actions={
            <Link to="/charts" className="btn btn--ghost">
              Open charts
            </Link>
          }
        >
          {series ? (
            <PriceChart series={series} indicators={indicators} height={360} />
          ) : (
            <StatePanel kind="loading" />
          )}
        </Panel>
      </div>

      <div className="grid grid--thirds">
        {analytics ? (
          <>
            <PcrCard analytics={analytics} />
            <MaxPainCard analytics={analytics} />
            <SupportResistanceCard analytics={analytics} />
          </>
        ) : (
          <Panel title="Option-chain analytics">
            <StatePanel
              kind="loading"
              message="Loading the option chain for the nearest expiry."
            />
          </Panel>
        )}
      </div>

      <div className="grid grid--halves">
        {snapshot ? (
          <>
            <BreadthCard breadth={snapshot.breadth} />
            <InstitutionalFlowCard activity={snapshot.institutional} />
          </>
        ) : null}
      </div>
    </>
  );
}
