import { BlackjackRules } from "./BlackjackRules";
import { Card } from "./Card";
import { Shoe } from "./Deck";
import { Hand, HandStatus, PlayerHand } from "./Hand";
import { RoundSettlement, SettlementManager } from "./SettlementManager";

export interface SeatBet {
  seatId: number;
  amount: number;
}

export type DealTarget = { kind: "dealer" } | { kind: "seat"; seatId: number };

/** One card leaving the shoe, described so the view can replay the deal. */
export interface DealtCard {
  target: DealTarget;
  card: Card;
  faceDown: boolean;
  /** Index of the card inside its hand, for layout. */
  handIndex: number;
}

export interface HitResult {
  seatId: number;
  card: Card;
  hand: PlayerHand;
  busted: boolean;
  reachedLimit: boolean;
}

/**
 * The rules-driven round runner. It owns the shoe, the hands and the order of
 * play, and exposes the round as a sequence of discrete steps so the
 * presentation layer can animate each one without duplicating any logic.
 *
 * The engine has no knowledge of Pixi, GSAP, money formatting or layout.
 */
export class BlackjackEngine {
  private readonly dealer = new Hand();
  private hands: PlayerHand[] = [];
  private activeIndex = -1;
  private holeCardRevealed = false;
  private roundInProgress = false;

  constructor(
    private readonly rules: BlackjackRules,
    private readonly shoe: Shoe,
    private readonly settlement: SettlementManager,
  ) {}

  get dealerHand(): Hand {
    return this.dealer;
  }

  get playerHands(): readonly PlayerHand[] {
    return this.hands;
  }

  get isRoundInProgress(): boolean {
    return this.roundInProgress;
  }

  get isHoleCardRevealed(): boolean {
    return this.holeCardRevealed;
  }

  /** The seat currently entitled to act, or null when the player phase is over. */
  get activeHand(): PlayerHand | null {
    return this.hands[this.activeIndex] ?? null;
  }

  handForSeat(seatId: number): PlayerHand | undefined {
    return this.hands.find((hand) => hand.seatId === seatId);
  }

  /**
   * Starts a round and returns the opening deal in dealing order:
   * one card to each seat, one to the dealer, a second to each seat, then the
   * dealer's face-down hole card.
   */
  startRound(bets: readonly SeatBet[]): DealtCard[] {
    if (this.roundInProgress) {
      throw new Error("startRound called while a round is already running");
    }
    if (bets.length === 0) {
      throw new Error("startRound requires at least one bet");
    }

    this.shoe.resetIfNeeded();
    this.dealer.clear();
    this.hands = bets.map((bet) => new PlayerHand(bet.seatId, bet.amount));
    this.activeIndex = -1;
    this.holeCardRevealed = false;
    this.roundInProgress = true;

    const sequence: DealtCard[] = [];
    for (let pass = 0; pass < 2; pass += 1) {
      for (const hand of this.hands) {
        sequence.push(
          this.dealTo({ kind: "seat", seatId: hand.seatId }, hand, false),
        );
      }
      const faceDown = pass === 1;
      sequence.push(this.dealTo({ kind: "dealer" }, this.dealer, faceDown));
    }

    return sequence;
  }

  /** True when the dealer's up card and hole card form a natural blackjack. */
  get dealerHasBlackjack(): boolean {
    return this.dealer.size === 2 && this.dealer.value.isBlackjack;
  }

  /**
   * Selects the first seat that may act. Hands that cannot act (naturals, or
   * hands already at 21) are stood automatically.
   *
   * @returns the hand that should act, or null when the player phase is over.
   */
  beginPlayerPhase(): PlayerHand | null {
    if (this.dealerHasBlackjack) {
      this.standAllRemaining();
      this.activeIndex = -1;
      return null;
    }
    this.activeIndex = -1;
    return this.advanceToNextHand();
  }

  /** Moves play to the next actionable seat. */
  advanceToNextHand(): PlayerHand | null {
    for (let i = this.activeIndex + 1; i < this.hands.length; i += 1) {
      const hand = this.hands[i];
      if (!hand.isActionable) continue;
      if (!this.rules.canHit(hand)) {
        hand.stand();
        continue;
      }
      this.activeIndex = i;
      return hand;
    }
    this.activeIndex = -1;
    return null;
  }

  canHitActiveHand(): boolean {
    const hand = this.activeHand;
    return hand !== null && this.rules.canHit(hand);
  }

  canDoubleActiveHand(): boolean {
    const hand = this.activeHand;
    return hand !== null && this.rules.canDouble(hand);
  }

  /** Draws one card for the acting seat. */
  hit(): HitResult {
    const hand = this.activeHand;
    if (!hand) throw new Error("hit called with no active hand");
    if (!this.rules.canHit(hand))
      throw new Error("hit is not legal for this hand");

    const card = this.shoe.draw();
    hand.add(card);

    const reachedLimit = !this.rules.canHit(hand);
    if (reachedLimit && hand.status === HandStatus.ACTIVE) hand.stand();

    return {
      seatId: hand.seatId,
      card,
      hand,
      busted: hand.value.isBust,
      reachedLimit,
    };
  }

  /** Ends the acting seat's turn. */
  stand(): PlayerHand {
    const hand = this.activeHand;
    if (!hand) throw new Error("stand called with no active hand");
    hand.stand();
    return hand;
  }

  /** True when at least one hand still needs the dealer to play. */
  get dealerMustPlay(): boolean {
    if (this.dealerHasBlackjack) return false;
    return this.hands.some((hand) => hand.isLive && !hand.value.isBlackjack);
  }

  /** Marks the hole card as exposed and returns it. */
  revealHoleCard(): Card {
    this.holeCardRevealed = true;
    return this.dealer.cards[1];
  }

  dealerShouldDraw(): boolean {
    if (!this.dealerMustPlay) return false;
    return this.rules.shouldDealerDraw(this.dealer.value);
  }

  dealerDraw(): Card {
    const card = this.shoe.draw();
    this.dealer.add(card);
    return card;
  }

  settle(): RoundSettlement {
    if (!this.roundInProgress) throw new Error("settle called outside a round");
    return this.settlement.settleRound(this.hands, this.dealer);
  }

  /** Closes the round so a new one may start. Hands stay readable for the view. */
  endRound(): void {
    this.roundInProgress = false;
    this.activeIndex = -1;
  }

  private standAllRemaining(): void {
    for (const hand of this.hands) hand.stand();
  }

  private dealTo(target: DealTarget, hand: Hand, faceDown: boolean): DealtCard {
    const card = this.shoe.draw();
    hand.add(card);
    return { target, card, faceDown, handIndex: hand.size - 1 };
  }
}
