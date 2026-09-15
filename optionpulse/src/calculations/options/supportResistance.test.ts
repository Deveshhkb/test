import { describe, expect, it } from "vitest";
import { row } from "../__fixtures__/chain";
import { calculateSupportResistance } from "./supportResistance";

const CHAIN = [
  row(
    23_000,
    { openInterest: 10_000 },
    { openInterest: 900_000, changeInOpenInterest: 300_000, volume: 500_000 },
  ),
  row(
    23_100,
    { openInterest: 200_000 },
    { openInterest: 300_000, changeInOpenInterest: 50_000, volume: 200_000 },
  ),
  row(
    23_200,
    { openInterest: 400_000 },
    { openInterest: 100_000, changeInOpenInterest: 10_000, volume: 100_000 },
  ),
  row(
    23_300,
    { openInterest: 950_000, changeInOpenInterest: 400_000, volume: 600_000 },
    { openInterest: 20_000 },
  ),
];

describe("calculateSupportResistance", () => {
  const spot = 23_150;

  it("puts the heaviest put-writing strike below spot at the top of supports", () => {
    const result = calculateSupportResistance(CHAIN, spot);
    expect(result.supports[0].strike).toBe(23_000);
  });

  it("puts the heaviest call-writing strike above spot at the top of resistances", () => {
    const result = calculateSupportResistance(CHAIN, spot);
    expect(result.resistances[0].strike).toBe(23_300);
  });

  it("never places a support above spot or a resistance below it", () => {
    const result = calculateSupportResistance(CHAIN, spot);
    result.supports.forEach((level) => expect(level.strike).toBeLessThanOrEqual(spot));
    result.resistances.forEach((level) => expect(level.strike).toBeGreaterThanOrEqual(spot));
  });

  it("scores strength on a 0-100 scale", () => {
    const result = calculateSupportResistance(CHAIN, spot);
    [...result.supports, ...result.resistances].forEach((level) => {
      expect(level.strength).toBeGreaterThanOrEqual(0);
      expect(level.strength).toBeLessThanOrEqual(100);
    });
  });

  it("excludes strikes beyond the configured distance from spot", () => {
    const result = calculateSupportResistance(CHAIN, spot, { maxDistancePercent: 0.3 });
    const strikes = [...result.supports, ...result.resistances].map((level) => level.strike);
    expect(strikes).not.toContain(23_000);
    expect(strikes).not.toContain(23_300);
  });

  it("returns a component breakdown so the score can be explained", () => {
    const [top] = calculateSupportResistance(CHAIN, spot).supports;
    expect(Object.keys(top.components).sort()).toEqual([
      "oiChange",
      "openInterest",
      "proximity",
      "volume",
    ]);
  });
});
