import { BettingConfig } from "../config/gameConfig";
import { EventEmitter } from "../core/EventEmitter";
import { SeatBet } from "./BlackjackEngine";

export enum BetRejection {
  BELOW_MINIMUM = "BELOW_MINIMUM",
  ABOVE_MAXIMUM = "ABOVE_MAXIMUM",
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  NO_BET_PLACED = "NO_BET_PLACED",
  NOTHING_TO_REPEAT = "NOTHING_TO_REPEAT",
}

export interface BetSnapshot {
  balance: number;
  totalBet: number;
  seatBets: ReadonlyMap<number, number>;
  selectedChip: number;
}

interface BetEvents {
  change: BetSnapshot;
  rejected: { reason: BetRejection; seatId?: number };
  chipPlaced: { seatId: number; chip: number; total: number };
  chipRemoved: { seatId: number; chip: number; total: number };
  balanceChanged: { balance: number; delta: number };
}

/**
 * Owns the player's money: balance, per-seat wagers, the selected chip and the
 * repeat-bet memory. Stakes leave the balance the moment a chip is placed and
 * come back when it is removed, so the balance can never go negative.
 */
export class BetManager extends EventEmitter<BetEvents> {
  private balanceValue: number;
  private selectedChipValue: number;
  /** Chips currently sitting on each seat, in placement order. */
  private readonly stacks = new Map<number, number[]>();
  /** Snapshot of the last committed round, used by "repeat bet". */
  private lastCommitted: SeatBet[] = [];

  constructor(
    private readonly config: BettingConfig,
    private readonly seatIds: readonly number[],
  ) {
    super();
    this.balanceValue = config.startingBalance;
    this.selectedChipValue = config.chipValues[0];
    for (const seatId of seatIds) this.stacks.set(seatId, []);
  }

  get balance(): number {
    return this.balanceValue;
  }

  get selectedChip(): number {
    return this.selectedChipValue;
  }

  get totalBet(): number {
    let total = 0;
    for (const stack of this.stacks.values()) total += sum(stack);
    return total;
  }

  get hasBet(): boolean {
    return this.totalBet > 0;
  }

  get canRepeat(): boolean {
    return this.lastCommitted.length > 0;
  }

  betForSeat(seatId: number): number {
    return sum(this.stacks.get(seatId) ?? []);
  }

  chipsForSeat(seatId: number): readonly number[] {
    return this.stacks.get(seatId) ?? [];
  }

  snapshot(): BetSnapshot {
    const seatBets = new Map<number, number>();
    for (const seatId of this.seatIds)
      seatBets.set(seatId, this.betForSeat(seatId));
    return {
      balance: this.balanceValue,
      totalBet: this.totalBet,
      seatBets,
      selectedChip: this.selectedChipValue,
    };
  }

  selectChip(value: number): boolean {
    if (!this.config.chipValues.includes(value)) return false;
    if (value === this.selectedChipValue) return false;
    this.selectedChipValue = value;
    this.emitChange();
    return true;
  }

  /** Steps the selected denomination up (+1) or down (-1). */
  stepChip(direction: 1 | -1): boolean {
    const values = this.config.chipValues;
    const index = values.indexOf(this.selectedChipValue);
    const next = index + direction;
    if (next < 0 || next >= values.length) return false;
    return this.selectChip(values[next]);
  }

  /** True when the next chip could legally be added to this seat. */
  canPlace(seatId: number, amount = this.selectedChipValue): boolean {
    return this.validatePlacement(seatId, amount) === null;
  }

  placeChip(seatId: number, amount = this.selectedChipValue): boolean {
    const rejection = this.validatePlacement(seatId, amount);
    if (rejection !== null) {
      this.emit("rejected", { reason: rejection, seatId });
      return false;
    }

    this.stacks.get(seatId)!.push(amount);
    this.adjustBalance(-amount);
    this.emit("chipPlaced", {
      seatId,
      chip: amount,
      total: this.betForSeat(seatId),
    });
    this.emitChange();
    return true;
  }

