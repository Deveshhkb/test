import type { DeepPartial, ChartOptions } from "lightweight-charts";
import { CrosshairMode } from "lightweight-charts";
import { toIstParts } from "../../utils/time";

/** Reads a CSS custom property so charts follow the same tokens as the UI. */
export function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export interface ChartPalette {
  background: string;
  text: string;
  grid: string;
  border: string;
  bull: string;
  bear: string;
  accent: string;
  violet: string;
  warn: string;
  muted: string;
}

export function readChartPalette(): ChartPalette {
  return {
    background: cssVar("--surface", "#141a25"),
    text: cssVar("--text-muted", "#909cb2"),
    grid: cssVar("--border", "#242e3f"),
    border: cssVar("--border-strong", "#33415a"),
    bull: cssVar("--bull", "#27c893"),
    bear: cssVar("--bear", "#ff5f6d"),
    accent: cssVar("--accent", "#3fd0c9"),
    violet: cssVar("--violet", "#8b7cf6"),
    warn: cssVar("--warn", "#f5a524"),
    muted: cssVar("--text-subtle", "#6b7689"),
  };
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Chart timestamps are true epoch seconds; axes are rendered in IST.
 *
 * `tickMarkType` tells us what the library wants at this tick (year, month,
 * day or time), so an intraday chart still labels day boundaries with a date
 * instead of repeating the session open time.
 */
function formatIstAxis(unixSeconds: number, tickMarkType: number): string {
  const parts = toIstParts(unixSeconds * 1000);
  const pad = (value: number) => (value < 10 ? `0${value}` : `${value}`);
  switch (tickMarkType) {
    case 0: // Year
      return `${parts.year}`;
    case 1: // Month
      return `${MONTHS_SHORT[parts.month - 1]} ${parts.year}`;
    case 2: // DayOfMonth
      return `${pad(parts.day)} ${MONTHS_SHORT[parts.month - 1]}`;
    default: // Time / TimeWithSeconds
      return `${pad(parts.hours)}:${pad(parts.minutes)}`;
  }
}

export function baseChartOptions(
  palette: ChartPalette,
  intraday: boolean,
): DeepPartial<ChartOptions> {
  return {
    layout: {
      background: { color: "transparent" },
      textColor: palette.text,
      fontFamily: cssVar("--font-sans", "sans-serif"),
      fontSize: 11,
    },
    grid: {
      vertLines: { color: palette.grid },
      horzLines: { color: palette.grid },
    },
    rightPriceScale: { borderColor: palette.grid },
    timeScale: {
      borderColor: palette.grid,
      timeVisible: intraday,
      secondsVisible: false,
      tickMarkFormatter: (time: number, tickMarkType: number) =>
        formatIstAxis(time, tickMarkType),
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { color: palette.border, labelBackgroundColor: palette.accent },
      horzLine: { color: palette.border, labelBackgroundColor: palette.accent },
    },
    localization: {
      timeFormatter: (time: number) => {
        const parts = toIstParts(time * 1000);
        const pad = (value: number) => (value < 10 ? `0${value}` : `${value}`);
        return `${pad(parts.day)}/${pad(parts.month)}/${parts.year} ${pad(parts.hours)}:${pad(parts.minutes)} IST`;
      },
    },
    handleScale: { axisPressedMouseMove: { time: true, price: true } },
    autoSize: false,
  };
}

export const INTRADAY_TIMEFRAMES = new Set(["1m", "3m", "5m", "15m", "30m", "1H"]);
