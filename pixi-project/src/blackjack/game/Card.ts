export const SUITS = ["spades", "hearts", "diamonds", "clubs"] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
  readonly id: string;
  readonly suit: Suit;
  readonly rank: Rank;
  /** Blackjack value. Aces are stored as 1 and promoted by the evaluator. */
  readonly value: number;
}

const RANK_VALUES: Readonly<Record<Rank, number>> = {
  A: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 10,
  Q: 10,
  K: 10,
};

export const SUIT_SYMBOLS: Readonly<Record<Suit, string>> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

export function isRedSuit(suit: Suit): boolean {
  return suit === "hearts" || suit === "diamonds";
}

export function isAce(card: Card): boolean {
  return card.rank === "A";
}

/**
 * Creates a card. `copy` distinguishes otherwise identical cards coming from
 * different decks of the same shoe, keeping every id unique.
 */
export function createCard(suit: Suit, rank: Rank, copy = 0): Card {
  return {
    id: `${rank}-${suit}-${copy}`,
    suit,
    rank,
    value: RANK_VALUES[rank],
  };
}
