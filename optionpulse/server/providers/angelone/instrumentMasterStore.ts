import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { toIstParts } from "../../../src/utils/time";
import {
  MASTER_KEYS,
  INDIA_VIX_NAME,
  SCRIP_MASTER_URL,
  buildInstrumentIndex,
  type InstrumentIndex,
  type ScripMasterRow,
} from "./instrumentMaster";

/**
 * Downloads, filters and caches Angel One's instrument master.
 *
 * The published file is ~33 MB and covers every instrument on every segment.
 * We keep only the index rows and the index-option rows for the three
 * underlyings this product analyses, which is a few thousand rows, and cache
 * that filtered subset so a restart does not re-download.
 */

const OPTION_NAMES = new Set(Object.values(MASTER_KEYS).map((key) => key.name));
const OPTION_SEGMENTS = new Set(Object.values(MASTER_KEYS).map((key) => key.optionSegment));

export function isRelevantRow(row: ScripMasterRow): boolean {
  if (row.instrumenttype === "AMXIDX") {
    return OPTION_NAMES.has(row.name) || row.name === INDIA_VIX_NAME;
  }
  return (
    row.instrumenttype === "OPTIDX" &&
    OPTION_NAMES.has(row.name) &&
    OPTION_SEGMENTS.has(row.exch_seg as "NFO" | "BFO")
  );
}

/**
 * The master is republished each morning before the session, so a cache built
 * on an earlier IST date is stale regardless of its age in hours.
 */
export function shouldRefresh(builtAt: number, now: number, maxAgeMs: number): boolean {
  if (now - builtAt >= maxAgeMs) return true;
  return toIstParts(builtAt).isoDate !== toIstParts(now).isoDate;
}

export interface InstrumentMasterOptions {
  url?: string;
  cacheFile?: string;
  maxAgeMs?: number;
  /** Injected in tests so the store can be exercised without a download. */
  fetchRows?: () => Promise<ScripMasterRow[]>;
}

interface CacheFile {
  builtAt: number;
  rows: ScripMasterRow[];
}

const DEFAULT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export class InstrumentMasterStore {
  private index: InstrumentIndex | null = null;
  private inFlight: Promise<InstrumentIndex> | null = null;

  private readonly url: string;
  private readonly cacheFile: string;
  private readonly maxAgeMs: number;
  private readonly fetchRows: () => Promise<ScripMasterRow[]>;

  constructor(options: InstrumentMasterOptions = {}) {
    this.url = options.url ?? SCRIP_MASTER_URL;
    this.cacheFile = options.cacheFile ?? ".cache/angelone-instruments.json";
    this.maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
    this.fetchRows = options.fetchRows ?? (() => this.download());
  }

  /** Returns a usable index, loading from cache or downloading as needed. */
  async get(): Promise<InstrumentIndex> {
    if (this.index && !shouldRefresh(this.index.builtAt, Date.now(), this.maxAgeMs)) {
      return this.index;
    }
    if (this.inFlight) return this.inFlight;

    this.inFlight = this.load().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async load(): Promise<InstrumentIndex> {
    const cached = await this.readCache();
    if (cached && !shouldRefresh(cached.builtAt, Date.now(), this.maxAgeMs)) {
      this.index = buildInstrumentIndex(cached.rows);
      this.index.builtAt = cached.builtAt;
      return this.index;
    }

    try {
      const rows = (await this.fetchRows()).filter(isRelevantRow);
      if (rows.length === 0) {
        throw new Error("Instrument master contained no rows for the tracked underlyings.");
      }
      this.index = buildInstrumentIndex(rows);
      await this.writeCache({ builtAt: this.index.builtAt, rows });
      return this.index;
    } catch (error) {
      // A stale master is far better than none: expiries and tokens change
      // slowly, so fall back rather than taking the whole provider down.
      if (cached) {
        console.warn(
          "[optionpulse] Could not refresh the Angel One instrument master; using the cached copy.",
          error,
        );
        this.index = buildInstrumentIndex(cached.rows);
        this.index.builtAt = cached.builtAt;
        return this.index;
      }
      throw error;
    }
  }

  private async download(): Promise<ScripMasterRow[]> {
    const response = await fetch(this.url, { signal: AbortSignal.timeout(180_000) });
    if (!response.ok) {
      throw new Error(`Instrument master download failed with HTTP ${response.status}.`);
    }
    return (await response.json()) as ScripMasterRow[];
  }

  private async readCache(): Promise<CacheFile | null> {
    try {
      const raw = await readFile(this.cacheFile, "utf8");
      const parsed = JSON.parse(raw) as CacheFile;
      return Array.isArray(parsed.rows) && parsed.rows.length > 0 ? parsed : null;
    } catch {
      return null;
    }
  }

  private async writeCache(cache: CacheFile): Promise<void> {
    try {
      await mkdir(dirname(this.cacheFile), { recursive: true });
      await writeFile(this.cacheFile, JSON.stringify(cache), "utf8");
    } catch (error) {
      console.warn("[optionpulse] Could not write the instrument-master cache.", error);
    }
  }
}
