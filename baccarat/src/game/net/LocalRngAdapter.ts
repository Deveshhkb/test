import type { GameConfig } from "../Config";
import { SHOE_CUT_CARD_MIN, SHOE_CUT_CARD_RANGE } from "../Constants";
import { BaccaratRules } from "../rules/BaccaratRules";
import {
  BetType,
  HandSide,
  RANKS,
  SUITS,
  type BetMap,
  type CardData,
  type DealStep,
  type RoadEntry,
  type RoundResult,
} from "../types";
import { SeededRandom } from "../utils/MathUtils";
import { Logger } from "../utils/Logger";
import { uid } from "../utils/Helpers";
import {
  ClientEvent,
  ConnectionState,
  ServerEvent,
  type ClientEventMap,
  type NetworkAdapter,
  type ServerEventHandler,
  type ServerEventMap,
} from "./protocol";

/**
 * A complete table server running in-process.
 *
 * It owns the shoe, the clock, the balance and the settlement — exactly the
 * responsibilities a real backend owns — so standalone play exercises the same
 * code paths as a networked deployment. Nothing in the rendering layer can tell
 * the difference between this and a live socket.
 */
export class LocalRngAdapter implements NetworkAdapter {
  private readonly log = Logger.create("net:local");
  private readonly handlers = new Map<ServerEvent, Set<(payload: unknown) => void>>();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  private config: GameConfig;
  private rng: SeededRandom;
  private shoe: Shoe;

  private state = ConnectionState.Idle;
  private paused = false;
  private running = false;

  private balance: number;
  private roundId = "";
  private coup = 0;
  private bets: BetMap = {};
  private currentResult: RoundResult | null = null;
  private history: RoadEntry[] = [];

  private countdownHandle: ReturnType<typeof setInterval> | null = null;
  private bettingEndsAt = 0;
  /** True while a manual table is waiting for the player to press Deal. */
  private awaitingDeal = false;

  constructor(config: GameConfig) {
    this.config = config;
    this.balance = config.startingBalance;
    this.rng = new SeededRandom(config.network.seed ?? `${Date.now()}:${Math.random()}`);
    this.shoe = new Shoe(config.rules.decks, this.rng);
  }

  get connectionState(): ConnectionState {
    return this.state;
  }

  updateConfig(config: GameConfig): void {
    this.config = config;
  }

  /* ---------------------------------------------------------------- *
   * Transport surface
   * ---------------------------------------------------------------- */

  async connect(): Promise<void> {
    if (this.running) return;
    this.state = ConnectionState.Connecting;
    // A tick of latency keeps consumers honest about async connection.
    await new Promise<void>((resolve) => this.schedule(resolve, 60));

    this.state = ConnectionState.Open;
    this.running = true;

    this.emit(ServerEvent.Connected, {
      tableId: this.config.tableId,
      balance: this.balance,
      currency: this.config.currency,
      serverTime: Date.now(),
    });
    this.emit(ServerEvent.SyncHistory, {
      shoeId: this.shoe.id,
      entries: this.history.slice(),
    });
    this.emit(ServerEvent.ShoeChange, {
      shoeId: this.shoe.id,
      cardsRemaining: this.shoe.remaining,
    });

    this.beginRound();
  }

