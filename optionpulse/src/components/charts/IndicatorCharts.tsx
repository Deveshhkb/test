import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useMemo, useRef } from "react";
import { macd, type MacdConfig } from "../../calculations/indicators/macd";
import { RSI_LEVELS, rsi } from "../../calculations/indicators/rsi";
import { useAppSelector } from "../../store/hooks";
import type { HistoricalSeries } from "../../types/market";
import { INTRADAY_TIMEFRAMES, baseChartOptions, readChartPalette } from "./chartTheme";

const PANEL_HEIGHT = 150;

/** RSI panel with overbought / oversold reference lines. */
export function RsiChart({ series, period }: { series: HistoricalSeries; period: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const theme = useAppSelector((state) => state.ui.theme);
  const intraday = INTRADAY_TIMEFRAMES.has(series.timeframe);

  const data = useMemo(() => {
    const values = rsi(
      series.candles.map((candle) => candle.close),
      period,
    );
    return series.candles
      .map((candle, index) => ({ time: candle.time as UTCTimestamp, value: values[index] }))
      .filter((point): point is { time: UTCTimestamp; value: number } => point.value !== null);
  }, [series, period]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const palette = readChartPalette();
    const chart = createChart(container, {
      ...baseChartOptions(palette, intraday),
      width: container.clientWidth,
      height: PANEL_HEIGHT,
    });
    const line = chart.addLineSeries({
      color: palette.violet,
      lineWidth: 2,
      priceLineVisible: false,
    });
    line.createPriceLine({
      price: RSI_LEVELS.overbought,
      color: palette.bear,
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "70",
    });
    line.createPriceLine({
      price: RSI_LEVELS.oversold,
      color: palette.bull,
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "30",
    });

    chartRef.current = chart;
    lineRef.current = line;

    const observer = new ResizeObserver(() =>
      chart.applyOptions({ width: container.clientWidth }),
    );
    observer.observe(container);
    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      lineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const palette = readChartPalette();
    chartRef.current?.applyOptions(baseChartOptions(palette, intraday));
    lineRef.current?.applyOptions({ color: palette.violet });
  }, [theme, intraday]);

  useEffect(() => {
    lineRef.current?.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return <div ref={containerRef} style={{ width: "100%", height: PANEL_HEIGHT }} />;
}

/** MACD panel: MACD line, signal line and histogram. */
export function MacdChart({
  series,
  config,
}: {
  series: HistoricalSeries;
  config: MacdConfig;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const macdRef = useRef<ISeriesApi<"Line"> | null>(null);
  const signalRef = useRef<ISeriesApi<"Line"> | null>(null);
  const histogramRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const theme = useAppSelector((state) => state.ui.theme);
  const intraday = INTRADAY_TIMEFRAMES.has(series.timeframe);

  const data = useMemo(() => {
    const palette = readChartPalette();
    const points = macd(
      series.candles.map((candle) => candle.close),
      config,
    );
    const times = series.candles.map((candle) => candle.time as UTCTimestamp);
    return {
      macd: points
        .map((point, index) => ({ time: times[index], value: point.macd }))
        .filter((p): p is { time: UTCTimestamp; value: number } => p.value !== null),
      signal: points
        .map((point, index) => ({ time: times[index], value: point.signal }))
        .filter((p): p is { time: UTCTimestamp; value: number } => p.value !== null),
      histogram: points
        .map((point, index) => ({
          time: times[index],
          value: point.histogram,
          color: (point.histogram ?? 0) >= 0 ? `${palette.bull}99` : `${palette.bear}99`,
        }))
        .filter(
          (p): p is { time: UTCTimestamp; value: number; color: string } => p.value !== null,
        ),
    };
  }, [series, config]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const palette = readChartPalette();
    const chart = createChart(container, {
      ...baseChartOptions(palette, intraday),
      width: container.clientWidth,
      height: PANEL_HEIGHT,
    });
    histogramRef.current = chart.addHistogramSeries({ priceLineVisible: false });
    macdRef.current = chart.addLineSeries({
      color: palette.accent,
      lineWidth: 2,
      priceLineVisible: false,
    });
    signalRef.current = chart.addLineSeries({
      color: palette.warn,
      lineWidth: 1,
      priceLineVisible: false,
    });
    chartRef.current = chart;

    const observer = new ResizeObserver(() =>
      chart.applyOptions({ width: container.clientWidth }),
    );
    observer.observe(container);
    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      macdRef.current = null;
      signalRef.current = null;
      histogramRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const palette = readChartPalette();
    chartRef.current?.applyOptions(baseChartOptions(palette, intraday));
    macdRef.current?.applyOptions({ color: palette.accent });
    signalRef.current?.applyOptions({ color: palette.warn });
  }, [theme, intraday]);

  useEffect(() => {
    histogramRef.current?.setData(data.histogram);
    macdRef.current?.setData(data.macd);
    signalRef.current?.setData(data.signal);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return <div ref={containerRef} style={{ width: "100%", height: PANEL_HEIGHT }} />;
}
