import type { GameEventMap } from "../events";
import { type RoundOutcome, type BetSettlement, type RoundResult } from "../types";
import type { EventBus } from "../utils/EventBus";

export interface SessionStats {
  readonly roundsPlayed: number;
  readonly roundsWagered: number;
  readonly totalStaked: number;
  readonly totalReturned: number;
  readonly totalCommission: number;
  readonly netProfit: number;
  readonly biggestWin: number;
  readonly currentStreak: number;
  readonly streakOutcome: RoundOutcome | null;
}

interface HistoryEntry {
  readonly result: RoundResult;
  readonly settlements: readonly BetSettlement[];
  readonly staked: number;
  readonly returned: number;
  readonly at: number;
}

/**
 * Session memory: what was dealt, what it paid, and how the player is doing.
 *
 * Deliberately separate from `RoadmapManager` — the roadmaps describe the
 * *shoe* and are shared by everyone at the table, while this describes *this
 * player's* session and would come from an account service in production.
 */
export class HistoryManager {
  private readonly bus: EventBus<GameEventMap>;
  private readonly entries: HistoryEntry[] = [];
  private readonly limit: number;

  private staked = 0;
  private returned = 0;
  private commission = 0;
  private biggestWin = 0;
  private streak = 0;
  private streakOutcome: RoundOutcome | null = null;

  constructor(bus: EventBus<GameEventMap>, limit = 200) {
    this.bus = bus;
    this.limit = limit;
  }

  record(result: RoundResult, settlements: readonly BetSettlement[]): void {
    let staked = 0;
    let returned = 0;
    let commission = 0;
    for (const settlement of settlements) {
      staked += settlement.stake;
      returned += settlement.returned;
      commission += settlement.commission;
    }

    this.entries.push({ result, settlements, staked, returned, at: Date.now() });
    if (this.entries.length > this.limit) this.entries.shift();

    this.staked += staked;
    this.returned += returned;
    this.commission += commission;
    this.biggestWin = Math.max(this.biggestWin, returned - staked);

    if (this.streakOutcome === result.outcome) this.streak += 1;
    else {
      this.streakOutcome = result.outcome;
      this.streak = 1;
    }
  }

  get recent(): readonly HistoryEntry[] {
    return this.entries;
  }

  /** The last `count` outcomes, newest last — feeds the compact result strip. */
  lastOutcomes(count: number): RoundOutcome[] {
    return this.entries.slice(-count).map((entry) => entry.result.outcome);
  }

  get stats(): SessionStats {
    const wagered = this.entries.filter((entry) => entry.staked > 0).length;
    return {
      roundsPlayed: this.entries.length,
      roundsWagered: wagered,
      totalStaked: this.staked,
      totalReturned: this.returned,
      totalCommission: this.commission,
      netProfit: this.returned - this.staked,
      biggestWin: this.biggestWin,
      currentStreak: this.streak,
      streakOutcome: this.streakOutcome,
    };
  }

  clear(): void {
    this.entries.length = 0;
    this.staked = 0;
    this.returned = 0;
    this.commission = 0;
    this.biggestWin = 0;
    this.streak = 0;
    this.streakOutcome = null;
    this.bus.emit("round:reset", undefined);
  }

  destroy(): void {
    this.entries.length = 0;
  }
}
