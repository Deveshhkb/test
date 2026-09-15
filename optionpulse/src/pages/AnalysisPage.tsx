import { Panel } from "../components/common/Panel";
import { StatePanel } from "../components/common/StatePanel";
import { MarketBiasCard } from "../components/market/MarketBiasCard";
import { BuildupTable } from "../components/optionChain/BuildupTable";
import {
  MaxPainCard,
  OiAnalysisCard,
  PcrCard,
  SupportResistanceCard,
} from "../components/optionChain/OptionAnalytics";
import { BIAS_THRESHOLDS } from "../config/marketBias.config";
import { UNDERLYINGS } from "../config/underlyings";
import { useAppSelector } from "../store/hooks";
import {
  selectChain,
  selectChainAnalytics,
  selectChainSymbol,
  selectMarketBias,
  selectTechnicalSummary,
} from "../store/selectors";
import { KeyValue } from "../components/common/Metric";
import { formatPrice } from "../utils/format";

export function AnalysisPage() {
  const symbol = useAppSelector(selectChainSymbol);
  const analytics = useAppSelector(selectChainAnalytics);
  const chain = useAppSelector(selectChain);
  const bias = useAppSelector(selectMarketBias);
  const technicals = useAppSelector(selectTechnicalSummary);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Market analysis</h1>
          <p className="page-head__subtitle">
            {UNDERLYINGS[symbol].name} &middot; every figure below is derived from the loaded
            option chain and price series.
          </p>
        </div>
      </div>

      <div className="grid grid--analysis">
        <MarketBiasCard bias={bias} />
        <Panel title="Technical readings" subtitle="Inputs to the bias engine">
          <div className="kv-list">
            <KeyValue label="Last close" value={formatPrice(technicals.close ?? Number.NaN)} />
            <KeyValue label="EMA 20" value={formatPrice(technicals.emaFast ?? Number.NaN)} />
            <KeyValue label="EMA 50" value={formatPrice(technicals.emaSlow ?? Number.NaN)} />
            <KeyValue label="VWAP" value={formatPrice(technicals.vwap ?? Number.NaN)} />
            <KeyValue
              label="RSI 14"
              value={technicals.rsi === null ? "--" : technicals.rsi.toFixed(1)}
              tone={
                technicals.rsi === null
                  ? undefined
                  : technicals.rsi >= BIAS_THRESHOLDS.rsiOverbought
                    ? "down"
                    : technicals.rsi <= BIAS_THRESHOLDS.rsiOversold
                      ? "up"
                      : undefined
              }
            />
            <KeyValue
              label="MACD histogram"
              value={
                technicals.macdHistogram === null ? "--" : technicals.macdHistogram.toFixed(2)
              }
              tone={
                technicals.macdHistogram === null
                  ? undefined
                  : technicals.macdHistogram >= 0
                    ? "up"
                    : "down"
              }
            />
          </div>
          <p className="inline-note" style={{ marginTop: "var(--space-3)" }}>
            Indicators are computed from the 15-minute series in the calculation modules, not in
            the view.
          </p>
        </Panel>
      </div>

      {analytics && chain ? (
        <>
          <div className="grid grid--thirds">
            <PcrCard analytics={analytics} />
            <MaxPainCard analytics={analytics} />
            <OiAnalysisCard analytics={analytics} />
            <SupportResistanceCard analytics={analytics} />
          </div>
          <BuildupTable rows={chain.rows} atmStrike={analytics.atmStrike} />
        </>
      ) : (
        <Panel title="Option-chain analytics">
          <StatePanel kind="loading" />
        </Panel>
      )}
    </>
  );
}
