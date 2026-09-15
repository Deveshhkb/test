import { describe, expect, it } from "vitest";
import { row } from "../__fixtures__/chain";
import { calculateMaxPain, totalWriterLossAt } from "./maxPain";

describe("calculateMaxPain", () => {
  it("finds the strike with the smallest aggregate writer payout", () => {
    // All open interest sits at 100, so settling there costs writers nothing.
    const chain = [
      row(90, { openInterest: 0 }, { openInterest: 0 }),
      row(100, { openInterest: 1000 }, { openInterest: 1000 }),
      row(110, { openInterest: 0 }, { openInterest: 0 }),
    ];
    expect(calculateMaxPain(chain, 104).maxPainStrike).toBe(100);
  });

  it("is pulled towards the side carrying more open interest", () => {
    const chain = [
      row(100, { openInterest: 100 }, { openInterest: 100 }),
      row(110, { openInterest: 100 }, { openInterest: 5000 }),
    ];
    // Heavy put OI at 110 makes settling below 110 expensive for writers.
    expect(calculateMaxPain(chain, 105).maxPainStrike).toBe(110);
  });

  it("reports the signed distance from spot", () => {
    const chain = [
      row(100, { openInterest: 1000 }, { openInterest: 1000 }),
      row(110, { openInterest: 0 }, { openInterest: 0 }),
    ];
    const result = calculateMaxPain(chain, 120);
    expect(result.maxPainStrike).toBe(100);
    expect(result.distance).toBe(20);
    expect(result.distancePercent).toBeCloseTo(20, 5);
  });

  it("computes writer loss as intrinsic value times open interest", () => {
    const chain = [row(100, { openInterest: 10 }, { openInterest: 20 })];
    // Settling at 110: calls owe 10 x 10 = 100, puts owe nothing.
    expect(totalWriterLossAt(chain, 110)).toBe(100);
    // Settling at 90: puts owe 10 x 20 = 200, calls owe nothing.
    expect(totalWriterLossAt(chain, 90)).toBe(200);
  });
});
