/**
 * Domain model for the Baccarat engine.
 *
 * Everything in this file is transport agnostic: the same structures are
 * produced by the built-in RNG adapter and by a live dealer / remote RNG
 * backend, so no rendering code ever needs to know where a round came from.
 */

/* ------------------------------------------------------------------ *
 * Cards
 * ------------------------------------------------------------------ */

export enum Suit {
  Spades = "S",
  Hearts = "H",
  Diamonds = "D",
  Clubs = "C",
}

/** Rank index 1..13 (Ace .. King). Kept numeric so point value is trivial. */
export enum Rank {
  Ace = 1,
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
  Ten = 10,
  Jack = 11,
  Queen = 12,
  King = 13,
}

export interface CardData {
  readonly rank: Rank;
  readonly suit: Suit;
}

export const SUITS: readonly Suit[] = [Suit.Spades, Suit.Hearts, Suit.Diamonds, Suit.Clubs];

export const RANKS: readonly Rank[] = [
  Rank.Ace,
  Rank.Two,
  Rank.Three,
  Rank.Four,
  Rank.Five,
  Rank.Six,
  Rank.Seven,
  Rank.Eight,
  Rank.Nine,
  Rank.Ten,
  Rank.Jack,
  Rank.Queen,
  Rank.King,
];

/** Stable atlas frame key for a card, e.g. `card_AS`, `card_10H`. */
export function cardKey(card: CardData): string {
  return `card_${rankLabel(card.rank)}${card.suit}`;
}

export function rankLabel(rank: Rank): string {
  switch (rank) {
    case Rank.Ace:
      return "A";
    case Rank.Jack:
      return "J";
    case Rank.Queen:
      return "Q";
    case Rank.King:
      return "K";
    default:
      return String(rank);
  }
}

/* ------------------------------------------------------------------ *
 * Hands / seats
 * ------------------------------------------------------------------ */

export enum HandSide {
  Player = "player",
  Banker = "banker",
}

export interface HandSnapshot {
  readonly side: HandSide;
  readonly cards: readonly CardData[];
  /** Baccarat total, always 0..9. */
  readonly total: number;
  readonly isNatural: boolean;
  readonly isPair: boolean;
}

/* ------------------------------------------------------------------ *
 * Betting
 * ------------------------------------------------------------------ */

export enum BetType {
  Player = "PLAYER",
  Banker = "BANKER",
  Tie = "TIE",
  PlayerPair = "PLAYER_PAIR",
  BankerPair = "BANKER_PAIR",
  Natural = "NATURAL",
  PerfectPair = "PERFECT_PAIR",
}

export const ALL_BET_TYPES: readonly BetType[] = [
  BetType.Player,
  BetType.Banker,
  BetType.Tie,
  BetType.PlayerPair,
  BetType.BankerPair,
  BetType.Natural,
  BetType.PerfectPair,
];

/** Amount staked per bet type. Absent key === no wager. */
export type BetMap = Partial<Record<BetType, number>>;

/** One chip placement, retained so `undo` can unwind precisely. */
export interface BetAction {
  readonly betType: BetType;
  readonly amount: number;
  /** Chip denomination used, for the visual stack. */
  readonly chipValue: number;
  readonly timestamp: number;
}

export interface BetLimit {
  readonly min: number;
  readonly max: number;
}

/** Payout resolution for a single bet type after a round settles. */
export interface BetSettlement {
  readonly betType: BetType;
  readonly stake: number;
  /** True when the wager wins, false when it loses, null when pushed. */
  readonly won: boolean | null;
  /** Net profit (negative on a loss, 0 on a push). Commission already applied. */
  readonly profit: number;
  /** Stake + profit returned to the balance. 0 on a total loss. */
  readonly returned: number;
  /** Commission withheld on this bet (banker line only, by default). */
  readonly commission: number;
}

/* ------------------------------------------------------------------ *
 * Round
 * ------------------------------------------------------------------ */

