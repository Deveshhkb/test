import type { GameEventMap } from "../events";
import { RoadmapEngine, type RoadPrediction } from "../rules/RoadmapEngine";
import {
  type RoundOutcome,
  type RoadEntry,
  type RoadmapSnapshot,
  type RoundResult,
} from "../types";
import type { EventBus } from "../utils/EventBus";

/**
 * Owns the shoe's scoreboard state and publishes it.
 *
 * The heavy derivation lives in `RoadmapEngine` (pure, testable); this class is
 * the thin stateful shell that knows about rounds, shoe changes and the event
 * bus, so the roads can be re-rendered from a single subscription.
 */
export class RoadmapManager {
  private readonly bus: EventBus<GameEventMap>;
  private readonly engine = new RoadmapEngine();
  private shoeId = "";

  constructor(bus: EventBus<GameEventMap>) {
    this.bus = bus;
  }

  get snapshot(): RoadmapSnapshot {
    return this.engine.snapshot();
  }

  get currentShoeId(): string {
    return this.shoeId;
  }

  /** Full replacement — the response to `SYNC_HISTORY`. */
  sync(shoeId: string, entries: readonly RoadEntry[]): void {
    this.shoeId = shoeId;
    this.engine.load(entries);
    this.publish();
  }

  /** Appends a settled coup. */
  record(result: RoundResult): void {
    this.engine.push({
      outcome: result.outcome,
      playerPair: result.playerPair,
      bankerPair: result.bankerPair,
      roundId: result.roundId,
    });
    this.publish();
  }

  /** New shoe: every road resets to empty. */
  changeShoe(shoeId: string): void {
    if (shoeId === this.shoeId) return;
    this.shoeId = shoeId;
    this.engine.clear();
    this.publish();
  }

  /**
   * The dotted "what happens if Player/Banker wins next" preview that live
   * tables show under the roads.
   */
  predict(next: RoundOutcome.Player | RoundOutcome.Banker): RoadPrediction {
    return this.engine.predict(next);
  }

  private publish(): void {
    this.bus.emit("roadmap:updated", { snapshot: this.engine.snapshot() });
  }

  clear(): void {
    this.engine.clear();
    this.publish();
  }

  destroy(): void {
    this.engine.clear();
  }
}