  /** Takes the top chip back off a seat and refunds it. */
  removeChip(seatId: number): number | null {
    const stack = this.stacks.get(seatId);
    if (!stack || stack.length === 0) return null;

    const chip = stack.pop()!;
    this.adjustBalance(chip);
    this.emit("chipRemoved", { seatId, chip, total: this.betForSeat(seatId) });
    this.emitChange();
    return chip;
  }

  /** Refunds every unconfirmed chip on the table. */
  clearBets(): boolean {
    if (!this.hasBet) return false;
    let refund = 0;
    for (const stack of this.stacks.values()) {
      refund += sum(stack);
      stack.length = 0;
    }
    this.adjustBalance(refund);
    this.emitChange();
    return true;
  }

  /**
   * Restores the previous round's wagers. Seats that no longer fit inside the
   * balance are skipped rather than failing the whole action.
   */
  repeatBets(): boolean {
    if (!this.canRepeat) {
      this.emit("rejected", { reason: BetRejection.NOTHING_TO_REPEAT });
      return false;
    }
    if (this.hasBet) this.clearBets();

    let placedAny = false;
    for (const bet of this.lastCommitted) {
      for (const chip of this.splitIntoChips(bet.amount)) {
        if (this.validatePlacement(bet.seatId, chip) !== null) break;
        this.stacks.get(bet.seatId)!.push(chip);
        this.adjustBalance(-chip);
        placedAny = true;
      }
    }

    if (!placedAny) {
      this.emit("rejected", { reason: BetRejection.INSUFFICIENT_FUNDS });
      return false;
    }
    this.emitChange();
    return true;
  }

  /** Validates the table state and locks the wagers in for the round. */
  commit(): SeatBet[] | BetRejection {
    const bets: SeatBet[] = [];
    for (const seatId of this.seatIds) {
      const amount = this.betForSeat(seatId);
      if (amount === 0) continue;
      if (amount < this.config.minBet) return BetRejection.BELOW_MINIMUM;
      if (amount > this.config.maxBet) return BetRejection.ABOVE_MAXIMUM;
      bets.push({ seatId, amount });
    }
    if (bets.length === 0) return BetRejection.NO_BET_PLACED;

    this.lastCommitted = bets.map((bet) => ({ ...bet }));
    return bets;
  }

  /** Pays a settled hand back into the balance. */
  credit(amount: number): void {
    if (amount <= 0) return;
    this.adjustBalance(amount);
    this.emitChange();
  }

  /** Clears the felt after settlement without refunding anything. */
  clearTable(): void {
    for (const stack of this.stacks.values()) stack.length = 0;
    this.emitChange();
  }

  private validatePlacement(
    seatId: number,
    amount: number,
  ): BetRejection | null {
    if (!this.stacks.has(seatId)) return BetRejection.NO_BET_PLACED;
    if (amount <= 0 || amount < this.config.minBet)
      return BetRejection.BELOW_MINIMUM;
    if (amount > this.balanceValue) return BetRejection.INSUFFICIENT_FUNDS;
    if (this.betForSeat(seatId) + amount > this.config.maxBet) {
      return BetRejection.ABOVE_MAXIMUM;
    }
    return null;
  }

  /** Expresses an amount as the largest available chips, for repeat-bet stacks. */
  private splitIntoChips(amount: number): number[] {
    const chips: number[] = [];
    let remaining = amount;
    const descending = [...this.config.chipValues].sort((a, b) => b - a);
    for (const value of descending) {
      while (remaining >= value) {
        chips.push(value);
        remaining -= value;
      }
    }
    return chips;
  }

  private adjustBalance(delta: number): void {
    this.balanceValue = Math.max(0, this.balanceValue + delta);
    this.emit("balanceChanged", { balance: this.balanceValue, delta });
  }

  private emitChange(): void {
    this.emit("change", this.snapshot());
  }
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
