import {
  Bet,
  BetAction,
  BetResolution,
  BetType,
  BettingConfig,
  GameEvent,
  RouletteNumber,
} from '../Types';
import { TableLayout } from '../Game/TableLayout';
import { EventBus } from '../Utilities/EventBus';
import { Logger } from '../Utilities/Logger';
import { decomposeIntoChips, numberKey } from '../Utilities/Helpers';

/** Why a wager was refused - surfaced to the player as a localised message. */
export enum BetRejection {
  BETTING_CLOSED = 'error.bettingClosed',
  BELOW_MINIMUM = 'error.betTooSmall',
  ABOVE_MAXIMUM = 'error.betTooLarge',
  TABLE_LIMIT = 'error.tableLimit',
  INSUFFICIENT_FUNDS = 'error.insufficientFunds',
  NO_PREVIOUS_BETS = 'error.noPreviousBets',
  UNKNOWN_SPOT = 'error.unknownSpot',
}

export interface BetResult {
  readonly accepted: boolean;
  readonly reason?: BetRejection;
}

/**
 * Authoritative owner of the player's wagers for the current round.
 *
 * This class is pure state and arithmetic - it never touches Pixi. Views listen
 * for `BETS_CHANGED` and re-render from the snapshot it publishes. That
 * separation is what lets the same logic run headless in unit tests and, when
 * `serverDriven` is on, be replaced by server-confirmed bet state without any
 * view changes.
 *
 * Balance is tracked locally for immediate UI feedback; in a server-driven
 * deployment the server remains authoritative and corrects the client through
 * `SYNC_BALANCE`.
 */
export class BetManager {
  private readonly log = Logger.create('BetManager');

  /** Live wagers, keyed by spot id. */
  private readonly bets = new Map<string, Bet>();
  /** Chronological placements, for `undo`. */
  private readonly history: BetAction[] = [];
  /** Snapshot of the previous round's bets, for `repeat`. */
  private lastRoundBets: Map<string, Bet> = new Map();

  private balance: number;
  private bettingOpen = false;
  private selectedChip: number;

  public constructor(
    private config: BettingConfig,
    private readonly layout: TableLayout,
    private readonly bus: EventBus,
    startingBalance: number,
  ) {
    this.balance = startingBalance;
    this.selectedChip = config.chips[0]?.value ?? 1;
  }

  public updateConfig(config: BettingConfig): void {
    this.config = config;
    // Keep the selection valid if the chip ladder changed underneath us.
    if (!config.chips.some((chip) => chip.value === this.selectedChip)) {
      this.selectChip(config.chips[0]?.value ?? 1);
    }
  }

  /* --------------------------------------------------------------------- */
  /* Round gating                                                          */
  /* --------------------------------------------------------------------- */

  public openBetting(): void {
    this.bettingOpen = true;
  }

  public closeBetting(): void {
    this.bettingOpen = false;
  }

  public isBettingOpen(): boolean {
    return this.bettingOpen;
  }

  /* --------------------------------------------------------------------- */
  /* Chip selection                                                        */
  /* --------------------------------------------------------------------- */

  public selectChip(value: number): void {
    this.selectedChip = value;
    this.bus.emit(GameEvent.CHIP_SELECTED, { value });
  }

  public getSelectedChip(): number {
    return this.selectedChip;
  }

  /* --------------------------------------------------------------------- */
  /* Placing bets                                                          */
  /* --------------------------------------------------------------------- */

