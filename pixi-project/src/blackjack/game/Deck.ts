import { Card, RANKS, SUITS, createCard } from "./Card";

export type RandomSource = () => number;

export interface ShoeOptions {
  deckCount: number;
  /** Reshuffle once this fraction of the shoe has been dealt (0..1). */
  penetration: number;
  random?: RandomSource;
}

/**
 * A shoe of one or more 52-card decks.
 *
 * A single deck is just a shoe with `deckCount: 1`, which keeps the door open
 * for multi-deck / penetration configuration without a second implementation.
 */
export class Shoe {
  private cards: Card[] = [];
  private cursor = 0;
  private readonly random: RandomSource;

  constructor(private readonly options: ShoeOptions) {
    this.random = options.random ?? Math.random;
    this.reset();
  }

  get remaining(): number {
    return this.cards.length - this.cursor;
  }

  get size(): number {
    return this.cards.length;
  }

  /** True once the configured penetration point has been passed. */
  get needsShuffle(): boolean {
    return this.cursor >= this.cards.length * this.options.penetration;
  }

  /** Rebuilds the shoe from scratch and shuffles it. */
  reset(): void {
    const cards: Card[] = [];
    for (let deck = 0; deck < this.options.deckCount; deck += 1) {
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          cards.push(createCard(suit, rank, deck));
        }
      }
    }
    this.cards = cards;
    this.cursor = 0;
    this.shuffle();
  }

  /** Fisher–Yates over the undealt portion of the shoe. */
  shuffle(): void {
    for (let i = this.cards.length - 1; i > this.cursor; i -= 1) {
      const j = this.cursor + Math.floor(this.random() * (i - this.cursor + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /** Draws the next card, rebuilding the shoe first if it has run dry. */
  draw(): Card {
    if (this.remaining === 0) this.reset();
    const card = this.cards[this.cursor];
    this.cursor += 1;
    return card;
  }

  /** Called between rounds so a reshuffle never happens mid-hand. */
  resetIfNeeded(): boolean {
    if (!this.needsShuffle) return false;
    this.reset();
    return true;
  }
}
