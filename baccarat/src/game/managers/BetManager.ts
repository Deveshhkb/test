import type { GameConfig } from "../Config";
import type { GameEventMap } from "../events";
import { BaccaratRules } from "../rules/BaccaratRules";
import { ClientEvent, type NetworkAdapter } from "../net/protocol";
import { ALL_BET_TYPES, BetType, type BetAction, type BetMap } from "../types";
import type { EventBus } from "../utils/EventBus";
import { Logger } from "../utils/Logger";

export interface BetValidation {
  readonly ok: boolean;
  readonly reason?: "CLOSED" | "LIMIT_MIN" | "LIMIT_MAX" | "INSUFFICIENT_FUNDS";
  readonly message?: string;
}

/**
 * The wallet and the layout.
 *
 * Placement is optimistic — the chip lands the instant it is tapped, then the
 * server's `BET_ACCEPTED` reconciles the map. That is what makes betting feel
 * instant on a 200 ms connection while keeping the backend authoritative;
 * `applyServerBets` is the only path allowed to disagree with the player.
 */
export class BetManager {
  private readonly log = Logger.create("bets");
  private readonly bus: EventBus<GameEventMap>;
  private readonly network: NetworkAdapter;
  private config: GameConfig;

  private bets: BetMap = {};
  private history: BetAction[] = [];
  private lastRoundBets: BetMap = {};
  private balance = 0;
  private chipIndex = 0;
  private open = false;
  private roundId = "";

  constructor(config: GameConfig, bus: EventBus<GameEventMap>, network: NetworkAdapter) {
    this.config = config;
    this.bus = bus;
    this.network = network;
    this.balance = config.startingBalance;
  }

  updateConfig(config: GameConfig): void {
    this.config = config;
    this.chipIndex = Math.min(this.chipIndex, Math.max(0, config.chips.length - 1));
  }

  /* ---------------------------------------------------------------- *
   * Round lifecycle
   * ---------------------------------------------------------------- */

  beginRound(roundId: string): void {
    this.roundId = roundId;
    this.bets = {};
    this.history = [];
    this.emitChanged();
  }

  setBettingOpen(open: boolean): void {
    this.open = open;
  }

  get isBettingOpen(): boolean {
    return this.open;
  }

  /** Remembers the round's stake so `repeat` has something to replay. */
  archiveRound(): void {
    if (this.total > 0) this.lastRoundBets = { ...this.bets };
  }

  /* ---------------------------------------------------------------- *
   * Wallet
   * ---------------------------------------------------------------- */

  get currentBalance(): number {
    return this.balance;
  }

  setBalance(balance: number, delta = 0, reason = "SYNC"): void {
    this.balance = balance;
    this.bus.emit("balance:changed", { balance, delta, reason });
    this.emitChanged();
  }

  /* ---------------------------------------------------------------- *
   * Reading the layout
   * ---------------------------------------------------------------- */

  get current(): BetMap {
    return this.bets;
  }

  amountOn(betType: BetType): number {
    return this.bets[betType] ?? 0;
  }

  get total(): number {
    let sum = 0;
    for (const type of ALL_BET_TYPES) sum += this.bets[type] ?? 0;
    return sum;
  }

  get canUndo(): boolean {
    return this.open && this.history.length > 0;
  }

  get canRepeat(): boolean {
    return this.open && this.total === 0 && Object.keys(this.lastRoundBets).length > 0;
  }

  get canDouble(): boolean {
    return this.open && this.total > 0 && this.total <= this.balance;
  }

  get selectedChipIndex(): number {
    return this.chipIndex;
  }

  get selectedChipValue(): number {
    return this.config.chips[this.chipIndex]?.value ?? 0;
  }

  selectChip(index: number): void {
    const clamped = Math.max(0, Math.min(index, this.config.chips.length - 1));
    if (clamped === this.chipIndex) return;
    this.chipIndex = clamped;
    this.bus.emit("bet:chipSelected", { value: this.selectedChipValue, index: clamped });
  }

  /**
   * Maximum the player could still win from the current layout, used by the
   * "potential win" readout. Mutually exclusive outcomes are not summed —
   * only the best single outcome plus any side bets that could ride with it.
   */
  potentialWin(): number {
    const { payouts, rules } = this.config;
    const main = Math.max(
      (this.bets[BetType.Player] ?? 0) * payouts[BetType.Player],
      (this.bets[BetType.Banker] ?? 0) *
        payouts[BetType.Banker] *
        (rules.noCommission ? 1 : 1 - rules.bankerCommission),
      (this.bets[BetType.Tie] ?? 0) * payouts[BetType.Tie],
    );
    const sides =
      (this.bets[BetType.PlayerPair] ?? 0) * payouts[BetType.PlayerPair] +
      (this.bets[BetType.BankerPair] ?? 0) * payouts[BetType.BankerPair] +
      (this.bets[BetType.Natural] ?? 0) * payouts[BetType.Natural] +
      (this.bets[BetType.PerfectPair] ?? 0) * payouts[BetType.PerfectPair];
    return Math.round(main + sides);
  }

  /** Commission that would be withheld if the banker line wins right now. */
  pendingCommission(): number {
    const stake = this.bets[BetType.Banker] ?? 0;
    return stake > 0 ? BaccaratRules.commissionFor(stake, this.config) : 0;
  }

  /* ---------------------------------------------------------------- *
   * Placing
   * ---------------------------------------------------------------- */