  /**
   * Place `amount` (defaults to the selected chip) on a spot.
   *
   * Validation order matters: cheapest checks first, and the table-limit check
   * runs against the *resulting* total so a player cannot creep over the cap
   * one chip at a time.
   */
  public placeBet(spotId: string, amount = this.selectedChip): BetResult {
    if (!this.bettingOpen) return this.reject(spotId, BetRejection.BETTING_CLOSED);

    const spot = this.layout.getSpot(spotId);
    if (!spot) return this.reject(spotId, BetRejection.UNKNOWN_SPOT);

    if (amount <= 0) return this.reject(spotId, BetRejection.BELOW_MINIMUM);
    if (amount > this.balance) return this.reject(spotId, BetRejection.INSUFFICIENT_FUNDS);

    const existing = this.bets.get(spotId);
    const nextAmount = (existing?.amount ?? 0) + amount;
    const limit = this.limitFor(spot.type);

    if (nextAmount < limit.min) return this.reject(spotId, BetRejection.BELOW_MINIMUM);
    if (nextAmount > limit.max) return this.reject(spotId, BetRejection.ABOVE_MAXIMUM);
    if (this.getTotalBet() + amount > this.config.maxTotalBet) {
      return this.reject(spotId, BetRejection.TABLE_LIMIT);
    }

    if (existing) {
      existing.amount = nextAmount;
      existing.chips.push(amount);
    } else {
      this.bets.set(spotId, {
        spotId,
        type: spot.type,
        numbers: spot.numbers,
        amount,
        chips: [amount],
      });
    }

    this.history.push({ spotId, amount });
    this.adjustBalance(-amount);

    this.bus.emit(GameEvent.BET_PLACED, { spotId, amount, total: this.getTotalBet() });
    this.publishChange();
    return { accepted: true };
  }

  /** Remove the most recent placement. */
  public undo(): boolean {
    const action = this.history.pop();
    if (!action) return false;

    const bet = this.bets.get(action.spotId);
    if (!bet) return false;

    bet.amount -= action.amount;
    bet.chips.pop();
    if (bet.amount <= 0) this.bets.delete(action.spotId);

    this.adjustBalance(action.amount);
    this.publishChange();
    return true;
  }

  /**
   * Double every live wager.
   *
   * Applied atomically: if any spot would breach its limit or the player cannot
   * afford the whole doubling, nothing changes. A half-applied double is worse
   * than a refusal because the player cannot tell what they are now holding.
   */
  public double(): BetResult {
    if (!this.bettingOpen) return this.reject('*', BetRejection.BETTING_CLOSED);
    if (this.bets.size === 0) return this.reject('*', BetRejection.NO_PREVIOUS_BETS);

    const additional = this.getTotalBet();
    if (additional > this.balance) return this.reject('*', BetRejection.INSUFFICIENT_FUNDS);
    if (this.getTotalBet() + additional > this.config.maxTotalBet) {
      return this.reject('*', BetRejection.TABLE_LIMIT);
    }

    for (const bet of this.bets.values()) {
      if (bet.amount * 2 > this.limitFor(bet.type).max) {
        return this.reject(bet.spotId, BetRejection.ABOVE_MAXIMUM);
      }
    }

    for (const bet of this.bets.values()) {
      this.history.push({ spotId: bet.spotId, amount: bet.amount });
      bet.chips = decomposeIntoChips(bet.amount * 2, this.denominations());
      bet.amount *= 2;
    }

    this.adjustBalance(-additional);
    this.publishChange();
    return { accepted: true };
  }

  /** Re-place the previous round's wagers. */
  public repeat(): BetResult {
    if (!this.bettingOpen) return this.reject('*', BetRejection.BETTING_CLOSED);
    if (this.lastRoundBets.size === 0) return this.reject('*', BetRejection.NO_PREVIOUS_BETS);

    const required = [...this.lastRoundBets.values()].reduce((sum, bet) => sum + bet.amount, 0);
    if (required > this.balance) return this.reject('*', BetRejection.INSUFFICIENT_FUNDS);

    this.clear();
    for (const bet of this.lastRoundBets.values()) {
      this.placeBet(bet.spotId, bet.amount);
    }
    return { accepted: true };
  }

  /** Sweep the felt and refund every staked chip. */
  public clear(): void {
    const refund = this.getTotalBet();
    this.bets.clear();
    this.history.length = 0;
    if (refund > 0) this.adjustBalance(refund);
    this.publishChange();
  }

