import { StateMachine } from "../core/StateMachine";
import type { GameContext } from "../GameContext";
import { BaccaratRules } from "../rules/BaccaratRules";
import { ServerEvent, type NetworkAdapter } from "../net/protocol";
import {
  GameState,
  HandSide,
  RoundOutcome,
  type BetSettlement,
  type DealStep,
  type RoundResult,
} from "../types";
import { Logger } from "../utils/Logger";
import { Sfx } from "./AudioManager";

/** Legal transitions. Anything else is a bug or a stale network message. */
export const ROUND_TRANSITIONS: Readonly<Record<GameState, readonly GameState[]>> = {
  [GameState.Boot]: [GameState.Loading],
  [GameState.Loading]: [GameState.Waiting, GameState.Boot],
  [GameState.Waiting]: [GameState.BettingOpen, GameState.Reset],
  [GameState.BettingOpen]: [GameState.BettingClosed, GameState.Reset],
  [GameState.BettingClosed]: [GameState.Dealing, GameState.Reset],
  [GameState.Dealing]: [
    GameState.PlayerDraw,
    GameState.BankerDraw,
    GameState.Result,
    GameState.Reset,
  ],
  [GameState.PlayerDraw]: [GameState.BankerDraw, GameState.Result, GameState.Reset],
  [GameState.BankerDraw]: [GameState.Result, GameState.Reset],
  [GameState.Result]: [GameState.Payout, GameState.Reset],
  [GameState.Payout]: [GameState.Reset],
  [GameState.Reset]: [GameState.Waiting, GameState.BettingOpen],
};

export function createRoundStateMachine(): StateMachine<GameState> {
  return new StateMachine<GameState>({
    initial: GameState.Boot,
    transitions: ROUND_TRANSITIONS,
    name: "round",
    tolerant: true,
  });
}

/**
 * The conductor.
 *
 * Translates server messages into the round state machine and the on-table
 * choreography, then translates the settled result back into payouts and
 * scoreboard updates. Every visual sequence is `await`-ed against a round
 * token, so a disconnect, a `reset()` or a `destroy()` mid-deal unwinds
 * cleanly instead of animating into a torn-down stage.
 */
export class GameManager {
  private readonly log = Logger.create("game");
  private readonly ctx: GameContext;
  private readonly network: NetworkAdapter;
  private readonly unsubscribes: Array<() => void> = [];

  private roundId = "";
  /** Incremented whenever the current round is abandoned. */
  private token = 0;
  private pendingResult: RoundResult | null = null;
  private streamedSteps: DealStep[] = [];
  private settlements: readonly BetSettlement[] = [];
  private disposed = false;
  private started = false;

  constructor(ctx: GameContext) {
    this.ctx = ctx;
    this.network = ctx.network;
  }

