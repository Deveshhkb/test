import { describe, expect, it } from "vitest";

import { createConfig } from "../Config";
import {
  BetType,
  HandSide,
  Rank,
  RoundOutcome,
  Suit,
  type BetMap,
  type CardData,
  type RoundResult,
} from "../types";
import { BaccaratRules } from "./BaccaratRules";

const card = (rank: Rank, suit: Suit = Suit.Spades): CardData => ({ rank, suit });

function makeResult(
  player: CardData[],
  banker: CardData[],
  overrides: Partial<RoundResult> = {},
): RoundResult {
  const p = BaccaratRules.snapshot(HandSide.Player, player);
  const b = BaccaratRules.snapshot(HandSide.Banker, banker);
  return {
    roundId: "r1",
    shoeId: "s1",
    player: p,
    banker: b,
    outcome: BaccaratRules.outcome(p.total, b.total),
    playerPair: p.isPair,
    bankerPair: b.isPair,
    perfectPair:
      BaccaratRules.isPerfectPair(player) || BaccaratRules.isPerfectPair(banker),
    natural: p.isNatural || b.isNatural,
    dealSequence: [],
    ...overrides,
  };
}

describe("card values", () => {
  it("scores ten and court cards as zero", () => {
    for (const rank of [Rank.Ten, Rank.Jack, Rank.Queen, Rank.King]) {
      expect(BaccaratRules.cardValue(card(rank))).toBe(0);
    }
  });

  it("scores ace as one and pips at face value", () => {
    expect(BaccaratRules.cardValue(card(Rank.Ace))).toBe(1);
    expect(BaccaratRules.cardValue(card(Rank.Seven))).toBe(7);
  });

  it("takes hand totals modulo ten", () => {
    expect(BaccaratRules.handTotal([card(Rank.Seven), card(Rank.Eight)])).toBe(5);
    expect(BaccaratRules.handTotal([card(Rank.Nine), card(Rank.King)])).toBe(9);
    expect(BaccaratRules.handTotal([card(Rank.Five), card(Rank.Five)])).toBe(0);
  });
});

describe("player third-card rule", () => {
  it("draws on 0 through 5 and stands on 6 and 7", () => {
    for (let total = 0; total <= 5; total++) {
      expect(BaccaratRules.playerShouldDraw(total)).toBe(true);
    }
    expect(BaccaratRules.playerShouldDraw(6)).toBe(false);
    expect(BaccaratRules.playerShouldDraw(7)).toBe(false);
  });
});

describe("banker third-card rule", () => {
  it("draws on 0-5 and stands on 6-7 when the player stood", () => {
    for (let total = 0; total <= 5; total++) {
      expect(BaccaratRules.bankerShouldDraw(total, null)).toBe(true);
    }
    expect(BaccaratRules.bankerShouldDraw(6, null)).toBe(false);
    expect(BaccaratRules.bankerShouldDraw(7, null)).toBe(false);
  });

  /**
   * The canonical table, indexed [bankerTotal][playerThirdCardValue 0..9].
   * This is the single most error-prone rule in the game, so it is asserted
   * cell by cell rather than by re-implementing the logic.
   */
  it("matches the canonical table when the player drew", () => {
    const D = true;
    const S = false;
    const table: Record<number, boolean[]> = {
      //     0  1  2  3  4  5  6  7  8  9
      0: [D, D, D, D, D, D, D, D, D, D],
      1: [D, D, D, D, D, D, D, D, D, D],
      2: [D, D, D, D, D, D, D, D, D, D],
      3: [D, D, D, D, D, D, D, D, S, D],
      4: [S, S, D, D, D, D, D, D, S, S],
      5: [S, S, S, S, D, D, D, D, S, S],
      6: [S, S, S, S, S, S, D, D, S, S],
      7: [S, S, S, S, S, S, S, S, S, S],
    };

    // Rank that produces each pip value 0..9 as a player third card.
    const rankForValue: Record<number, Rank> = {
      0: Rank.Ten,
      1: Rank.Ace,
      2: Rank.Two,
      3: Rank.Three,
      4: Rank.Four,
      5: Rank.Five,
      6: Rank.Six,
      7: Rank.Seven,
      8: Rank.Eight,
      9: Rank.Nine,
    };

    for (const [bankerTotal, expectations] of Object.entries(table)) {
      expectations.forEach((expected, value) => {
        const third = card(rankForValue[value]!);
        expect(
          BaccaratRules.bankerShouldDraw(Number(bankerTotal), third),
          `banker ${bankerTotal} vs player third ${value}`,
        ).toBe(expected);
      });
    }
  });
});

