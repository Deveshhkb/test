import { TableRules } from "../config/gameConfig";
import { Hand, HandValue, PlayerHand } from "./Hand";

export enum Outcome {
  PLAYER_BLACKJACK = "PLAYER_BLACKJACK",
  PLAYER_WIN = "PLAYER_WIN",
  PLAYER_BUST = "PLAYER_BUST",
  DEALER_WIN = "DEALER_WIN",
  DEALER_BLACKJACK = "DEALER_BLACKJACK",
  PUSH = "PUSH",
}

const BLACKJACK = 21;

/**
 * Every rule decision in one place, driven entirely by {@link TableRules}.
 * Nothing here knows about rendering, betting or animation.
 */
export class BlackjackRules {
  constructor(readonly config: TableRules) {}

  get blackjackValue(): number {
    return BLACKJACK;
  }

  /** Dealer draws below the stand value, and on soft 17 when configured. */
  shouldDealerDraw(value: HandValue): boolean {
    if (value.isBust) return false;
    if (value.value < this.config.dealerStandsOn) return true;
    return (
      this.config.dealerHitsSoft17 &&
      value.isSoft &&
      value.value === this.config.dealerStandsOn
    );
  }

  canHit(hand: PlayerHand): boolean {
    return (
      hand.isActionable &&
      hand.value.value < BLACKJACK &&
      hand.size < this.config.maxCardsPerHand
    );
  }

  /** Doubling is only legal on the opening two cards. Used by the UI layer. */
  canDouble(hand: PlayerHand): boolean {
    return hand.isActionable && hand.size === 2;
  }

  /** Insurance is offered when the dealer's up card is an ace. */
  canOfferInsurance(dealer: Hand): boolean {
    return dealer.size === 2 && dealer.cards[0].rank === "A";
  }

  isNaturalBlackjack(hand: Hand): boolean {
    return hand.value.isBlackjack;
  }

  determineOutcome(player: PlayerHand, dealer: Hand): Outcome {
    const playerValue = player.value;
    const dealerValue = dealer.value;

    if (playerValue.isBust) return Outcome.PLAYER_BUST;

    const playerNatural = playerValue.isBlackjack;
    const dealerNatural = dealerValue.isBlackjack;

    if (playerNatural && dealerNatural) return Outcome.PUSH;
    if (playerNatural) return Outcome.PLAYER_BLACKJACK;
    if (dealerNatural) return Outcome.DEALER_BLACKJACK;

    if (dealerValue.isBust) return Outcome.PLAYER_WIN;
    if (playerValue.value > dealerValue.value) return Outcome.PLAYER_WIN;
    if (playerValue.value < dealerValue.value) return Outcome.DEALER_WIN;
    return Outcome.PUSH;
  }

  /** Total amount returned to the player, stake included. */
  payoutFor(outcome: Outcome, bet: number): number {
    switch (outcome) {
      case Outcome.PLAYER_BLACKJACK:
        return bet * (1 + this.config.blackjackPayout);
      case Outcome.PLAYER_WIN:
        return bet * (1 + this.config.winPayout);
      case Outcome.PUSH:
        return bet;
      case Outcome.PLAYER_BUST:
      case Outcome.DEALER_WIN:
      case Outcome.DEALER_BLACKJACK:
        return 0;
    }
  }

  /** Insurance settlement, kept here so the side bet can be enabled later. */
  insurancePayoutFor(dealer: Hand, insuranceBet: number): number {
    return this.isNaturalBlackjack(dealer)
      ? insuranceBet * (1 + this.config.insurancePayout)
      : 0;
  }
}
