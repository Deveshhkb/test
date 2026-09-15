import type { DataMode, UnderlyingSymbol } from "./market";

export type OptionType = "CE" | "PE";

export type Moneyness = "ITM" | "ATM" | "OTM";

export type BuildupType =
  "LONG_BUILDUP" | "SHORT_BUILDUP" | "SHORT_COVERING" | "LONG_UNWINDING" | "NEUTRAL";

/** One side (call or put) of a strike row. */
export interface OptionLeg {
  optionType: OptionType;
  strike: number;
  ltp: number;
  change: number;
  changePercent: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  changeInOpenInterest: number;
  /** Implied volatility in percent, as published by the provider. */
  impliedVolatility: number;
  /** Greeks supplied by the data provider, when it publishes them. */
  greeks?: OptionGreeks;
}

export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  /** Present when IV was solved for rather than supplied. */
  impliedVolatility?: number;
  /** MARKET when the provider published them, CALCULATED when we derived them. */
  source: "MARKET" | "CALCULATED";
}

export interface OptionChainRow {
  strike: number;
  call: OptionLeg;
  put: OptionLeg;
}

export interface OptionChain {
  symbol: UnderlyingSymbol;
  /** ISO date (yyyy-mm-dd) of the expiry this chain belongs to. */
  expiry: string;
  spot: number;
  /** Strike interval used to build the ladder, from underlying config. */
  strikeInterval: number;
  rows: OptionChainRow[];
  timestamp: number;
  mode: DataMode;
}

export interface ExpiryInfo {
  /** ISO date, yyyy-mm-dd. */
  date: string;
  label: string;
  daysToExpiry: number;
  isWeekly: boolean;
}

export interface PcrResult {
  totalPutOi: number;
  totalCallOi: number;
  pcr: number;
  volumePcr: number;
  interpretation: string;
  mode: DataMode;
}

export interface MaxPainStrikeLoss {
  strike: number;
  /** Total intrinsic value writers would pay if expiry settled here. */
  totalLoss: number;
}

export interface MaxPainResult {
  maxPainStrike: number;
  spot: number;
  distance: number;
  distancePercent: number;
  losses: MaxPainStrikeLoss[];
  mode: DataMode;
}

export interface OiExtreme {
  strike: number;
  value: number;
}

export interface OiAnalysis {
  highestCallOi: OiExtreme | null;
  highestPutOi: OiExtreme | null;
  highestCallOiAddition: OiExtreme | null;
  highestPutOiAddition: OiExtreme | null;
  highestVolumeStrike: OiExtreme | null;
  highestIvStrike: OiExtreme | null;
  mode: DataMode;
}

export interface SrLevel {
  strike: number;
  /** 0-100 relative strength score produced by the S/R model. */
  strength: number;
  /** Individual contributions, so the score can be explained in the UI. */
  components: Record<string, number>;
}

export interface SupportResistanceResult {
  supports: SrLevel[];
  resistances: SrLevel[];
  mode: DataMode;
}

export interface OptionChainAnalytics {
  symbol: UnderlyingSymbol;
  expiry: string;
  spot: number;
  atmStrike: number;
  pcr: PcrResult;
  maxPain: MaxPainResult;
  oi: OiAnalysis;
  supportResistance: SupportResistanceResult;
  timestamp: number;
}

/** A contract the user is tracking (index or a single option leg). */
export interface WatchlistItem {
  id: string;
  kind: "INDEX" | "OPTION";
  symbol: UnderlyingSymbol;
  expiry?: string;
  strike?: number;
  optionType?: OptionType;
  addedAt: number;
}
