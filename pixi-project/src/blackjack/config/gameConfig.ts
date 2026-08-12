/**
 * Central configuration for the Blackjack game.
 *
 * Every tunable number the game depends on lives here so that rules, economy
 * and presentation can be changed without touching gameplay or view code.
 */

export interface TableRules {
  /** Number of 52-card decks in the shoe. */
  deckCount: number;
  /** Reshuffle once this fraction of the shoe has been dealt. */
  shoePenetration: number;
  /** Dealer must keep drawing while the hand total is below this value. */
  dealerStandsOn: number;
  /** Whether the dealer draws on a soft 17 (A + 6). */
  dealerHitsSoft17: boolean;
  /** Multiplier applied to the bet for a natural blackjack (3:2 => 1.5). */
  blackjackPayout: number;
  /** Multiplier applied to the bet for a regular win (1:1 => 1). */
  winPayout: number;
  /** Insurance side bet payout (2:1). Wired into the rules layer for later use. */
  insurancePayout: number;
  /** Maximum cards a single hand may hold before it is forced to stand. */
  maxCardsPerHand: number;
}

export interface BettingConfig {
  startingBalance: number;
  minBet: number;
  maxBet: number;
  /** Chip denominations offered on the chip rail, ascending. */
  chipValues: number[];
  currencySymbol: string;
  currencyLocale: string;
}

export interface SeatConfig {
  id: number;
  /** Seat centre in design-space coordinates. */
  x: number;
  y: number;
}

export interface TimingConfig {
  /** Duration of a single card travelling from the shoe to a hand. */
  cardDeal: number;
  /** Delay between two consecutive cards in the opening deal. */
  cardDealStagger: number;
  cardFlip: number;
  chipPlace: number;
  /** Pause before the dealer reveals the hole card. */
  dealerRevealDelay: number;
  /** Pause between two dealer draws. */
  dealerDrawDelay: number;
  /** How long the result banner stays on screen before controls return. */
  resultHold: number;
  buttonPress: number;
}

export interface CardLayoutConfig {
  width: number;
  height: number;
  /** Preferred horizontal step between two cards of the same hand. */
  spread: number;
  /** Vertical step, produces the classic staircase fan. */
  stagger: number;
  /** Rotation added per card, in degrees. */
  rotationStep: number;
  /** Hard limit for the horizontal footprint of one hand. */
  maxSpan: number;
}

/** Virtual resolution every layout coordinate is expressed in. */
export const DESIGN_WIDTH = 1780;
export const DESIGN_HEIGHT = 994;

export const RULES: TableRules = {
  deckCount: 6,
  shoePenetration: 0.75,
  dealerStandsOn: 17,
  dealerHitsSoft17: false,
  blackjackPayout: 1.5,
  winPayout: 1,
  insurancePayout: 2,
  maxCardsPerHand: 11,
};

export const BETTING: BettingConfig = {
  startingBalance: 100_000,
  minBet: 1,
  maxBet: 500,
  chipValues: [1, 5, 10, 25, 50, 100],
  currencySymbol: "$",
  currencyLocale: "en-US",
};

/** Three betting positions, mirroring the reference table composition. */
export const SEATS: SeatConfig[] = [
  { id: 0, x: 430, y: 560 },
  { id: 1, x: 890, y: 635 },
  { id: 2, x: 1350, y: 560 },
];

export const TIMING: TimingConfig = {
  cardDeal: 0.34,
  cardDealStagger: 0.09,
  cardFlip: 0.3,
  chipPlace: 0.28,
  dealerRevealDelay: 0.45,
  dealerDrawDelay: 0.35,
  resultHold: 2.2,
  buttonPress: 0.09,
};

export const CARD_LAYOUT: CardLayoutConfig = {
  width: 148,
  height: 208,
  spread: 46,
  stagger: 26,
  rotationStep: 2,
  maxSpan: 430,
};

/** Palette for the felt, rail and UI furniture. */
export const COLORS = {
  feltLight: 0x2f6ea8,
  feltMid: 0x1c4f83,
  feltDark: 0x0c2b4d,
  feltPrint: 0x9dc6e8,
  railRed: 0x8e1d24,
  railRedLight: 0xb32a30,
  railRedDark: 0x571014,
  gold: 0xd9a83a,
  goldLight: 0xf3d98b,
  goldDark: 0x8a641c,
  panel: 0x0a0f16,
  panelLight: 0x1b2734,
  textPrimary: 0xffffff,
  textMuted: 0xa9bcc9,
  win: 0x4ad07a,
  lose: 0xe25c5c,
  push: 0xe8c04a,
  cardWhite: 0xf7f5ee,
  cardRed: 0xc0202a,
  cardBlack: 0x1a1a22,
  shadow: 0x000000,
} as const;

/** Shoe (deck) position in design space; every card animation starts here. */
export const SHOE_POSITION = { x: 300, y: 128 } as const;

/** Where the dealer's hand is centred. */
export const DEALER_POSITION = { x: 890, y: 300 } as const;

export const DEALER_BADGE_POSITION = { x: 566, y: 296 } as const;

export const AUDIO_ENABLED_BY_DEFAULT = true;
