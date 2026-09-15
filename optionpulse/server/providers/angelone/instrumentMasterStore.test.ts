import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SCRIP_MASTER_FIXTURE } from "./__fixtures__/scripMaster";
import { InstrumentMasterStore, isRelevantRow, shouldRefresh } from "./instrumentMasterStore";
import { getIndexInstrument, listExpiries } from "./instrumentMaster";

const DAY_MS = 86_400_000;

describe("isRelevantRow", () => {
  it("keeps the three index rows and India VIX", () => {
    const kept = SCRIP_MASTER_FIXTURE.filter(
      (row) => row.instrumenttype === "AMXIDX" && isRelevantRow(row),
    ).map((row) => row.name);
    expect(new Set(kept)).toEqual(new Set(["NIFTY", "BANKNIFTY", "SENSEX", "INDIA VIX"]));
  });

  it("drops stock options, futures and unrelated indices", () => {
    const dropped = SCRIP_MASTER_FIXTURE.filter((row) => !isRelevantRow(row));
    expect(dropped.some((row) => row.instrumenttype === "OPTSTK")).toBe(true);
    expect(dropped.some((row) => row.instrumenttype === "FUTIDX")).toBe(true);
    expect(dropped.some((row) => row.name === "NIFTY GROWSECT 15")).toBe(true);
  });

  it("cuts the fixture down to only tracked instruments", () => {
    const kept = SCRIP_MASTER_FIXTURE.filter(isRelevantRow);
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThan(SCRIP_MASTER_FIXTURE.length);
  });
});

describe("shouldRefresh", () => {
  // 2026-09-15 08:00 IST and 2026-09-15 14:00 IST.
  const morning = Date.parse("2026-09-15T02:30:00Z");
  const afternoon = Date.parse("2026-09-15T08:30:00Z");

  it("keeps a cache built earlier the same IST day", () => {
    expect(shouldRefresh(morning, afternoon, DAY_MS)).toBe(false);
  });

  it("refreshes once the IST date rolls over", () => {
    const nextDay = Date.parse("2026-09-16T02:00:00Z");
    expect(shouldRefresh(morning, nextDay, DAY_MS)).toBe(true);
  });

  it("refreshes once the cache exceeds its maximum age", () => {
    expect(shouldRefresh(morning, morning + DAY_MS, DAY_MS)).toBe(true);
  });
});

describe("InstrumentMasterStore", () => {
  async function tempCache() {
    const dir = await mkdtemp(join(tmpdir(), "optionpulse-"));
    return join(dir, "instruments.json");
  }

  it("builds an index from downloaded rows and caches the filtered subset", async () => {
    const cacheFile = await tempCache();
    let downloads = 0;
    const store = new InstrumentMasterStore({
      cacheFile,
      fetchRows: async () => {
        downloads += 1;
        return SCRIP_MASTER_FIXTURE;
      },
    });

    const index = await store.get();
    expect(getIndexInstrument(index, "NIFTY")?.token).toBe("99926000");
    expect(listExpiries(index, "NIFTY").length).toBeGreaterThan(0);

    const cached = JSON.parse(await readFile(cacheFile, "utf8"));
    expect(cached.rows.length).toBeLessThan(SCRIP_MASTER_FIXTURE.length);
    expect(
      cached.rows.every((row: { instrumenttype: string }) =>
        ["AMXIDX", "OPTIDX"].includes(row.instrumenttype),
      ),
    ).toBe(true);

    await store.get();
    expect(downloads).toBe(1); // second call served from memory
  });

  it("serves a single download to concurrent callers", async () => {
    let downloads = 0;
    const store = new InstrumentMasterStore({
      cacheFile: await tempCache(),
      fetchRows: async () => {
        downloads += 1;
        return SCRIP_MASTER_FIXTURE;
      },
    });
    await Promise.all([store.get(), store.get(), store.get()]);
    expect(downloads).toBe(1);
  });

  it("falls back to the cached copy when a refresh fails", async () => {
    const cacheFile = await tempCache();
    const seed = new InstrumentMasterStore({
      cacheFile,
      fetchRows: async () => SCRIP_MASTER_FIXTURE,
    });
    await seed.get();

    const failing = new InstrumentMasterStore({
      cacheFile,
      maxAgeMs: -1, // force a refresh attempt
      fetchRows: async () => {
        throw new Error("network down");
      },
    });
    const index = await failing.get();
    expect(getIndexInstrument(index, "SENSEX")?.token).toBe("99919000");
  });

  it("surfaces the failure when there is no cache to fall back to", async () => {
    const store = new InstrumentMasterStore({
      cacheFile: await tempCache(),
      fetchRows: async () => {
        throw new Error("network down");
      },
    });
    await expect(store.get()).rejects.toThrow("network down");
  });

  it("rejects a master that contains nothing usable", async () => {
    const store = new InstrumentMasterStore({
      cacheFile: await tempCache(),
      fetchRows: async () => [],
    });
    await expect(store.get()).rejects.toThrow(/no rows/i);
  });
});
