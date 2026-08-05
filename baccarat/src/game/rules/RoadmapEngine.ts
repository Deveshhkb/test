import { ROAD_BIG_ROWS, ROAD_DERIVED_ROWS } from "../Constants";
import {
  DerivedMark,
  RoundOutcome,
  type BigRoadCell,
  type DerivedCell,
  type RoadEntry,
  type RoadStats,
  type RoadmapSnapshot,
} from "../types";

/**
 * Derives every scoreboard a baccarat table shows from a flat list of results.
 *
 * Two coordinate systems are in play and conflating them is the classic bug:
 *
 *  - *logical* columns are pure streaks ("four bankers in a row"). The three
 *    derived roads are computed from these.
 *  - *physical* cells are what the player sees, where a streak longer than six
 *    turns the corner and runs sideways as a "dragon tail".
 *
 * The engine builds the logical model first and projects it to physical cells,
 * so a dragon tail can never corrupt Big Eye Boy.
 */

/** What each derived road would gain if the next coup went a given way. */
export interface RoadPrediction {
  readonly bigEyeBoy: DerivedMark | null;
  readonly smallRoad: DerivedMark | null;
  readonly cockroachPig: DerivedMark | null;
}

interface LogicalEntry {
  outcome: RoundOutcome.Player | RoundOutcome.Banker;
  tieCount: number;
  playerPair: boolean;
  bankerPair: boolean;
}

type LogicalColumn = LogicalEntry[];

export class RoadmapEngine {
  private entries: RoadEntry[] = [];
  private cachedSnapshot: RoadmapSnapshot | null = null;

  /** Replaces history wholesale — used by `SYNC_HISTORY` after a reconnect. */
  load(entries: readonly RoadEntry[]): void {
    this.entries = entries.slice();
    this.cachedSnapshot = null;
  }

  push(entry: RoadEntry): void {
    this.entries.push(entry);
    this.cachedSnapshot = null;
  }

  clear(): void {
    this.entries.length = 0;
    this.cachedSnapshot = null;
  }

  get history(): readonly RoadEntry[] {
    return this.entries;
  }

  /** Recomputed only when history changed; roadmap rendering polls this often. */
  snapshot(): RoadmapSnapshot {
    if (this.cachedSnapshot) return this.cachedSnapshot;

    const logical = buildLogicalColumns(this.entries);
    const snapshot: RoadmapSnapshot = {
      beadPlate: this.entries.slice(),
      bigRoad: projectBigRoad(logical),
      bigEyeBoy: layoutDerived(deriveMarks(logical, 1)),
      smallRoad: layoutDerived(deriveMarks(logical, 2)),
      cockroachPig: layoutDerived(deriveMarks(logical, 3)),
      stats: computeStats(this.entries),
    };
    this.cachedSnapshot = snapshot;
    return snapshot;
  }

  /**
   * "What if the next coup is X" — the prediction dots real tables show when a
   * player hovers the Player/Banker spot. Returns the mark each derived road
   * would gain.
   */
  predict(next: RoundOutcome.Player | RoundOutcome.Banker): RoadPrediction {
    const hypothetical: RoadEntry[] = [
      ...this.entries,
      { outcome: next, playerPair: false, bankerPair: false, roundId: "__predict__" },
    ];
    const logical = buildLogicalColumns(hypothetical);
    const lastOf = (marks: DerivedMark[]): DerivedMark | null => marks.at(-1) ?? null;
    const base = {
      bigEyeBoy: deriveMarks(buildLogicalColumns(this.entries), 1).length,
      smallRoad: deriveMarks(buildLogicalColumns(this.entries), 2).length,
      cockroachPig: deriveMarks(buildLogicalColumns(this.entries), 3).length,
    };
    const bigEye = deriveMarks(logical, 1);
    const small = deriveMarks(logical, 2);
    const cockroach = deriveMarks(logical, 3);
    return {
      bigEyeBoy: bigEye.length > base.bigEyeBoy ? lastOf(bigEye) : null,
      smallRoad: small.length > base.smallRoad ? lastOf(small) : null,
      cockroachPig: cockroach.length > base.cockroachPig ? lastOf(cockroach) : null,
    };
  }
}

/* ------------------------------------------------------------------ *
 * Logical model
 * ------------------------------------------------------------------ */

function buildLogicalColumns(entries: readonly RoadEntry[]): LogicalColumn[] {
  const columns: LogicalColumn[] = [];
  let pendingTies = 0;

  for (const entry of entries) {
    if (entry.outcome === RoundOutcome.Tie) {
      const lastColumn = columns.at(-1);
      const lastEntry = lastColumn?.at(-1);
      // A tie decorates the previous result; a tie opening the shoe waits for one.
      if (lastEntry) {
        lastEntry.tieCount += 1;
        lastEntry.playerPair = lastEntry.playerPair || entry.playerPair;
        lastEntry.bankerPair = lastEntry.bankerPair || entry.bankerPair;
      } else {
        pendingTies += 1;
      }
      continue;
    }

    const outcome = entry.outcome;
    const cell: LogicalEntry = {
      outcome,
      tieCount: pendingTies,
      playerPair: entry.playerPair,
      bankerPair: entry.bankerPair,
    };
    pendingTies = 0;

    const lastColumn = columns.at(-1);
    if (lastColumn && lastColumn[0]!.outcome === outcome) {
      lastColumn.push(cell);
    } else {
      columns.push([cell]);
    }
  }

  return columns;
}

