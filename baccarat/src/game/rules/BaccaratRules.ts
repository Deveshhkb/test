import type { GameConfig } from "../Config";
import {
  BetType,
  Rank,
  RoundOutcome,
  type BetMap,
  type BetSettlement,
  type CardData,
  type HandSide,
  type HandSnapshot,
  type RoundResult,
} from "../types";

/**
 * Pure, side-effect-free Baccarat rules.
 *
 * Kept deliberately free of Pixi, config mutation and I/O so it can be unit
 * tested, run on a server, or used to validate a result that arrived from one.
 */
export const BaccaratRules = {
  /** Baccarat pip value: ten and court cards are worth nothing, ace is one. */
  cardValue(card: CardData): number {
    return card.rank >= Rank.Ten ? 0 : card.rank;
  },

  /** Hand totals are taken modulo ten — 7 + 8 = 5, never 15. */
  handTotal(cards: readonly CardData[]): number {
    let sum = 0;
    for (const card of cards) sum += BaccaratRules.cardValue(card);
    return sum % 10;
  },

  isNatural(cards: readonly CardData[]): boolean {
    if (cards.length !== 2) return false;
    const total = BaccaratRules.handTotal(cards);
    return total === 8 || total === 9;
  },

  isPair(cards: readonly CardData[]): boolean {
    return cards.length >= 2 && cards[0]!.rank === cards[1]!.rank;
  },

  isPerfectPair(cards: readonly CardData[]): boolean {
    return (
      cards.length >= 2 && cards[0]!.rank === cards[1]!.rank && cards[0]!.suit === cards[1]!.suit
    );
  },

  snapshot(side: HandSide, cards: readonly CardData[]): HandSnapshot {
    return {
      side,
      cards: cards.slice(),
      total: BaccaratRules.handTotal(cards),
      isNatural: BaccaratRules.isNatural(cards),
      isPair: BaccaratRules.isPair(cards),
    };
  },

  /**
   * Player third-card rule: draws on 0–5, stands on 6–7. A natural on either
   * side freezes both hands, which the caller checks before asking.
   */
  playerShouldDraw(playerTotal: number): boolean {
    return playerTotal <= 5;
  },

  /**
   * Banker third-card rule. `playerThird` is null when the player stood.
   *
   * The asymmetric table below is the whole reason live baccarat feels tense:
   * the banker's decision depends on the *value* of the card the player drew.
   */
  bankerShouldDraw(bankerTotal: number, playerThird: CardData | null): boolean {
    if (playerThird === null) return bankerTotal <= 5;

    const v = BaccaratRules.cardValue(playerThird);
    switch (bankerTotal) {
      case 0:
      case 1:
      case 2:
        return true;
      case 3:
        return v !== 8;
      case 4:
        return v >= 2 && v <= 7;
      case 5:
        return v >= 4 && v <= 7;
      case 6:
        return v === 6 || v === 7;
      default:
        return false; // 7, 8, 9 always stand
    }
  },

  outcome(playerTotal: number, bankerTotal: number): RoundOutcome {
    if (playerTotal > bankerTotal) return RoundOutcome.Player;
    if (bankerTotal > playerTotal) return RoundOutcome.Banker;
    return RoundOutcome.Tie;
  },

  /** True when either hand shows a natural on the first two cards. */
  hasNatural(result: Pick<RoundResult, "player" | "banker">): boolean {
    return result.player.isNatural || result.banker.isNatural;
  },

  /**
   * Settles every open wager against a finished round.
   *
   * Returns one settlement per placed bet, with commission already deducted so
   * the payout animation and the balance never disagree.
   */
  settle(bets: BetMap, result: RoundResult, config: GameConfig): BetSettlement[] {
    const settlements: BetSettlement[] = [];
    for (const [key, stake] of Object.entries(bets)) {
      if (!stake || stake <= 0) continue;
      settlements.push(settleOne(key as BetType, stake, result, config));
    }
    return settlements;
  },

  /** Commission owed on a hypothetical winning banker stake. */
  commissionFor(stake: number, config: GameConfig): number {
    if (config.rules.noCommission) return 0;
    return roundMoney(stake * config.payouts[BetType.Banker] * config.rules.bankerCommission);
  },
};

