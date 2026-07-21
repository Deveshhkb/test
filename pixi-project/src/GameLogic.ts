// --- Types and Enums ---
export enum Suit {
  Clubs = "Clubs",
  Diamonds = "Diamonds",
  Hearts = "Hearts",
  Spades = "Spades"
}

export enum Rank {
  Ace = 1,
  Two,
  Three,
  Four,
  Five,
  Six,
  Seven,
  Eight,
  Nine,
  Ten,
  Jack,
  Queen,
  King
}

export interface CardInfo {
  rank: Rank;
  suit: Suit;
  filename: string;
}

export type Winner = "dragon" | "tiger" | "tie";

// --- Helper Map for Filenames ---
const RankToName: Record<Rank, string> = {
  [Rank.Ace]: "Ace",
  [Rank.Two]: "2",
  [Rank.Three]: "3",
  [Rank.Four]: "4",
  [Rank.Five]: "5",
  [Rank.Six]: "6",
  [Rank.Seven]: "7",
  [Rank.Eight]: "8",
  [Rank.Nine]: "9",
  [Rank.Ten]: "10",
  [Rank.Jack]: "Jack",
  [Rank.Queen]: "Queen",
  [Rank.King]: "King",
};

// --- Deck Class ---
export class Deck {
  private cards: CardInfo[] = [];

  constructor() {
    this.resetDeck();
  }

  private resetDeck() {
    this.cards = [];
    for (const suit of Object.values(Suit)) {
      for (const rank of Object.values(Rank).filter(r => typeof r === "number") as number[]) {
        const name = RankToName[rank as Rank] + suit + ".png"; // ✅ fixed name
        this.cards.push({ rank: rank as Rank, suit: suit as Suit, filename: name });
      }
    }
    this.shuffle();
  }

  private shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  public drawCard(): CardInfo {
    if (this.cards.length === 0) this.resetDeck();
    return this.cards.pop()!;
  }
}

// --- Round Logic ---
export class DragonTigerRound {
  private deck: Deck;

  constructor(deck: Deck) {
    this.deck = deck;
  }

  public playRound(): { dragon: CardInfo; tiger: CardInfo; winner: Winner } {
    const dragonCard = this.deck.drawCard();
    const tigerCard = this.deck.drawCard();
    const winner = this.determineWinner(dragonCard, tigerCard);
    return { dragon: dragonCard, tiger: tigerCard, winner };
  }

  private determineWinner(dragon: CardInfo, tiger: CardInfo): Winner {
    if (dragon.rank > tiger.rank) return "dragon";
    if (tiger.rank > dragon.rank) return "tiger";
    return "tie";
  }
}
