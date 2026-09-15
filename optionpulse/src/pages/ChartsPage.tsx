import { useEffect } from "react";
import { MacdChart, RsiChart } from "../components/charts/IndicatorCharts";
import { PriceChart } from "../components/charts/PriceChart";
import { Panel } from "../components/common/Panel";
import { Segmented } from "../components/common/Segmented";
import { SelectField } from "../components/common/SelectField";
import { StatePanel } from "../components/common/StatePanel";
import { UNDERLYING_LIST, UNDERLYINGS } from "../config/underlyings";
import { TIMEFRAMES } from "../services/historicalData/historicalDataService";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  chartSymbolChanged,
  indicatorToggled,
  loadHistoricalSeries,
  macdConfigChanged,
  rsiPeriodChanged,
  seriesKey,
  timeframeChanged,
  type IndicatorId,
} from "../store/slices/chartSlice";
import type { Timeframe, UnderlyingSymbol } from "../types/market";
import { classNames } from "../utils/format";
import { formatIstTimestamp } from "../utils/time";

const INDICATORS: Array<{ id: IndicatorId; label: string }> = [
  { id: "EMA9", label: "EMA 9" },
  { id: "EMA20", label: "EMA 20" },
  { id: "EMA50", label: "EMA 50" },
  { id: "EMA100", label: "EMA 100" },
  { id: "EMA200", label: "EMA 200" },
  { id: "VWAP", label: "VWAP" },
  { id: "BOLLINGER", label: "Bollinger" },
];

export function ChartsPage() {
  const dispatch = useAppDispatch();
  const symbol = useAppSelector((state) => state.chart.symbol);
  const timeframe = useAppSelector((state) => state.chart.timeframe);
  const indicators = useAppSelector((state) => state.chart.indicators);
  const rsiPeriod = useAppSelector((state) => state.chart.rsiPeriod);
  const macdConfig = useAppSelector((state) => state.chart.macdConfig);
  const status = useAppSelector((state) => state.chart.status);
  const error = useAppSelector((state) => state.chart.error);
  const series = useAppSelector((state) => state.chart.series[seriesKey(symbol, timeframe)]);

  useEffect(() => {
    if (!series) dispatch(loadHistoricalSeries({ symbol, timeframe }));
  }, [dispatch, symbol, timeframe, series]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Charts</h1>
          <p className="page-head__subtitle">
            {UNDERLYINGS[symbol].name} candles with indicators computed in the calculation
            modules.
          </p>
        </div>
        {series && (
          <span className="inline-note">
            Data timestamp: {formatIstTimestamp(series.generatedAt)}
          </span>
        )}
      </div>

      <Panel
        title="Price"
        subtitle="Candles, volume, crosshair, zoom and pan"
        actions={
          <>
            <SelectField
              id="chart-symbol"
              label="Underlying"
              value={symbol}
              options={UNDERLYING_LIST.map((item) => ({
                value: item.symbol,
                label: item.name,
              }))}
              onChange={(value) => dispatch(chartSymbolChanged(value as UnderlyingSymbol))}
            />
            <Segmented
              ariaLabel="Timeframe"
              value={timeframe}
              onChange={(value) => dispatch(timeframeChanged(value as Timeframe))}
              options={TIMEFRAMES.map((item) => ({ value: item, label: item }))}
            />
          </>
        }
      >
        <div className="indicator-toggles" style={{ marginBottom: "var(--space-3)" }}>
          {INDICATORS.map((indicator) => (
            <button
              key={indicator.id}
              type="button"
              aria-pressed={indicators.includes(indicator.id)}
              className={classNames(
                "toggle-chip",
                indicators.includes(indicator.id) && "toggle-chip--on",
              )}
              onClick={() => dispatch(indicatorToggled(indicator.id))}
            >
              {indicator.label}
            </button>
          ))}
        </div>

        {status === "failed" && <StatePanel kind="error" message={error ?? undefined} />}
        {!series && status !== "failed" && <StatePanel kind="loading" />}
        {series && <PriceChart series={series} indicators={indicators} height={430} />}
      </Panel>

      <div className="grid grid--halves">
        <Panel
          title="RSI"
          subtitle={`Wilder's RSI, period ${rsiPeriod}. 70 overbought / 30 oversold.`}
          actions={
            <label className="select-field">
              <span className="select-field__label">Period</span>
              <input
                className="input-field"
                style={{ width: 70 }}
                type="number"
                min={2}
                max={100}
                value={rsiPeriod}
                onChange={(event) => dispatch(rsiPeriodChanged(Number(event.target.value)))}
              />
            </label>
          }
        >
          {series ? (
            <RsiChart series={series} period={rsiPeriod} />
          ) : (
            <StatePanel kind="loading" />
          )}
        </Panel>

        <Panel
          title="MACD"
          subtitle={`${macdConfig.fastPeriod} / ${macdConfig.slowPeriod} / ${macdConfig.signalPeriod}`}
          actions={
            <div className="toolbar__group">
              {(["fastPeriod", "slowPeriod", "signalPeriod"] as const).map((key) => (
                <label key={key} className="select-field">
                  <span className="select-field__label">{key.replace("Period", "")}</span>
                  <input
                    className="input-field"
                    style={{ width: 62 }}
                    type="number"
                    min={1}
                    max={200}
                    value={macdConfig[key]}
                    onChange={(event) =>
                      dispatch(macdConfigChanged({ [key]: Number(event.target.value) }))
                    }
                  />
                </label>
              ))}
            </div>
          }
        >
          {series ? (
            <MacdChart series={series} config={macdConfig} />
          ) : (
            <StatePanel kind="loading" />
          )}
        </Panel>
      </div>
    </>
  );
}