function settleOne(
  betType: BetType,
  stake: number,
  result: RoundResult,
  config: GameConfig,
): BetSettlement {
  const { payouts, rules } = config;

  switch (betType) {
    case BetType.Player: {
      if (result.outcome === RoundOutcome.Tie) return push(betType, stake, rules.pushOnTie);
      const won = result.outcome === RoundOutcome.Player;
      return won
        ? win(betType, stake, roundMoney(stake * payouts[BetType.Player]), 0)
        : lose(betType, stake);
    }

    case BetType.Banker: {
      if (result.outcome === RoundOutcome.Tie) return push(betType, stake, rules.pushOnTie);
      if (result.outcome !== RoundOutcome.Banker) return lose(betType, stake);

      // EZ-style: a banker win on 6 pays short and takes no commission.
      if (rules.noCommission) {
        const odds =
          result.banker.total === 6 ? rules.noCommissionSixPayout : payouts[BetType.Banker];
        return win(betType, stake, roundMoney(stake * odds), 0);
      }
      const gross = roundMoney(stake * payouts[BetType.Banker]);
      const commission = roundMoney(gross * rules.bankerCommission);
      return win(betType, stake, gross - commission, commission);
    }

    case BetType.Tie: {
      return result.outcome === RoundOutcome.Tie
        ? win(betType, stake, roundMoney(stake * payouts[BetType.Tie]), 0)
        : lose(betType, stake);
    }

    case BetType.PlayerPair: {
      return result.playerPair
        ? win(betType, stake, roundMoney(stake * payouts[BetType.PlayerPair]), 0)
        : lose(betType, stake);
    }

    case BetType.BankerPair: {
      return result.bankerPair
        ? win(betType, stake, roundMoney(stake * payouts[BetType.BankerPair]), 0)
        : lose(betType, stake);
    }

    case BetType.Natural: {
      return result.natural
        ? win(betType, stake, roundMoney(stake * payouts[BetType.Natural]), 0)
        : lose(betType, stake);
    }

    case BetType.PerfectPair: {
      // Pays per hand: a perfect (suited) pair at full odds, a mixed pair short.
      const perfect =
        (BaccaratRules.isPerfectPair(result.player.cards) ? 1 : 0) +
        (BaccaratRules.isPerfectPair(result.banker.cards) ? 1 : 0);
      const mixed =
        (result.playerPair && !BaccaratRules.isPerfectPair(result.player.cards) ? 1 : 0) +
        (result.bankerPair && !BaccaratRules.isPerfectPair(result.banker.cards) ? 1 : 0);

      if (perfect === 0 && mixed === 0) return lose(betType, stake);
      const profit = roundMoney(
        stake * (perfect * payouts[BetType.PerfectPair] + mixed * rules.perfectPairMixed),
      );
      return win(betType, stake, profit, 0);
    }

    default:
      return lose(betType, stake);
  }
}

function win(
  betType: BetType,
  stake: number,
  profit: number,
  commission: number,
): BetSettlement {
  return { betType, stake, won: true, profit, returned: stake + profit, commission };
}

function lose(betType: BetType, stake: number): BetSettlement {
  return { betType, stake, won: false, profit: -stake, returned: 0, commission: 0 };
}

function push(betType: BetType, stake: number, pushEnabled: boolean): BetSettlement {
  return pushEnabled
    ? { betType, stake, won: null, profit: 0, returned: stake, commission: 0 }
    : lose(betType, stake);
}

/** Money is kept in whole minor units to avoid float drift in the ledger. */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
