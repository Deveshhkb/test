import { Card, isAce } from "./Card";

export interface HandValue {
  /** Best total that does not bust, or the hard total when busted. */
  value: number;
  /** True when an ace is still being counted as 11. */
  isSoft: boolean;
  isBlackjack: boolean;
  isBust: boolean;
  /** Total with every ace counted as 1; useful for dealer soft-17 rules. */
  hard: number;
}

/**
 * Pure hand evaluation. Aces count as 1 and are promoted to 11 only while the
 * hand stays at or below 21, which yields the standard soft/hard behaviour:
 *   A + K       -> 21 (blackjack)
 *   A + 5       -> 16 soft
 *   A + 5 + 10  -> 16 hard
 *   A + A       -> 12 soft
 */
export function evaluateHand(cards: readonly Card[]): HandValue {
  let hard = 0;
  let aces = 0;

  for (const card of cards) {
    hard += card.value;
    if (isAce(card)) aces += 1;
  }

  const canPromote = aces > 0 && hard + 10 <= 21;
  const value = canPromote ? hard + 10 : hard;

  return {
    value,
    hard,
    isSoft: canPromote,
    isBlackjack: cards.length === 2 && value === 21,
    isBust: value > 21,
  };
}

export enum HandStatus {
  ACTIVE = "ACTIVE",
  STANDING = "STANDING",
  BUST = "BUST",
  BLACKJACK = "BLACKJACK",
}

/** A collection of cards plus its cached evaluation. */
export class Hand {
  protected readonly cardList: Card[] = [];
  private cachedValue: HandValue = evaluateHand([]);

  get cards(): readonly Card[] {
    return this.cardList;
  }

  get size(): number {
    return this.cardList.length;
  }

  get value(): HandValue {
    return this.cachedValue;
  }

  add(card: Card): void {
    this.cardList.push(card);
    this.cachedValue = evaluateHand(this.cardList);
  }

  clear(): void {
    this.cardList.length = 0;
    this.cachedValue = evaluateHand(this.cardList);
  }
}

/** A hand owned by a seat: carries the wager and the player's decision state. */
export class PlayerHand extends Hand {
  status: HandStatus = HandStatus.ACTIVE;

  constructor(
    readonly seatId: number,
    public bet: number,
  ) {
    super();
  }

  /** True while the seat may still act (not standing, bust or blackjack). */
  get isActionable(): boolean {
    return this.status === HandStatus.ACTIVE;
  }

  /** True when the hand still competes against the dealer at settlement. */
  get isLive(): boolean {
    return this.status !== HandStatus.BUST;
  }

  add(card: Card): void {
    super.add(card);
    this.refreshStatus();
  }

  stand(): void {
    if (this.status === HandStatus.ACTIVE) this.status = HandStatus.STANDING;
  }

  private refreshStatus(): void {
    if (this.value.isBust) {
      this.status = HandStatus.BUST;
    } else if (this.value.isBlackjack) {
      this.status = HandStatus.BLACKJACK;
    }
  }
}