  /* ---------------------------------------------------------------- *
   * Lifecycle
   * ---------------------------------------------------------------- */

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    this.bindNetwork();
    this.ctx.state.transitionTo(GameState.Waiting);
    await this.network.connect();
  }

  private bindNetwork(): void {
    this.unsubscribes.push(
      this.network.on(ServerEvent.Connected, (payload) => {
        this.ctx.bets.setBalance(payload.balance, 0, "SYNC");
        this.ctx.bus.emit("net:connected", { balance: payload.balance });
      }),

      this.network.on(ServerEvent.Disconnected, (payload) => {
        this.ctx.bus.emit("net:disconnected", payload);
      }),

      this.network.on(ServerEvent.Error, (payload) => {
        this.ctx.bus.emit("game:error", payload);
      }),

      this.network.on(ServerEvent.SyncHistory, (payload) => {
        this.ctx.roadmaps.sync(payload.shoeId, payload.entries);
      }),

      this.network.on(ServerEvent.ShoeChange, (payload) => {
        this.ctx.roadmaps.changeShoe(payload.shoeId);
        this.ctx.bus.emit("shoe:changed", payload);
      }),

      this.network.on(ServerEvent.RoundStart, (payload) => this.onRoundStart(payload.roundId, payload.coup, payload.shoeId)),

      this.network.on(ServerEvent.BettingOpen, (payload) => this.onBettingOpen(payload.roundId, payload.durationSeconds)),

      this.network.on(ServerEvent.UpdateTimer, (payload) => {
        this.ctx.bus.emit("timer:tick", {
          remainingSeconds: payload.remainingSeconds,
          totalSeconds: payload.totalSeconds,
          urgent: payload.remainingSeconds <= this.ctx.config.timing.urgentSeconds,
        });
        if (payload.remainingSeconds <= 0) this.ctx.bus.emit("timer:expired", undefined);
      }),

      this.network.on(ServerEvent.BettingClosed, () => this.onBettingClosed()),

      this.network.on(ServerEvent.DealCard, (payload) => {
        // Buffered: a live-dealer feed streams cards, an RNG feed does not.
        // Either way the animation runs off the settled RESULT.
        this.streamedSteps.push(payload.step);
      }),

      this.network.on(ServerEvent.BurnCard, (payload) => {
        this.ctx.bus.emit("round:burn", { cards: payload.cards });
      }),

      this.network.on(ServerEvent.Result, (payload) => void this.onResult(payload.result)),

      this.network.on(ServerEvent.RoundEnd, () => {
        this.ctx.bus.emit("round:end", { roundId: this.roundId });
      }),

      this.network.on(ServerEvent.BetAccepted, (payload) => {
        this.ctx.bets.applyServerBets(payload.bets, payload.balance);
      }),

      this.network.on(ServerEvent.BetRejected, (payload) => {
        this.ctx.bus.emit("bet:rejected", {
          betType: payload.betType,
          reason: payload.reason,
          message: payload.message,
        });
      }),

      this.network.on(ServerEvent.BalanceUpdate, (payload) => {
        this.ctx.bets.setBalance(payload.balance, payload.delta, payload.reason);
      }),
    );
  }

  /* ---------------------------------------------------------------- *
   * Round phases
   * ---------------------------------------------------------------- */

  private onRoundStart(roundId: string, coup: number, shoeId: string): void {
    // A fast table (or a reconnect) can open the next coup while the previous
    // one is still animating. Bumping the token stops that sequence, but the
    // cards it already dealt are still on the felt and must go, or the next
    // round would deal a fourth card into a hand.
    this.abandonInFlightRound();

    this.roundId = roundId;
    this.pendingResult = null;
    this.streamedSteps = [];
    this.settlements = [];

    this.ctx.bets.beginRound(roundId);
    this.ctx.bus.emit("round:start", { roundId, coup, shoeId });

    if (this.ctx.state.is(GameState.Payout, GameState.Result, GameState.Dealing)) {
      this.ctx.state.transitionTo(GameState.Reset);
    }
    if (this.ctx.state.state === GameState.Reset) {
      this.ctx.state.transitionTo(GameState.Waiting);
    }
  }

  private onBettingOpen(roundId: string, durationSeconds: number): void {
    this.roundId = roundId;
    this.ctx.bets.setBettingOpen(true);
    this.ctx.state.transitionTo(GameState.BettingOpen);
    this.ctx.audio.play(Sfx.BettingOpen);
    this.ctx.bus.emit("round:bettingOpen", { roundId, durationSeconds });

    if (this.ctx.config.features.autoRepeatBet) this.ctx.bets.repeat();
  }

  private onBettingClosed(): void {
    this.ctx.bets.setBettingOpen(false);
    this.ctx.bets.archiveRound();
    this.ctx.state.transitionTo(GameState.BettingClosed);
    this.ctx.audio.play(Sfx.BettingClosed);
    this.ctx.bus.emit("round:bettingClosed", { roundId: this.roundId });
  }

  /**
   * The heart of the game: turns a settled result into the physical sequence a
   * dealer would perform, pausing at each decision point.
   */
  private async onResult(result: RoundResult): Promise<void> {
    if (this.disposed) return;
    this.pendingResult = result;

    const token = ++this.token;
    const alive = (): boolean => !this.disposed && this.token === token;

    this.ctx.state.transitionTo(GameState.Dealing);

    const timing = this.ctx.config.animation;
    const opening = result.dealSequence.filter((step) => !step.isDraw);
    const draws = result.dealSequence.filter((step) => step.isDraw);

    // 1. Four cards, alternating, face down.
    for (const step of opening) {
      if (!alive()) return;
      await this.ctx.cards.deal(step);
      await this.wait(timing.dealStagger * 0.4);
    }

    // 2. Player's hand turns first — table convention.
    if (!alive()) return;
    await this.ctx.cards.reveal(HandSide.Player);
    this.emitScores(result, 2);
    this.ctx.bus.emit("hand:revealed", { side: "player", total: result.player.total });

    if (!alive()) return;
    await this.ctx.cards.reveal(HandSide.Banker);
    this.emitScores(result, 2);
    this.ctx.bus.emit("hand:revealed", { side: "banker", total: result.banker.total });

    // 3. Naturals freeze both hands; otherwise walk the drawing rules.
    if (draws.length > 0) {
      for (const step of draws) {
        if (!alive()) return;
        this.ctx.state.transitionTo(
          step.side === HandSide.Player ? GameState.PlayerDraw : GameState.BankerDraw,
        );
        await this.wait(timing.drawDecisionDelay);
        if (!alive()) return;
        await this.ctx.cards.deal(step);
        await this.ctx.cards.revealCard(step.side, step.index, true);
        this.emitScores(result, 3);
      }
    }

    if (!alive()) return;
    await this.presentResult(result, alive);
  }

  /**
   * Cancels any running deal sequence and clears the table immediately.
   * Idempotent: safe to call when no round is in flight.
   */
  private abandonInFlightRound(): void {
    this.token += 1;
    if (this.ctx.cards.cardCount === 0) return;

    this.ctx.cards.clearPresentation();
    this.ctx.cards.clearImmediate();
    this.ctx.bus.emit("round:reset", undefined);
    this.log.debug("abandoned an in-flight round");
  }

  /** Publishes running hand totals as they become visible. */
  private emitScores(result: RoundResult, upTo: number): void {
    const player = BaccaratRules.handTotal(result.player.cards.slice(0, upTo));
    const banker = BaccaratRules.handTotal(result.banker.cards.slice(0, upTo));
    this.ctx.bus.emit("hand:scoreChanged", { player, banker });
  }

  private async presentResult(result: RoundResult, alive: () => boolean): Promise<void> {
    this.ctx.state.transitionTo(GameState.Result);
    this.ctx.bus.emit("hand:scoreChanged", {
      player: result.player.total,
      banker: result.banker.total,
    });
    this.ctx.bus.emit("round:result", { result });

    if (result.outcome === RoundOutcome.Player) {
      this.ctx.cards.highlight(HandSide.Player);
      this.ctx.cards.dim(HandSide.Banker);
    } else if (result.outcome === RoundOutcome.Banker) {
      this.ctx.cards.highlight(HandSide.Banker);
      this.ctx.cards.dim(HandSide.Player);
    } else {
      this.ctx.cards.highlight(HandSide.Player);
      this.ctx.cards.highlight(HandSide.Banker);
    }

    this.ctx.roadmaps.record(result);

    // 4. Settle. The engine computes this locally for presentation; the server
    //    remains authoritative for the balance via BALANCE_UPDATE.
    const bets = this.ctx.bets.current;
    const settlements = BaccaratRules.settle(bets, result, this.ctx.config);
    this.settlements = settlements;
    this.ctx.history.record(result, settlements);

    let totalStake = 0;
    let totalReturn = 0;
    let commission = 0;
    for (const settlement of settlements) {
      totalStake += settlement.stake;
      totalReturn += settlement.returned;
      commission += settlement.commission;
    }

    await this.wait(0.5);
    if (!alive()) return;

    this.ctx.state.transitionTo(GameState.Payout);
    this.ctx.bus.emit("round:settled", {
      settlements,
      totalStake,
      totalReturn,
      netProfit: totalReturn - totalStake,
      commission,
    });

    if (totalStake > 0) {
      const profit = totalReturn - totalStake;
      if (profit > 0) this.ctx.audio.play(profit >= totalStake * 4 ? Sfx.BigWin : Sfx.Win);
      else if (profit < 0) this.ctx.audio.play(Sfx.Lose);
      else this.ctx.audio.play(Sfx.Push);
    }

    await this.wait(this.ctx.config.timing.resultSeconds);
    if (!alive()) return;
    await this.finishRound();
  }

  private async finishRound(): Promise<void> {
    this.ctx.state.transitionTo(GameState.Reset);
    this.ctx.cards.clearPresentation();
    await this.ctx.cards.collect();
    this.ctx.bus.emit("round:reset", undefined);
    if (!this.disposed) this.ctx.state.transitionTo(GameState.Waiting);
  }

  /* ---------------------------------------------------------------- *
   * External control
   * ---------------------------------------------------------------- */

  get currentRoundId(): string {
    return this.roundId;
  }

  get lastSettlements(): readonly BetSettlement[] {
    return this.settlements;
  }

  get lastResult(): RoundResult | null {
    return this.pendingResult;
  }

  /** Abandons the current round's choreography and clears the table. */
  reset(): void {
    this.abandonInFlightRound();
    this.pendingResult = null;
    this.streamedSteps = [];
    this.settlements = [];
    this.ctx.bets.setBettingOpen(false);
    if (!this.ctx.state.is(GameState.Boot, GameState.Loading)) {
      this.ctx.state.forceTo(GameState.Waiting);
    }
    this.ctx.bus.emit("round:reset", undefined);
  }

  pause(): void {
    this.network.pause?.();
  }

  resume(): void {
    this.network.resume?.();
  }

  destroy(): void {
    this.disposed = true;
    this.token += 1;
    for (const unsubscribe of this.unsubscribes.splice(0)) {
      try {
        unsubscribe();
      } catch (error) {
        this.log.warn("unsubscribe failed", error);
      }
    }
  }

  /**
   * Pause-aware delay. Routed through the animation manager rather than
   * `setTimeout` so a paused game genuinely stops mid-sequence instead of
   * silently advancing while the tab is hidden.
   */
  private wait(seconds: number): Promise<void> {
    return new Promise((resolve) => {
      this.ctx.animation.delayedCall(Math.max(0, seconds), resolve);
    });
  }
}
