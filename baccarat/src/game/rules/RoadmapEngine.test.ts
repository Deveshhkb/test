import { describe, expect, it } from "vitest";

import { DerivedMark, RoundOutcome, type RoadEntry } from "../types";
import { RoadmapEngine } from "./RoadmapEngine";

const P = RoundOutcome.Player;
const B = RoundOutcome.Banker;
const T = RoundOutcome.Tie;

function feed(outcomes: RoundOutcome[]): RoadmapEngine {
  const engine = new RoadmapEngine();
  engine.load(
    outcomes.map(
      (outcome, index): RoadEntry => ({
        outcome,
        playerPair: false,
        bankerPair: false,
        roundId: `r${index}`,
      }),
    ),
  );
  return engine;
}

describe("big road", () => {
  it("stacks a streak downward in one column", () => {
    const cells = feed([B, B, B]).snapshot().bigRoad;
    expect(cells.map((c) => [c.column, c.row])).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
    ]);
  });

  it("starts a new column when the outcome changes", () => {
    const cells = feed([B, B, P, B]).snapshot().bigRoad;
    expect(cells.map((c) => [c.column, c.row])).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
      [2, 0],
    ]);
  });

  it("turns a streak longer than six rows into a dragon tail", () => {
    // Nine bankers: six down the first column, then sideways along row 5.
    const cells = feed([B, B, B, B, B, B, B, B, B]).snapshot().bigRoad;
    expect(cells.map((c) => [c.column, c.row])).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [0, 5],
      [1, 5],
      [2, 5],
      [3, 5],
    ]);
  });

  it("records a tie on the cell it interrupted rather than as its own column", () => {
    const cells = feed([P, T, T, B]).snapshot().bigRoad;
    expect(cells).toHaveLength(2);
    expect(cells[0]?.tieCount).toBe(2);
    expect(cells[1]?.column).toBe(1);
  });

  it("holds ties that open the shoe until a decision arrives", () => {
    const cells = feed([T, T, P]).snapshot().bigRoad;
    expect(cells).toHaveLength(1);
    expect(cells[0]?.tieCount).toBe(2);
    expect(cells[0]?.outcome).toBe(P);
  });
});

describe("bead plate", () => {
  it("keeps every coup including ties, in order", () => {
    const snapshot = feed([P, T, B, B]).snapshot();
    expect(snapshot.beadPlate.map((e) => e.outcome)).toEqual([P, T, B, B]);
  });
});

describe("derived roads", () => {
  it("produces nothing until the big road has enough history", () => {
    const snapshot = feed([P, B]).snapshot();
    expect(snapshot.bigEyeBoy).toHaveLength(0);
    expect(snapshot.smallRoad).toHaveLength(0);
    expect(snapshot.cockroachPig).toHaveLength(0);
  });

  it("marks a perfectly regular chop entirely red on Big Eye Boy", () => {
    // Alternating results are maximally predictable, which is what red means.
    const snapshot = feed([P, B, P, B, P, B]).snapshot();
    expect(snapshot.bigEyeBoy).toHaveLength(4);
    expect(snapshot.bigEyeBoy.every((cell) => cell.mark === DerivedMark.Red)).toBe(true);
  });

  it("marks perfectly regular pairs of results entirely red", () => {
    const snapshot = feed([P, P, B, B, P, P, B, B]).snapshot();
    expect(snapshot.bigEyeBoy).toHaveLength(5);
    expect(snapshot.bigEyeBoy.every((cell) => cell.mark === DerivedMark.Red)).toBe(true);
  });

  it("marks a break in the pattern blue", () => {
    // Columns of length 1,1,2: the third column's opening breaks the rhythm.
    const snapshot = feed([P, B, P, P]).snapshot();
    expect(snapshot.bigEyeBoy.map((c) => c.mark)).toEqual([
      DerivedMark.Red, // column 3 opens against two equal-length columns
      DerivedMark.Blue, // the streak extends where the reference column did not
    ]);
  });

  it("starts each derived road later than the one before it", () => {
    const snapshot = feed([P, B, P, B, P, B, P, B]).snapshot();
    expect(snapshot.bigEyeBoy.length).toBeGreaterThan(snapshot.smallRoad.length);
    expect(snapshot.smallRoad.length).toBeGreaterThan(snapshot.cockroachPig.length);
  });

  it("lays derived marks out in streak columns like the big road", () => {
    const snapshot = feed([P, B, P, B, P, B]).snapshot();
    // Six identical marks: down the first column, no dragon tail needed yet.
    expect(snapshot.bigEyeBoy.map((c) => [c.column, c.row])).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ]);
  });
});

describe("stats", () => {
  it("counts outcomes and pairs", () => {
    const engine = new RoadmapEngine();
    engine.load([
      { outcome: P, playerPair: true, bankerPair: false, roundId: "a" },
      { outcome: B, playerPair: false, bankerPair: true, roundId: "b" },
      { outcome: T, playerPair: false, bankerPair: false, roundId: "c" },
      { outcome: B, playerPair: false, bankerPair: false, roundId: "d" },
    ]);
    expect(engine.snapshot().stats).toEqual({
      total: 4,
      player: 1,
      banker: 2,
      tie: 1,
      playerPair: 1,
      bankerPair: 1,
    });
  });
});

describe("caching and mutation", () => {
  it("invalidates the cached snapshot when a coup is pushed", () => {
    const engine = feed([P, B]);
    const before = engine.snapshot();
    engine.push({ outcome: P, playerPair: false, bankerPair: false, roundId: "x" });
    const after = engine.snapshot();
    expect(after).not.toBe(before);
    expect(after.beadPlate).toHaveLength(3);
  });

  it("clears every road on a new shoe", () => {
    const engine = feed([P, B, P]);
    engine.clear();
    const snapshot = engine.snapshot();
    expect(snapshot.beadPlate).toHaveLength(0);
    expect(snapshot.bigRoad).toHaveLength(0);
    expect(snapshot.stats.total).toBe(0);
  });
});
