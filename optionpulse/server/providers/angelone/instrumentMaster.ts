import type { UnderlyingSymbol } from "../../../src/types/market";
import type { OptionType } from "../../../src/types/options";

/**
 * Angel One publishes its full instrument list as one public JSON file,
 * refreshed each morning. Trading symbols are NOT constructible: weekly SENSEX
 * contracts use a compressed form (SENSEX26O1583100PE) while monthlies use
 * SENSEX26NOV74400CE. Everything is therefore looked up, never built.
 */

export const SCRIP_MASTER_URL =
  "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json";

/** A row exactly as it appears in the master file. */
export interface ScripMasterRow {
  token: string;
  symbol: string;
  name: string;
  expiry: string;
  strike: string;
  lotsize: string;
  instrumenttype: string;
  exch_seg: string;
  tick_size: string;
  freeze_qty?: string;
  is_cas_enabled?: boolean;
}

export interface OptionInstrument {
  token: string;
  tradingSymbol: string;
  name: string;
  /** ISO date, yyyy-mm-dd. */
  expiry: string;
  /** Master-file form, e.g. 29DEC2026 - what optionGreek expects. */
  expiryRaw: string;
  strike: number;
  lotSize: number;
  optionType: OptionType;
  exchange: "NFO" | "BFO";
}

export interface IndexInstrument {
  token: string;
  tradingSymbol: string;
  name: string;
  exchange: "NSE" | "BSE";
}

/** How each underlying appears in the master file. */
export const MASTER_KEYS: Record<
  UnderlyingSymbol,
  { name: string; optionSegment: "NFO" | "BFO"; indexSegment: "NSE" | "BSE" }
> = {
  NIFTY: { name: "NIFTY", optionSegment: "NFO", indexSegment: "NSE" },
  BANKNIFTY: { name: "BANKNIFTY", optionSegment: "NFO", indexSegment: "NSE" },
  SENSEX: { name: "SENSEX", optionSegment: "BFO", indexSegment: "BSE" },
};

export const INDIA_VIX_NAME = "INDIA VIX";

/** Index rows carry this instrument type in the master file. */
const INDEX_INSTRUMENT_TYPE = "AMXIDX";
const OPTION_INSTRUMENT_TYPE = "OPTIDX";

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

/** `29DEC2026` -> `2026-12-29`. Returns null for anything else. */
export function parseMasterExpiry(raw: string): string | null {
  const match = /^(\d{2})([A-Z]{3})(\d{4})$/.exec(raw.trim().toUpperCase());
  if (!match) return null;
  const monthIndex = MONTHS.indexOf(match[2]);
  if (monthIndex === -1) return null;
  return `${match[3]}-${String(monthIndex + 1).padStart(2, "0")}-${match[1]}`;
}

/**
 * Strikes are published in paise: `2300000.000000` is strike 23000.
 * Getting this wrong silently produces a chain 100x off, so it is isolated
 * and tested rather than inlined.
 */
export function parseMasterStrike(raw: string): number {
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return Number.NaN;
  return value / 100;
}

/** Option type is the last two characters of the trading symbol. */
export function parseOptionType(tradingSymbol: string): OptionType | null {
  const suffix = tradingSymbol.trim().toUpperCase().slice(-2);
  return suffix === "CE" || suffix === "PE" ? suffix : null;
}

export function toOptionInstrument(row: ScripMasterRow): OptionInstrument | null {
  if (row.instrumenttype !== OPTION_INSTRUMENT_TYPE) return null;
  if (row.exch_seg !== "NFO" && row.exch_seg !== "BFO") return null;

  const expiry = parseMasterExpiry(row.expiry);
  const optionType = parseOptionType(row.symbol);
  const strike = parseMasterStrike(row.strike);
  const lotSize = Number.parseInt(row.lotsize, 10);
  if (!expiry || !optionType || !Number.isFinite(strike) || !Number.isFinite(lotSize)) {
    return null;
  }

  return {
    token: row.token,
    tradingSymbol: row.symbol,
    name: row.name,
    expiry,
    expiryRaw: row.expiry.toUpperCase(),
    strike,
    lotSize,
    optionType,
    exchange: row.exch_seg,
  };
}