/* ------------------------------------------------------------------ *
 * Big Road projection (with dragon tail)
 * ------------------------------------------------------------------ */

function projectBigRoad(columns: readonly LogicalColumn[]): BigRoadCell[] {
  const cells: BigRoadCell[] = [];
  const occupied = new Set<string>();
  const key = (c: number, r: number): string => `${c}:${r}`;
  let nextFreeColumn = 0;

  for (const column of columns) {
    let col = nextFreeColumn;
    let row = 0;

    for (let i = 0; i < column.length; i++) {
      const entry = column[i]!;

      if (i > 0) {
        const canGoDown = row + 1 < ROAD_BIG_ROWS && !occupied.has(key(col, row + 1));
        if (canGoDown) {
          row += 1;
        } else {
          // Dragon tail: the streak turns and runs to the right on this row.
          let candidate = col + 1;
          while (occupied.has(key(candidate, row))) candidate += 1;
          col = candidate;
        }
      }

      occupied.add(key(col, row));
      cells.push({
        outcome: entry.outcome,
        tieCount: entry.tieCount,
        playerPair: entry.playerPair,
        bankerPair: entry.bankerPair,
        column: col,
        row,
      });
      nextFreeColumn = Math.max(nextFreeColumn, col + 1);
    }
  }

  return cells;
}

/* ------------------------------------------------------------------ *
 * Derived roads
 * ------------------------------------------------------------------ */

/**
 * Big Eye Boy (k=1), Small Road (k=2) and Cockroach Pig (k=3) are the same
 * algorithm at three different look-back distances; they measure how
 * *repetitive* the shoe is, not who won.
 *
 *  - a coup that extends a streak is red when the reference column has a
 *    matching neighbour at that depth (the shoe is behaving predictably)
 *  - a coup that opens a new column is red when the two reference columns are
 *    the same length (the chop is regular)
 */
function deriveMarks(columns: readonly LogicalColumn[], k: number): DerivedMark[] {
  const marks: DerivedMark[] = [];
  const lengthOf = (index: number): number => (index >= 0 ? (columns[index]?.length ?? 0) : -1);
  const exists = (c: number, r: number): boolean => c >= 0 && (columns[c]?.length ?? 0) > r;

  for (let col = 0; col < columns.length; col++) {
    const column = columns[col]!;
    for (let row = 0; row < column.length; row++) {
      if (row === 0) {
        // New column: is the chop regular?
        const refA = col - k;
        const refB = col - k - 1;
        if (refB < 0) continue; // not enough history yet
        marks.push(lengthOf(refA) === lengthOf(refB) ? DerivedMark.Red : DerivedMark.Blue);
      } else {
        // Streak continues: does the reference column keep pace?
        const ref = col - k;
        if (ref < 0) continue;
        const here = exists(ref, row);
        const above = exists(ref, row - 1);
        marks.push(here === above ? DerivedMark.Red : DerivedMark.Blue);
      }
    }
  }

  return marks;
}

/** Lays a flat mark stream out on the same column/dragon-tail grid. */
function layoutDerived(marks: readonly DerivedMark[]): DerivedCell[] {
  const cells: DerivedCell[] = [];
  const occupied = new Set<string>();
  const key = (c: number, r: number): string => `${c}:${r}`;
  let col = 0;
  let row = 0;
  let nextFreeColumn = 0;
  let previous: DerivedMark | null = null;

  for (const mark of marks) {
    if (previous === null) {
      col = 0;
      row = 0;
    } else if (mark === previous) {
      const canGoDown = row + 1 < ROAD_DERIVED_ROWS && !occupied.has(key(col, row + 1));
      if (canGoDown) {
        row += 1;
      } else {
        let candidate = col + 1;
        while (occupied.has(key(candidate, row))) candidate += 1;
        col = candidate;
      }
    } else {
      col = nextFreeColumn;
      row = 0;
    }

    occupied.add(key(col, row));
    cells.push({ mark, column: col, row });
    nextFreeColumn = Math.max(nextFreeColumn, col + 1);
    previous = mark;
  }

  return cells;
}

/* ------------------------------------------------------------------ *
 * Stats
 * ------------------------------------------------------------------ */

function computeStats(entries: readonly RoadEntry[]): RoadStats {
  let player = 0;
  let banker = 0;
  let tie = 0;
  let playerPair = 0;
  let bankerPair = 0;

  for (const entry of entries) {
    if (entry.outcome === RoundOutcome.Player) player++;
    else if (entry.outcome === RoundOutcome.Banker) banker++;
    else tie++;
    if (entry.playerPair) playerPair++;
    if (entry.bankerPair) bankerPair++;
  }

  return { total: entries.length, player, banker, tie, playerPair, bankerPair };
}
