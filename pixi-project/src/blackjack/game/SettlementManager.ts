import { BlackjackRules, Outcome } from "./BlackjackRules";
import { Hand, PlayerHand } from "./Hand";

export interface SettlementResult {
  seatId: number;
  outcome: Outcome;
  bet: number;
  /** Amount returned to the balance, stake included. */
  payout: number;
  /** payout - bet: positive on a win, negative on a loss, zero on a push. */
  netProfit: number;
}

export interface RoundSettlement {
  results: SettlementResult[];
  totalBet: number;
  totalPayout: number;
  totalNet: number;
}

/**
 * Turns finished hands into money. This is the only place payouts are
 * computed; the UI merely renders whatever it is handed.
 */
export class SettlementManager {
  constructor(private readonly rules: BlackjackRules) {}

  settleRound(hands: readonly PlayerHand[], dealer: Hand): RoundSettlement {
    const results = hands.map((hand) => this.settleHand(hand, dealer));

    return results.reduce<RoundSettlement>(
      (summary, result) => {
        summary.totalBet += result.bet;
        summary.totalPayout += result.payout;
        summary.totalNet += result.netProfit;
        return summary;
      },
      { results, totalBet: 0, totalPayout: 0, totalNet: 0 },
    );
  }

  private settleHand(hand: PlayerHand, dealer: Hand): SettlementResult {
    const outcome = this.rules.determineOutcome(hand, dealer);
    const payout = this.rules.payoutFor(outcome, hand.bet);

    return {
      seatId: hand.seatId,
      outcome,
      bet: hand.bet,
      payout,
      netProfit: payout - hand.bet,
    };
  }
}