  validate(betType: BetType, amount: number): BetValidation {
    if (!this.open) return { ok: false, reason: "CLOSED", message: "Betting is closed" };
    if (amount <= 0) return { ok: false, reason: "LIMIT_MIN", message: "Invalid amount" };
    if (amount > this.balance) {
      return { ok: false, reason: "INSUFFICIENT_FUNDS", message: "Insufficient balance" };
    }
    const limit = this.config.limits[betType];
    const next = this.amountOn(betType) + amount;
    if (next > limit.max) {
      return { ok: false, reason: "LIMIT_MAX", message: `Table maximum reached` };
    }
    return { ok: true };
  }

  /** Places the selected chip on a spot. Returns false when rejected. */
  place(betType: BetType, amount = this.selectedChipValue): boolean {
    const validation = this.validate(betType, amount);
    if (!validation.ok) {
      this.log.debug("bet rejected", betType, validation.reason);
      this.bus.emit("bet:rejected", {
        betType,
        reason: validation.reason ?? "UNKNOWN",
        message: validation.message ?? "Bet rejected",
      });
      return false;
    }

    this.bets = { ...this.bets, [betType]: this.amountOn(betType) + amount };
    this.balance -= amount;
    this.history.push({
      betType,
      amount,
      chipValue: this.selectedChipValue,
      timestamp: Date.now(),
    });

    this.bus.emit("bet:placed", {
      betType,
      amount,
      chipValue: this.selectedChipValue,
      total: this.amountOn(betType),
    });
    this.emitChanged();

    this.network.send(ClientEvent.PlaceBet, {
      roundId: this.roundId,
      betType,
      amount,
      chipValue: this.selectedChipValue,
    });
    return true;
  }

  undo(): boolean {
    if (!this.canUndo) return false;
    const action = this.history.pop();
    if (!action) return false;

    const remaining = this.amountOn(action.betType) - action.amount;
    const next = { ...this.bets };
    if (remaining > 0) next[action.betType] = remaining;
    else delete next[action.betType];
    this.bets = next;
    this.balance += action.amount;

    this.bus.emit("bet:undone", { betType: action.betType, amount: action.amount });
    this.emitChanged();

    // The server has no concept of "undo"; it is a cancel plus a replay of the
    // remaining stake on that spot.
    this.network.send(ClientEvent.CancelBet, { roundId: this.roundId, betType: action.betType });
    if (remaining > 0) {
      this.network.send(ClientEvent.PlaceBet, {
        roundId: this.roundId,
        betType: action.betType,
        amount: remaining,
        chipValue: action.chipValue,
      });
    }
    return true;
  }

  clear(): boolean {
    if (!this.open || this.total === 0) return false;
    this.balance += this.total;
    this.bets = {};
    this.history = [];
    this.bus.emit("bet:cleared", undefined);
    this.emitChanged();
    this.network.send(ClientEvent.CancelBet, { roundId: this.roundId });
    return true;
  }

  double(): boolean {
    if (!this.canDouble) return false;
    const snapshot = { ...this.bets };
    let placed = false;
    for (const [key, amount] of Object.entries(snapshot)) {
      if (!amount) continue;
      placed = this.place(key as BetType, amount) || placed;
    }
    if (placed) this.bus.emit("bet:doubled", { bets: this.bets });
    return placed;
  }

  repeat(): boolean {
    if (!this.canRepeat) return false;
    let placed = false;
    for (const [key, amount] of Object.entries(this.lastRoundBets)) {
      if (!amount) continue;
      placed = this.place(key as BetType, amount) || placed;
    }
    if (placed) this.bus.emit("bet:repeated", { bets: this.bets });
    return placed;
  }

  /**
   * Asks the table to close betting and deal. Only meaningful on a manual
   * (player-driven) table; a timed table ignores it and runs on its clock.
   */
  requestDeal(): boolean {
    if (!this.open || this.total <= 0) return false;
    this.network.send(ClientEvent.Deal, { roundId: this.roundId });
    return true;
  }

  get canDeal(): boolean {
    return this.open && this.total > 0;
  }

  /* ---------------------------------------------------------------- *
   * Server reconciliation
   * ---------------------------------------------------------------- */

  /**
   * The server is the source of truth. When its view differs from ours — a
   * rejected bet, a reconnect mid-round — we snap to it and tell the UI.
   */
  applyServerBets(bets: BetMap, balance: number): void {
    const differs =
      ALL_BET_TYPES.some((type) => (bets[type] ?? 0) !== (this.bets[type] ?? 0)) ||
      balance !== this.balance;
    if (!differs) return;

    this.log.debug("reconciling with server", bets, balance);
    this.bets = { ...bets };
    this.balance = balance;
    // The undo stack no longer describes reality once the server overrides us.
    this.history = this.history.filter((action) => (bets[action.betType] ?? 0) >= action.amount);
    this.emitChanged();
  }

  private emitChanged(): void {
    this.bus.emit("bet:changed", {
      bets: this.bets,
      total: this.total,
      canUndo: this.canUndo,
      canRepeat: this.canRepeat,
    });
  }

  reset(): void {
    this.bets = {};
    this.history = [];
    this.lastRoundBets = {};
    this.open = false;
    this.balance = this.config.startingBalance;
    this.emitChanged();
  }

  destroy(): void {
    this.bets = {};
    this.history = [];
    this.lastRoundBets = {};
  }
}