  disconnect(): void {
    this.running = false;
    this.state = ConnectionState.Closed;
    this.clearTimers();
    this.emit(ServerEvent.Disconnected, { reason: "client_disconnect", willReconnect: false });
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  on<K extends ServerEvent>(event: K, handler: ServerEventHandler<K>): () => void {
    let bucket = this.handlers.get(event);
    if (!bucket) {
      bucket = new Set();
      this.handlers.set(event, bucket);
    }
    const wrapped = handler as (payload: unknown) => void;
    bucket.add(wrapped);
    return () => {
      bucket.delete(wrapped);
    };
  }

  send<K extends ClientEvent>(event: K, payload: ClientEventMap[K]): void {
    switch (event) {
      case ClientEvent.PlaceBet:
        this.handlePlaceBet(payload as ClientEventMap[ClientEvent.PlaceBet]);
        break;
      case ClientEvent.CancelBet:
        this.handleCancelBet(payload as ClientEventMap[ClientEvent.CancelBet]);
        break;
      case ClientEvent.RequestHistory:
        this.emit(ServerEvent.SyncHistory, {
          shoeId: this.shoe.id,
          entries: this.history.slice(),
        });
        break;
      case ClientEvent.Deal:
      case ClientEvent.ConfirmBets:
        this.handleDealRequest();
        break;
      case ClientEvent.JoinTable:
      case ClientEvent.LeaveTable:
        break;
      default:
        this.log.warn("unhandled client event", event);
    }
  }

  destroy(): void {
    this.running = false;
    this.clearTimers();
    this.handlers.clear();
  }

  /* ---------------------------------------------------------------- *
   * Bet handling (server-authoritative)
   * ---------------------------------------------------------------- */

  private handlePlaceBet(payload: ClientEventMap[ClientEvent.PlaceBet]): void {
    const { betType, amount, chipValue } = payload;

    if (Date.now() > this.bettingEndsAt) {
      this.rejectBet(betType, amount, "CLOSED", "Betting is closed");
      return;
    }
    if (amount > this.balance) {
      this.rejectBet(betType, amount, "INSUFFICIENT_FUNDS", "Insufficient balance");
      return;
    }

    const limit = this.config.limits[betType];
    const next = (this.bets[betType] ?? 0) + amount;
    if (next > limit.max) {
      this.rejectBet(betType, amount, "LIMIT_MAX", `Maximum for this spot is ${limit.max}`);
      return;
    }

    this.bets = { ...this.bets, [betType]: next };
    this.balance -= amount;
    this.emit(ServerEvent.BetAccepted, {
      roundId: this.roundId,
      bets: { ...this.bets },
      balance: this.balance,
    });
    this.emit(ServerEvent.BalanceUpdate, {
      balance: this.balance,
      delta: -amount,
      reason: "BET",
    });
    this.log.debug("bet accepted", betType, amount, "chip", chipValue);
  }

  private handleCancelBet(payload: ClientEventMap[ClientEvent.CancelBet]): void {
    if (Date.now() > this.bettingEndsAt) {
      this.rejectBet(payload.betType ?? BetType.Player, 0, "CLOSED", "Betting is closed");
      return;
    }

    let refund = 0;
    if (payload.betType) {
      refund = this.bets[payload.betType] ?? 0;
      const next = { ...this.bets };
      delete next[payload.betType];
      this.bets = next;
    } else {
      for (const value of Object.values(this.bets)) refund += value ?? 0;
      this.bets = {};
    }
    if (refund <= 0) return;

    this.balance += refund;
    this.emit(ServerEvent.BetAccepted, {
      roundId: this.roundId,
      bets: { ...this.bets },
      balance: this.balance,
    });
    this.emit(ServerEvent.BalanceUpdate, {
      balance: this.balance,
      delta: refund,
      reason: "REFUND",
    });
  }

  private rejectBet(
    betType: BetType,
    amount: number,
    reason: ServerEventMap[ServerEvent.BetRejected]["reason"],
    message: string,
  ): void {
    this.emit(ServerEvent.BetRejected, { roundId: this.roundId, betType, amount, reason, message });
  }

  /* ---------------------------------------------------------------- *
   * Round loop
   * ---------------------------------------------------------------- */

  private beginRound(): void {
    if (!this.running) return;
    if (this.paused) {
      this.schedule(() => this.beginRound(), 500);
      return;
    }

    // Reshuffle when the cut card shows, mirroring a real shoe change.
    if (this.shoe.needsShuffle) {
      this.shoe = new Shoe(this.config.rules.decks, this.rng);
      this.history = [];
      this.emit(ServerEvent.ShoeChange, {
        shoeId: this.shoe.id,
        cardsRemaining: this.shoe.remaining,
      });
      this.emit(ServerEvent.SyncHistory, { shoeId: this.shoe.id, entries: [] });

      if (this.config.features.burnCard) {
        // House procedure: burn the first card plus that many more.
        const first = this.shoe.draw();
        const burnCount = Math.min(BaccaratRules.cardValue(first) || 10, this.shoe.remaining);
        const burned = [first, ...this.shoe.drawMany(burnCount)];
        this.emit(ServerEvent.BurnCard, { roundId: "shoe-open", cards: burned });
      }
    }

    this.roundId = uid("round");
    this.coup += 1;
    this.bets = {};
    this.currentResult = null;

    this.emit(ServerEvent.RoundStart, {
      roundId: this.roundId,
      shoeId: this.shoe.id,
      coup: this.coup,
    });

    this.openBetting();
  }

  private openBetting(): void {
    const manual = this.config.roundMode === "manual";
    const seconds = manual ? 0 : this.config.timing.bettingSeconds;
    // Manual tables have no clock: betting stays open until DEAL arrives.
    this.bettingEndsAt = manual ? Number.POSITIVE_INFINITY : Date.now() + seconds * 1000;
    this.awaitingDeal = manual;

    this.emit(ServerEvent.BettingOpen, {
      roundId: this.roundId,
      durationSeconds: seconds,
      serverTime: Date.now(),
    });

    if (manual) return;
    this.startCountdown(seconds);
    this.schedule(() => this.closeBetting(), seconds * 1000);
  }

  /**
   * The player pressed Deal. Refused with no stake on the layout — a real table
   * will not deal a coup nobody has bet on.
   */
  private handleDealRequest(): void {
    if (!this.awaitingDeal) return;

    const staked = Object.values(this.bets).reduce<number>((sum, v) => sum + (v ?? 0), 0);
    if (staked <= 0) {
      this.emit(ServerEvent.BetRejected, {
        roundId: this.roundId,
        betType: BetType.Player,
        amount: 0,
        reason: "LIMIT_MIN",
        message: "Place a bet before dealing",
      });
      return;
    }

    this.awaitingDeal = false;
    this.bettingEndsAt = 0;
    this.closeBetting();
  }

  private startCountdown(totalSeconds: number): void {
    this.stopCountdown();
    // 10 Hz: smooth enough for the ring sweep without flooding the bus.
    this.countdownHandle = setInterval(() => {
      const remaining = Math.max(0, (this.bettingEndsAt - Date.now()) / 1000);
      this.emit(ServerEvent.UpdateTimer, {
        roundId: this.roundId,
        remainingSeconds: remaining,
        totalSeconds,
      });
      if (remaining <= 0) this.stopCountdown();
    }, 100);
  }

  private stopCountdown(): void {
    if (this.countdownHandle !== null) {
      clearInterval(this.countdownHandle);
      this.countdownHandle = null;
    }
  }

  private closeBetting(): void {
    if (!this.running) return;
    this.stopCountdown();
    this.emit(ServerEvent.BettingClosed, { roundId: this.roundId });

    const result = this.playCoup();
    this.currentResult = result;

    // Stream the physical deal, then publish the settled round. A live-dealer
    // backend does exactly this; an RNG backend may send RESULT alone.
    for (const step of result.dealSequence) {
      this.emit(ServerEvent.DealCard, { roundId: this.roundId, step });
    }
    this.emit(ServerEvent.Result, { result });

    // Payout lands once the client has had time to run the reveal.
    const budget = this.estimateDealMs(result);
    this.schedule(() => this.settle(result), budget);
  }

  private settle(result: RoundResult): void {
    if (!this.running) return;

    const settlements = BaccaratRules.settle(this.bets, result, this.config);
    let returned = 0;
    for (const settlement of settlements) returned += settlement.returned;

    if (returned > 0) {
      this.balance += returned;
      this.emit(ServerEvent.BalanceUpdate, {
        balance: this.balance,
        delta: returned,
        reason: "PAYOUT",
      });
    }

    const entry: RoadEntry = {
      outcome: result.outcome,
      playerPair: result.playerPair,
      bankerPair: result.bankerPair,
      roundId: result.roundId,
    };
    this.history.push(entry);

    const waiting = this.config.timing.resultSeconds + this.config.timing.waitingSeconds;
    this.emit(ServerEvent.RoundEnd, {
      roundId: this.roundId,
      nextRoundInSeconds: waiting,
    });
    this.schedule(() => this.beginRound(), waiting * 1000);
    this.log.debug(`next coup in ${waiting}s`);
  }

  /** Worst-case wall time the client needs to reveal this coup. */
  private estimateDealMs(result: RoundResult): number {
    const a = this.config.animation;
    const speed = Math.max(0.1, a.speedMultiplier);
    const perCard = (a.dealStagger + a.flipDuration) * speed;
    const extra = result.dealSequence.length > 4 ? a.drawDecisionDelay * 2 * speed : 0;
    return (result.dealSequence.length * perCard + extra + a.winGlowDuration * speed) * 1000;
  }

  /* ---------------------------------------------------------------- *
   * Dealing
   * ---------------------------------------------------------------- */

  /** Plays one coup end to end, applying the full third-card table. */
  private playCoup(): RoundResult {
    const playerCards: CardData[] = [];
    const bankerCards: CardData[] = [];
    const sequence: DealStep[] = [];

    const deal = (side: HandSide, isDraw: boolean): void => {
      const card = this.shoe.draw();
      const hand = side === HandSide.Player ? playerCards : bankerCards;
      hand.push(card);
      sequence.push({ side, card, index: hand.length - 1, isDraw });
    };

    // Opening deal alternates P, B, P, B.
    deal(HandSide.Player, false);
    deal(HandSide.Banker, false);
    deal(HandSide.Player, false);
    deal(HandSide.Banker, false);

    const playerTotal = BaccaratRules.handTotal(playerCards);
    const bankerTotal = BaccaratRules.handTotal(bankerCards);
    const natural = playerTotal >= 8 || bankerTotal >= 8;

    if (!natural) {
      let playerThird: CardData | null = null;
      if (BaccaratRules.playerShouldDraw(playerTotal)) {
        deal(HandSide.Player, true);
        playerThird = playerCards[2] ?? null;
      }
      if (BaccaratRules.bankerShouldDraw(bankerTotal, playerThird)) {
        deal(HandSide.Banker, true);
      }
    }

    const player = BaccaratRules.snapshot(HandSide.Player, playerCards);
    const banker = BaccaratRules.snapshot(HandSide.Banker, bankerCards);

    return {
      roundId: this.roundId,
      shoeId: this.shoe.id,
      player,
      banker,
      outcome: BaccaratRules.outcome(player.total, banker.total),
      playerPair: player.isPair,
      bankerPair: banker.isPair,
      perfectPair:
        BaccaratRules.isPerfectPair(playerCards) || BaccaratRules.isPerfectPair(bankerCards),
      natural: player.isNatural || banker.isNatural,
      dealSequence: sequence,
    };
  }

  /** Exposed for tests and for the "reveal" debug tooling. */
  peekResult(): RoundResult | null {
    return this.currentResult;
  }

  /* ---------------------------------------------------------------- *
   * Plumbing
   * ---------------------------------------------------------------- */

  private emit<K extends ServerEvent>(event: K, payload: ServerEventMap[K]): void {
    const bucket = this.handlers.get(event);
    if (!bucket) return;
    for (const handler of Array.from(bucket)) handler(payload);
  }

  private schedule(fn: () => void, ms: number): void {
    const handle = setTimeout(() => {
      this.timers.delete(handle);
      fn();
    }, ms);
    this.timers.add(handle);
  }

  private clearTimers(): void {
    for (const handle of this.timers) clearTimeout(handle);
    this.timers.clear();
    this.stopCountdown();
  }
}

/* ------------------------------------------------------------------ *
 * Shoe
 * ------------------------------------------------------------------ */

/** A shuffled multi-deck shoe with a randomly placed cut card. */
export class Shoe {
  readonly id = uid("shoe");
  private readonly cards: CardData[] = [];
  private index = 0;
  private readonly cutCardAt: number;