  /* --------------------------------------------------------------------- */
  /* Resolution                                                            */
  /* --------------------------------------------------------------------- */

  /**
   * Score the current bets against a winning number.
   *
   * `payout` is stake + profit (what actually returns to the balance), so a
   * winning even-money bet of 100 yields 200. The stake was already debited at
   * placement time, which keeps the running balance honest mid-round.
   */
  public resolve(winningNumber: RouletteNumber): BetResolution[] {
    const winningKey = numberKey(winningNumber);
    const resolutions: BetResolution[] = [];

    for (const bet of this.bets.values()) {
      const won = bet.numbers.some((n) => numberKey(n) === winningKey);
      const odds = this.config.payouts[bet.type] ?? 0;
      resolutions.push({
        spotId: bet.spotId,
        type: bet.type,
        staked: bet.amount,
        payout: won ? bet.amount * (odds + 1) : 0,
        won,
      });
    }
    return resolutions;
  }

  /** Credit winnings and archive the round's bets for `repeat`. */
  public settle(resolutions: readonly BetResolution[]): number {
    const total = resolutions.reduce((sum, resolution) => sum + resolution.payout, 0);
    if (total > 0) this.adjustBalance(total);

    this.lastRoundBets = new Map(
      [...this.bets.entries()].map(([id, bet]) => [id, { ...bet, chips: [...bet.chips] }]),
    );
    return total;
  }

  /** Drop the felt without refunding - the round is over and stakes are spent. */
  public clearAfterRound(): void {
    this.bets.clear();
    this.history.length = 0;
    this.publishChange();
  }

  /* --------------------------------------------------------------------- */
  /* Queries                                                               */
  /* --------------------------------------------------------------------- */

  public getBets(): readonly Bet[] {
    return [...this.bets.values()];
  }

  public getBet(spotId: string): Bet | undefined {
    return this.bets.get(spotId);
  }

  public getTotalBet(): number {
    let total = 0;
    for (const bet of this.bets.values()) total += bet.amount;
    return total;
  }

  public hasBets(): boolean {
    return this.bets.size > 0;
  }

  public canRepeat(): boolean {
    return this.lastRoundBets.size > 0;
  }

  public canUndo(): boolean {
    return this.history.length > 0;
  }

  public getBalance(): number {
    return this.balance;
  }

  /** Authoritative balance from the server. */
  public setBalance(balance: number): void {
    const delta = balance - this.balance;
    this.balance = balance;
    this.bus.emit(GameEvent.BALANCE_CHANGE, { balance, delta });
  }

  /** Reset to a clean slate - used by `Game.reset()`. */
  public resetAll(startingBalance: number): void {
    this.bets.clear();
    this.history.length = 0;
    this.lastRoundBets.clear();
    this.bettingOpen = false;
    this.setBalance(startingBalance);
    this.publishChange();
  }

  /* --------------------------------------------------------------------- */
  /* Internals                                                             */
  /* --------------------------------------------------------------------- */

  /** Per-type table limit, falling back to the global min/max. */
  private limitFor(type: BetType): { min: number; max: number } {
    return this.config.limits[type] ?? { min: this.config.minBet, max: this.config.maxBet };
  }

  private denominations(): number[] {
    return this.config.chips.map((chip) => chip.value);
  }

  private adjustBalance(delta: number): void {
    this.balance += delta;
    this.bus.emit(GameEvent.BALANCE_CHANGE, { balance: this.balance, delta });
  }

  private publishChange(): void {
    this.bus.emit(GameEvent.BETS_CHANGED, { bets: this.getBets(), total: this.getTotalBet() });
  }

  private reject(spotId: string, reason: BetRejection): BetResult {
    this.log.debug(`bet rejected on ${spotId}: ${reason}`);
    this.bus.emit(GameEvent.BET_REJECTED, { spotId, reason });
    return { accepted: false, reason };
  }
}
