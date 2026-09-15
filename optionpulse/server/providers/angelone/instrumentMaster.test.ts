import { describe, expect, it } from "vitest";
import { SCRIP_MASTER_FIXTURE } from "./__fixtures__/scripMaster";
import {
  buildInstrumentIndex,
  getExpiryLadder,
  getIndexInstrument,
  getVixInstrument,
  inferStrikeInterval,
  listExpiries,
  parseMasterExpiry,
  parseMasterStrike,
  parseOptionType,
  toOptionInstrument,
} from "./instrumentMaster";

describe("parseMasterExpiry", () => {
  it("converts the master's DDMMMYYYY form to an ISO date", () => {
    expect(parseMasterExpiry("29DEC2026")).toBe("2026-12-29");
    expect(parseMasterExpiry("15SEP2026")).toBe("2026-09-15");
    expect(parseMasterExpiry("01OCT2026")).toBe("2026-10-01");
  });

  it("returns null for index rows, which carry an empty expiry", () => {
    expect(parseMasterExpiry("")).toBeNull();
  });

  it("returns null for an unrecognised month or shape", () => {
    expect(parseMasterExpiry("29XXX2026")).toBeNull();
    expect(parseMasterExpiry("2026-12-29")).toBeNull();
  });
});

describe("parseMasterStrike", () => {
  it("converts paise to rupees", () => {
    // Getting this wrong yields a chain a hundred times off.
    expect(parseMasterStrike("2300000.000000")).toBe(23000);
    expect(parseMasterStrike("5000000.000000")).toBe(50000);
    expect(parseMasterStrike("8310000.000000")).toBe(83100);
  });

  it("returns NaN rather than 0 for unparseable input", () => {
    expect(parseMasterStrike("abc")).toBeNaN();
  });
});

describe("parseOptionType", () => {
  it("reads the suffix of both weekly and monthly symbol forms", () => {
    expect(parseOptionType("NIFTY22SEP2625800CE")).toBe("CE");
    expect(parseOptionType("SENSEX26O1583100PE")).toBe("PE");
    expect(parseOptionType("SENSEX26NOV74400CE")).toBe("CE");
  });

  it("returns null for a futures symbol", () => {
    expect(parseOptionType("NIFTY29SEP26FUT")).toBeNull();
  });
});

describe("toOptionInstrument", () => {
  const optionRow = SCRIP_MASTER_FIXTURE.find((row) => row.symbol === "NIFTY22SEP2625800CE")!;

  it("maps a real option row completely", () => {
    const instrument = toOptionInstrument(optionRow)!;
    expect(instrument).toMatchObject({
      name: "NIFTY",
      expiry: "2026-09-22",
      expiryRaw: "22SEP2026",
      strike: 25800,
      optionType: "CE",
      exchange: "NFO",
      lotSize: 65,
    });
    expect(instrument.token).toBe(optionRow.token);
  });

  it("ignores rows that are not index options", () => {
    const stockOption = SCRIP_MASTER_FIXTURE.find((row) => row.instrumenttype === "OPTSTK");
    const future = SCRIP_MASTER_FIXTURE.find((row) => row.instrumenttype === "FUTIDX");
    const index = SCRIP_MASTER_FIXTURE.find((row) => row.instrumenttype === "AMXIDX");
    expect(toOptionInstrument(stockOption!)).toBeNull();
    expect(toOptionInstrument(future!)).toBeNull();
    expect(toOptionInstrument(index!)).toBeNull();
  });
});

describe("buildInstrumentIndex", () => {
  const index = buildInstrumentIndex(SCRIP_MASTER_FIXTURE);

  it("resolves the three index instruments and India VIX", () => {
    expect(getIndexInstrument(index, "NIFTY")).toMatchObject({
      token: "99926000",
      exchange: "NSE",
    });
    expect(getIndexInstrument(index, "BANKNIFTY")).toMatchObject({ token: "99926009" });
    expect(getIndexInstrument(index, "SENSEX")).toMatchObject({
      token: "99919000",
      exchange: "BSE",
    });
    expect(getVixInstrument(index)).toMatchObject({ token: "99926017" });
  });

  it("keeps SENSEX options from BFO, not NFO", () => {
    const expiries = listExpiries(index, "SENSEX");
    expect(expiries.length).toBeGreaterThan(0);
    getExpiryLadder(index, "SENSEX", expiries[0]).forEach((option) => {
      expect(option.exchange).toBe("BFO");
    });
  });

  it("handles both the compressed weekly and the monthly SENSEX symbol forms", () => {
    const weekly = getExpiryLadder(index, "SENSEX", "2026-10-15");
    const monthly = getExpiryLadder(index, "SENSEX", "2026-11-26");
    expect(weekly.length).toBeGreaterThan(0);
    expect(monthly.length).toBeGreaterThan(0);
    expect(weekly[0].tradingSymbol).toMatch(/^SENSEX26O15/);
    expect(monthly[0].tradingSymbol).toMatch(/^SENSEX26NOV/);
  });

  it("excludes stock options and other indices", () => {
    const names = new Set<string>();
    for (const byExpiry of index.options.values()) {
      for (const ladder of byExpiry.values()) {
        ladder.forEach((option) => names.add(option.name));
      }
    }
    expect(names).toEqual(new Set(["NIFTY", "BANKNIFTY", "SENSEX"]));
    expect(index.indices.has("NIFTY GROWSECT 15")).toBe(false);
  });

  it("sorts each expiry's ladder by strike", () => {
    const ladder = getExpiryLadder(index, "NIFTY", "2026-09-22");
    const strikes = ladder.map((option) => option.strike);
    expect([...strikes].sort((a, b) => a - b)).toEqual(strikes);
  });

  it("lists expiries nearest first", () => {
    const expiries = listExpiries(index, "SENSEX");
    expect([...expiries].sort()).toEqual(expiries);
  });
});

describe("inferStrikeInterval", () => {
  it("finds the interval actually listed around the money", () => {
    expect(inferStrikeInterval([25800, 25850, 25900, 25950, 26000], 25900)).toBe(50);
    expect(inferStrikeInterval([57000, 57100, 57200, 57300], 57150)).toBe(100);
  });

  it("ignores wide tail gaps in favour of the modal near-the-money gap", () => {
    // BANK NIFTY lists 100-point strikes near spot and far wider ones out in
    // the tails; the tail gaps must not become "the" interval.
    const strikes = [43500, 45000, 50000, 57000, 57100, 57200, 57300, 57400, 65000, 69000];
    expect(inferStrikeInterval(strikes, 57200)).toBe(100);
  });

  it("returns null when there is nothing to compare", () => {
    expect(inferStrikeInterval([25000], 25000)).toBeNull();
    expect(inferStrikeInterval([], 25000)).toBeNull();
  });
});
