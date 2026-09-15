import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";
import { bollingerBands } from "../../calculations/indicators/bollinger";
import { ema } from "../../calculations/indicators/ema";
import { dailyResetKey, vwap } from "../../calculations/indicators/vwap";
import { useAppSelector } from "../../store/hooks";
import type { IndicatorId } from "../../store/slices/chartSlice";
import type { Candle, HistoricalSeries } from "../../types/market";
import { INTRADAY_TIMEFRAMES, baseChartOptions, readChartPalette } from "./chartTheme";

interface PriceChartProps {
  series: HistoricalSeries;
  indicators: IndicatorId[];
  height?: number;
}

const EMA_PERIODS: Partial<Record<IndicatorId, number>> = {
  EMA9: 9,
  EMA20: 20,
  EMA50: 50,
  EMA100: 100,
  EMA200: 200,
};

/**
 * Candlestick chart with a volume pane and optional overlays.
 *
 * The chart instance is created once and then mutated: recreating it on every
 * render would drop the user's zoom and pan, and is the single most expensive
 * mistake available on this screen.
 */
export function PriceChart({ series, indicators, height = 420 }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const overlaysRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const theme = useAppSelector((state) => state.ui.theme);
  const [fullscreen, setFullscreen] = useState(false);

  const intraday = INTRADAY_TIMEFRAMES.has(series.timeframe);

  // --- create once -------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const palette = readChartPalette();
    const chart = createChart(container, {
      ...baseChartOptions(palette, intraday),
      width: container.clientWidth,
      height: container.clientHeight,
    });

    const candles = chart.addCandlestickSeries({
      upColor: palette.bull,
      downColor: palette.bear,
      borderUpColor: palette.bull,
      borderDownColor: palette.bear,
      wickUpColor: palette.bull,
      wickDownColor: palette.bear,
      priceLineVisible: false,
    });
    candles.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.26 } });

    const volume = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      priceLineVisible: false,
      lastValueVisible: false,
    });
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    chartRef.current = chart;
    candleRef.current = candles;
    volumeRef.current = volume;
    const overlays = overlaysRef.current;

    const observer = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      overlays.clear();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
    };
    // Intentionally created once; later effects mutate the instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- theme + timeframe options ----------------------------------------
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const palette = readChartPalette();
    chart.applyOptions(baseChartOptions(palette, intraday));
    candleRef.current?.applyOptions({
      upColor: palette.bull,
      downColor: palette.bear,
      borderUpColor: palette.bull,
      borderDownColor: palette.bear,
      wickUpColor: palette.bull,
      wickDownColor: palette.bear,
    });
  }, [theme, intraday]);

  // --- data --------------------------------------------------------------
  useEffect(() => {
    const candles = candleRef.current;
    const volume = volumeRef.current;
    if (!candles || !volume) return;
    const palette = readChartPalette();

    candles.setData(
      series.candles.map((candle) => ({
        time: candle.time as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      })),
    );

    volume.setData(
      series.candles.map((candle) => ({
        time: candle.time as UTCTimestamp,
        value: candle.volume,
        color: candle.close >= candle.open ? `${palette.bull}55` : `${palette.bear}55`,
      })),
    );

    chartRef.current?.timeScale().fitContent();
  }, [series]);

  // --- indicator overlays ------------------------------------------------
  const overlayData = useMemo(
    () => buildOverlays(series.candles, indicators),
    [series, indicators],
  );

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const overlays = overlaysRef.current;

    // Remove overlays that are no longer requested.
    for (const [id, line] of overlays) {
      if (!overlayData.some((entry) => entry.id === id)) {
        chart.removeSeries(line);
        overlays.delete(id);
      }
    }

    // Add or update the rest.
    for (const entry of overlayData) {
      let line = overlays.get(entry.id);
      if (!line) {
        line = chart.addLineSeries({
          color: entry.color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
          title: entry.title,
        });
        overlays.set(entry.id, line);
      } else {
        line.applyOptions({ color: entry.color });
      }
      line.setData(entry.data);
    }
  }, [overlayData]);

  return (
    <div
      className="chart-frame"
      data-fullscreen={fullscreen || undefined}
      style={fullscreen ? fullscreenStyle : undefined}
    >
      <div className="chart-frame__toolbar">
        <span className="inline-note">
          {series.candles.length} candles &middot; last updated{" "}
          {new Date(series.generatedAt).toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
          })}{" "}
          IST
        </span>
        <span className="app-header__spacer" />
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => chartRef.current?.timeScale().fitContent()}
        >
          Reset zoom
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setFullscreen((v) => !v)}
        >
          {fullscreen ? "Exit full screen" : "Full screen"}
        </button>
      </div>
      <div
        ref={containerRef}
        style={{ width: "100%", height: fullscreen ? "calc(100% - 44px)" : height }}
      />
    </div>
  );
}

const fullscreenStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 90,
  background: "var(--bg)",
  padding: "var(--space-3)",
};

interface OverlayEntry {
  id: string;
  title: string;
  color: string;
  data: LineData[];
}

/** Builds overlay line data from the indicator modules - no maths in JSX. */
function buildOverlays(candles: Candle[], indicators: IndicatorId[]): OverlayEntry[] {
  if (candles.length === 0) return [];
  const palette = readChartPalette();
  const closes = candles.map((candle) => candle.close);
  const times = candles.map((candle) => candle.time as UTCTimestamp);
  const entries: OverlayEntry[] = [];

  const emaColors: Record<string, string> = {
    EMA9: palette.accent,
    EMA20: palette.violet,
    EMA50: palette.warn,
    EMA100: palette.muted,
    EMA200: palette.text,
  };

  for (const indicator of indicators) {
    const period = EMA_PERIODS[indicator];
    if (period) {
      entries.push({
        id: indicator,
        title: `EMA ${period}`,
        color: emaColors[indicator] ?? palette.accent,
        data: toLineData(times, ema(closes, period)),
      });
    }
  }

  if (indicators.includes("VWAP")) {
    entries.push({
      id: "VWAP",
      title: "VWAP",
      color: palette.bull,
      data: toLineData(times, vwap(candles, dailyResetKey)),
    });
  }

  if (indicators.includes("BOLLINGER")) {
    const bands = bollingerBands(closes);
    entries.push({
      id: "BB_UPPER",
      title: "BB upper",
      color: palette.border,
      data: toLineData(
        times,
        bands.map((band) => band.upper),
      ),
    });
    entries.push({
      id: "BB_MIDDLE",
      title: "BB basis",
      color: palette.muted,
      data: toLineData(
        times,
        bands.map((band) => band.middle),
      ),
    });
    entries.push({
      id: "BB_LOWER",
      title: "BB lower",
      color: palette.border,
      data: toLineData(
        times,
        bands.map((band) => band.lower),
      ),
    });
  }

  return entries;
}

function toLineData(times: UTCTimestamp[], values: Array<number | null>): LineData[] {
  const data: LineData[] = [];
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (value === null || !Number.isFinite(value)) continue;
    data.push({ time: times[i], value });
  }
  return data;
}
