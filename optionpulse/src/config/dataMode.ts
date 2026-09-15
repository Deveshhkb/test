import type { DataMode } from "../types/market";

/**
 * Where market data comes from in this build. `mock` keeps everything in the
 * browser; `api` talks to the Node backend, which owns any provider credentials.
 */
export type DataSourceKind = "mock" | "api";

const rawMode = (import.meta.env?.VITE_DATA_MODE ?? "mock").toString().toUpperCase();
const apiBaseUrl = (import.meta.env?.VITE_API_BASE_URL ?? "").toString().trim();

function normaliseMode(value: string): DataMode {
  if (value === "LIVE" || value === "DELAYED" || value === "MOCK") return value;
  return "MOCK";
}

export const DATA_MODE: DataMode = normaliseMode(rawMode);
export const API_BASE_URL = apiBaseUrl;
export const DATA_SOURCE: DataSourceKind = apiBaseUrl ? "api" : "mock";

export const DATA_MODE_COPY: Record<DataMode, { label: string; description: string }> = {
  MOCK: {
    label: "MOCK DATA",
    description:
      "Simulated data generated locally for development. Not market data - do not trade on it.",
  },
  DELAYED: {
    label: "DELAYED",
    description: "Data is delayed relative to the exchange feed.",
  },
  LIVE: {
    label: "LIVE",
    description: "Real-time data from a licensed market-data provider.",
  },
  CALCULATED: {
    label: "CALCULATED",
    description: "Derived by OptionPulse from the underlying option chain.",
  },
  ESTIMATED: {
    label: "ESTIMATED",
    description: "Modelled estimate. Assumptions are documented in the module.",
  },
};

export const DISCLAIMER =
  "Market data and analytics are provided for informational and educational purposes only and should not be considered financial advice.";