  constructor(decks: number, rng: SeededRandom) {
    for (let d = 0; d < decks; d++) {
      for (const suit of SUITS) {
        for (const rank of RANKS) this.cards.push({ rank, suit });
      }
    }
    rng.shuffle(this.cards);
    this.cutCardAt =
      this.cards.length - SHOE_CUT_CARD_MIN - Math.floor(rng.next() * SHOE_CUT_CARD_RANGE);
  }

  get remaining(): number {
    return this.cards.length - this.index;
  }

  get needsShuffle(): boolean {
    return this.index >= this.cutCardAt;
  }

  draw(): CardData {
    if (this.index >= this.cards.length) {
      throw new Error("[baccarat:shoe] shoe exhausted — cut card was ignored");
    }
    return this.cards[this.index++]!;
  }

  drawMany(count: number): CardData[] {
    const out: CardData[] = [];
    for (let i = 0; i < count && this.index < this.cards.length; i++) out.push(this.draw());
    return out;
  }
}

/**
 * Deals one coup from a fresh seeded shoe without starting the round loop.
 * Used by unit tests and by the roadmap tooling to generate sample shoes.
 */
export function simulateRound(config: GameConfig, seed?: string): RoundResult {
  const shoe = new Shoe(config.rules.decks, new SeededRandom(seed ?? String(Math.random())));
  const playerCards: CardData[] = [];
  const bankerCards: CardData[] = [];
  const sequence: DealStep[] = [];

  const deal = (side: HandSide, isDraw: boolean): void => {
    const card = shoe.draw();
    const hand = side === HandSide.Player ? playerCards : bankerCards;
    hand.push(card);
    sequence.push({ side, card, index: hand.length - 1, isDraw });
  };

  deal(HandSide.Player, false);
  deal(HandSide.Banker, false);
  deal(HandSide.Player, false);
  deal(HandSide.Banker, false);

  const playerTotal = BaccaratRules.handTotal(playerCards);
  const bankerTotal = BaccaratRules.handTotal(bankerCards);

  if (playerTotal < 8 && bankerTotal < 8) {
    let playerThird: CardData | null = null;
    if (BaccaratRules.playerShouldDraw(playerTotal)) {
      deal(HandSide.Player, true);
      playerThird = playerCards[2] ?? null;
    }
    if (BaccaratRules.bankerShouldDraw(bankerTotal, playerThird)) deal(HandSide.Banker, true);
  }

  const p = BaccaratRules.snapshot(HandSide.Player, playerCards);
  const b = BaccaratRules.snapshot(HandSide.Banker, bankerCards);
  return {
    roundId: uid("sim"),
    shoeId: shoe.id,
    player: p,
    banker: b,
    outcome: BaccaratRules.outcome(p.total, b.total),
    playerPair: p.isPair,
    bankerPair: b.isPair,
    perfectPair:
      BaccaratRules.isPerfectPair(playerCards) || BaccaratRules.isPerfectPair(bankerCards),
    natural: p.isNatural || b.isNatural,
    dealSequence: sequence,
  };
}