describe("naturals and pairs", () => {
  it("recognises a natural only on the first two cards", () => {
    expect(BaccaratRules.isNatural([card(Rank.Nine), card(Rank.King)])).toBe(true);
    expect(BaccaratRules.isNatural([card(Rank.Four), card(Rank.Four)])).toBe(true);
    expect(BaccaratRules.isNatural([card(Rank.Seven), card(Rank.King)])).toBe(false);
    // Three cards totalling 9 is not a natural.
    expect(
      BaccaratRules.isNatural([card(Rank.Two), card(Rank.Three), card(Rank.Four)]),
    ).toBe(false);
  });

  it("distinguishes a perfect pair from a mixed pair", () => {
    const mixed = [card(Rank.Nine, Suit.Spades), card(Rank.Nine, Suit.Hearts)];
    const perfect = [card(Rank.Nine, Suit.Clubs), card(Rank.Nine, Suit.Clubs)];
    expect(BaccaratRules.isPair(mixed)).toBe(true);
    expect(BaccaratRules.isPerfectPair(mixed)).toBe(false);
    expect(BaccaratRules.isPerfectPair(perfect)).toBe(true);
  });
});

describe("settlement", () => {
  const config = createConfig();

  it("pays the player line at even money", () => {
    const result = makeResult(
      [card(Rank.Nine), card(Rank.King)],
      [card(Rank.Two), card(Rank.King)],
    );
    const bets: BetMap = { [BetType.Player]: 1000 };
    const [settlement] = BaccaratRules.settle(bets, result, config);
    expect(settlement?.won).toBe(true);
    expect(settlement?.profit).toBe(1000);
    expect(settlement?.returned).toBe(2000);
  });

  it("withholds 5% commission on a banker win", () => {
    const result = makeResult(
      [card(Rank.Two), card(Rank.King)],
      [card(Rank.Nine), card(Rank.King)],
    );
    const bets: BetMap = { [BetType.Banker]: 1000 };
    const [settlement] = BaccaratRules.settle(bets, result, config);
    expect(settlement?.won).toBe(true);
    expect(settlement?.commission).toBe(50);
    expect(settlement?.profit).toBe(950);
    expect(settlement?.returned).toBe(1950);
  });

  it("pays banker 1:2 with no commission under EZ rules on a 6", () => {
    const ez = createConfig({ rules: { noCommission: true } });
    const result = makeResult(
      [card(Rank.Five), card(Rank.King)],
      [card(Rank.Six), card(Rank.King)],
    );
    const [settlement] = BaccaratRules.settle({ [BetType.Banker]: 1000 }, result, ez);
    expect(settlement?.commission).toBe(0);
    expect(settlement?.profit).toBe(500);
  });

  it("pushes the main lines on a tie and pays the tie bet", () => {
    const result = makeResult(
      [card(Rank.Seven), card(Rank.King)],
      [card(Rank.Seven, Suit.Hearts), card(Rank.Queen)],
    );
    expect(result.outcome).toBe(RoundOutcome.Tie);

    const settlements = BaccaratRules.settle(
      { [BetType.Player]: 1000, [BetType.Banker]: 500, [BetType.Tie]: 100 },
      result,
      config,
    );
    const byType = Object.fromEntries(settlements.map((s) => [s.betType, s]));

    expect(byType[BetType.Player]?.won).toBeNull();
    expect(byType[BetType.Player]?.returned).toBe(1000);
    expect(byType[BetType.Banker]?.returned).toBe(500);
    expect(byType[BetType.Tie]?.profit).toBe(800);
  });

  it("loses the main lines on a tie when the table does not push", () => {
    const noPush = createConfig({ rules: { pushOnTie: false } });
    const result = makeResult(
      [card(Rank.Seven), card(Rank.King)],
      [card(Rank.Seven, Suit.Hearts), card(Rank.Queen)],
    );
    const [settlement] = BaccaratRules.settle({ [BetType.Player]: 1000 }, result, noPush);
    expect(settlement?.won).toBe(false);
    expect(settlement?.returned).toBe(0);
  });

  it("pays perfect pairs per hand, mixed pairs at short odds", () => {
    const result = makeResult(
      [card(Rank.Four, Suit.Hearts), card(Rank.Four, Suit.Hearts)], // perfect
      [card(Rank.King, Suit.Spades), card(Rank.King, Suit.Clubs)], // mixed
    );
    const [settlement] = BaccaratRules.settle({ [BetType.PerfectPair]: 100 }, result, config);
    // 25:1 for the perfect pair plus 5:1 for the mixed one.
    expect(settlement?.profit).toBe(100 * 25 + 100 * 5);
  });

  it("pays the natural side bet when either hand is natural", () => {
    // Eight plus a court card is a natural eight.
    const result = makeResult(
      [card(Rank.Eight), card(Rank.King)],
      [card(Rank.Two), card(Rank.Three)],
    );
    const [settlement] = BaccaratRules.settle({ [BetType.Natural]: 100 }, result, config);
    expect(settlement?.won).toBe(true);
    expect(settlement?.profit).toBe(800);
  });

  it("ignores zero-value wagers", () => {
    const result = makeResult(
      [card(Rank.Nine), card(Rank.King)],
      [card(Rank.Two), card(Rank.King)],
    );
    expect(BaccaratRules.settle({ [BetType.Player]: 0 }, result, config)).toHaveLength(0);
  });
});