export function toIndexInstrument(row: ScripMasterRow): IndexInstrument | null {
  if (row.instrumenttype !== INDEX_INSTRUMENT_TYPE) return null;
  if (row.exch_seg !== "NSE" && row.exch_seg !== "BSE") return null;
  return {
    token: row.token,
    tradingSymbol: row.symbol,
    name: row.name,
    exchange: row.exch_seg,
  };
}

/** Grouped lookup built once per master refresh. */
export interface InstrumentIndex {
  /** Underlying -> expiry ISO -> option instruments for that expiry. */
  options: Map<UnderlyingSymbol, Map<string, OptionInstrument[]>>;
  /** Index name (as in the master) -> index instrument. */
  indices: Map<string, IndexInstrument>;
  builtAt: number;
  /** Number of master rows the index was built from. */
  sourceRowCount: number;
}

export function buildInstrumentIndex(rows: ScripMasterRow[]): InstrumentIndex {
  const options = new Map<UnderlyingSymbol, Map<string, OptionInstrument[]>>();
  const indices = new Map<string, IndexInstrument>();

  const byMasterName = new Map<string, UnderlyingSymbol>();
  (Object.keys(MASTER_KEYS) as UnderlyingSymbol[]).forEach((symbol) => {
    byMasterName.set(MASTER_KEYS[symbol].name, symbol);
    options.set(symbol, new Map());
  });

  for (const row of rows) {
    const index = toIndexInstrument(row);
    if (index) {
      // Keep only the instruments we actually chart.
      if (byMasterName.has(index.name) || index.name === INDIA_VIX_NAME) {
        indices.set(index.name, index);
      }
      continue;
    }

    const symbol = byMasterName.get(row.name);
    if (!symbol) continue;
    if (row.exch_seg !== MASTER_KEYS[symbol].optionSegment) continue;

    const option = toOptionInstrument(row);
    if (!option) continue;

    const byExpiry = options.get(symbol)!;
    const bucket = byExpiry.get(option.expiry);
    if (bucket) bucket.push(option);
    else byExpiry.set(option.expiry, [option]);
  }

  // Sort each expiry's ladder so downstream code can rely on strike order.
  for (const byExpiry of options.values()) {
    for (const bucket of byExpiry.values()) {
      bucket.sort((a, b) =>
        a.strike === b.strike ? a.optionType.localeCompare(b.optionType) : a.strike - b.strike,
      );
    }
  }

  return { options, indices, builtAt: Date.now(), sourceRowCount: rows.length };
}

/** Expiry dates available for an underlying, nearest first. */
export function listExpiries(index: InstrumentIndex, symbol: UnderlyingSymbol): string[] {
  return [...(index.options.get(symbol)?.keys() ?? [])].sort();
}

export function getExpiryLadder(
  index: InstrumentIndex,
  symbol: UnderlyingSymbol,
  expiry: string,
): OptionInstrument[] {
  return index.options.get(symbol)?.get(expiry) ?? [];
}

export function getIndexInstrument(
  index: InstrumentIndex,
  symbol: UnderlyingSymbol,
): IndexInstrument | null {
  return index.indices.get(MASTER_KEYS[symbol].name) ?? null;
}

export function getVixInstrument(index: InstrumentIndex): IndexInstrument | null {
  return index.indices.get(INDIA_VIX_NAME) ?? null;
}

/**
 * Derives the strike interval actually in use near a reference price.
 *
 * BANK NIFTY lists 100-point strikes around the money and much wider ones in
 * the tails, so a single configured interval cannot describe the whole ladder.
 * The modal gap among nearby strikes is what traders see as "the" interval.
 */
export function inferStrikeInterval(strikes: number[], reference: number): number | null {
  const nearby = [...new Set(strikes)]
    .sort((a, b) => Math.abs(a - reference) - Math.abs(b - reference))
    .slice(0, 21)
    .sort((a, b) => a - b);
  if (nearby.length < 2) return null;

  const gaps = new Map<number, number>();
  for (let i = 1; i < nearby.length; i += 1) {
    const gap = Math.round(nearby[i] - nearby[i - 1]);
    if (gap > 0) gaps.set(gap, (gaps.get(gap) ?? 0) + 1);
  }
  let best: number | null = null;
  let bestCount = 0;
  for (const [gap, count] of gaps) {
    if (count > bestCount || (count === bestCount && best !== null && gap < best)) {
      best = gap;
      bestCount = count;
    }
  }
  return best;
}