export enum RoundOutcome {
  Player = "PLAYER",
  Banker = "BANKER",
  Tie = "TIE",
}

/**
 * The complete, replayable description of one coup. A backend may send this
 * whole object at `ROUND_RESULT`, or stream it card by card via `DEAL_CARD`
 * and let the engine assemble it — both paths converge here.
 */
export interface RoundResult {
  readonly roundId: string;
  readonly shoeId: string;
  readonly player: HandSnapshot;
  readonly banker: HandSnapshot;
  readonly outcome: RoundOutcome;
  readonly playerPair: boolean;
  readonly bankerPair: boolean;
  readonly perfectPair: boolean;
  readonly natural: boolean;
  /** Order in which cards physically reach the table. */
  readonly dealSequence: readonly DealStep[];
}

export interface DealStep {
  readonly side: HandSide;
  readonly card: CardData;
  /** 0-based index inside that hand (0,1 initial deal, 2 = third card). */
  readonly index: number;
  /** True for the two draw-rule cards, which are dealt after the reveal. */
  readonly isDraw: boolean;
}

/* ------------------------------------------------------------------ *
 * Roadmaps
 * ------------------------------------------------------------------ */

/** One settled coup as consumed by the roadmap engine. */
export interface RoadEntry {
  readonly outcome: RoundOutcome;
  readonly playerPair: boolean;
  readonly bankerPair: boolean;
  readonly roundId: string;
}

/** A Big Road cell: a win plus any ties that landed on top of it. */
export interface BigRoadCell {
  readonly outcome: RoundOutcome.Player | RoundOutcome.Banker;
  readonly tieCount: number;
  readonly playerPair: boolean;
  readonly bankerPair: boolean;
  readonly column: number;
  readonly row: number;
}

export enum DerivedMark {
  Red = "red",
  Blue = "blue",
}

export interface DerivedCell {
  readonly mark: DerivedMark;
  readonly column: number;
  readonly row: number;
}

export interface RoadmapSnapshot {
  readonly beadPlate: readonly RoadEntry[];
  readonly bigRoad: readonly BigRoadCell[];
  readonly bigEyeBoy: readonly DerivedCell[];
  readonly smallRoad: readonly DerivedCell[];
  readonly cockroachPig: readonly DerivedCell[];
  readonly stats: RoadStats;
}

export interface RoadStats {
  readonly total: number;
  readonly player: number;
  readonly banker: number;
  readonly tie: number;
  readonly playerPair: number;
  readonly bankerPair: number;
}

/* ------------------------------------------------------------------ *
 * Game state machine
 * ------------------------------------------------------------------ */

export enum GameState {
  Boot = "BOOT",
  Loading = "LOADING",
  Waiting = "WAITING",
  BettingOpen = "BETTING_OPEN",
  BettingClosed = "BETTING_CLOSED",
  Dealing = "DEALING",
  PlayerDraw = "PLAYER_DRAW",
  BankerDraw = "BANKER_DRAW",
  Result = "RESULT",
  Payout = "PAYOUT",
  Reset = "RESET",
}

/* ------------------------------------------------------------------ *
 * Layout
 * ------------------------------------------------------------------ */

export enum LayoutMode {
  DesktopLandscape = "desktop-landscape",
  TabletLandscape = "tablet-landscape",
  MobileLandscape = "mobile-landscape",
  Portrait = "portrait",
}

export interface ViewportMetrics {
  /** CSS pixel size of the host element. */
  readonly width: number;
  readonly height: number;
  readonly aspect: number;
  readonly mode: LayoutMode;
  readonly isPortrait: boolean;
  /** Uniform scale from design space to screen space. */
  readonly scale: number;
  /** Design-space size actually visible after fitting. */
  readonly designWidth: number;
  readonly designHeight: number;
  readonly resolution: number;
}

/* ------------------------------------------------------------------ *
 * Public engine surface
 * ------------------------------------------------------------------ */

export interface PlayerAccount {
  balance: number;
  currency: string;
  displayName: string;
}

export type Unsubscribe = () => void;
