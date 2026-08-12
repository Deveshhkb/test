import { Container } from "pixi.js";
import { ChipAnimator } from "../animation/ChipAnimation";
import { Point } from "../animation/CardAnimation";
import {
  BETTING,
  DEALER_BADGE_POSITION,
  SEATS,
  SeatConfig,
} from "../config/gameConfig";
import { GameState } from "../core/GameStateManager";
import { TextureFactory } from "../utils/textures";
import { ActionBar, ActionBarCallbacks } from "./ActionBar";
import { BetSpot } from "./BetSpot";
import { BottomBar, BottomBarCallbacks } from "./BottomBar";
import { ChipRail } from "./ChipRail";
import { InfoOverlay } from "./InfoOverlay";
import { MessageToast } from "./MessageToast";
import { ResultPanel } from "./ResultPanel";
import { BadgeTone, ScoreBadge } from "./ScoreBadge";
import { TableView } from "./TableView";

export interface UICallbacks extends ActionBarCallbacks, BottomBarCallbacks {
  onPlaceBet: (seatId: number) => void;
  onRemoveBet: (seatId: number) => void;
  onSelectChip: (value: number) => void;
  onStepChip: (direction: 1 | -1) => void;
}

export interface UILayers {
  table: Container;
  chips: Container;
  cards: Container;
  /** Above the cards: hand totals and round results stay readable. */
  badges: Container;
  hud: Container;
  overlay: Container;
}

/** Everything the controller needs to decide which controls are live. */
export interface UIStateInput {
  state: GameState;
  busy: boolean;
  hasBet: boolean;
  canRepeat: boolean;
  canHit: boolean;
}

const RULES_TEXT = [
  "Blackjack pays 3 to 2. Insurance pays 2 to 1.",
  "The dealer draws to 16 and stands on all 17s.",
  "",
  "Place chips on any of the three boxes, then press DEAL.",
  "Right-click a box to take the last chip back.",
  "",
  "Cards count at face value; picture cards count as ten.",
  "An ace counts as eleven unless that would bust the hand,",
  "in which case it counts as one.",
  "",
  "Hit to draw another card, stand to keep your total.",
  "Going over 21 loses the wager immediately.",
].join("\n");

const STRATEGY_TEXT = [
  "Basic strategy against the dealer's up card:",
  "",
  "• Hard 8 or less — always hit.",
  "• Hard 9 to 11 — hit; these are the strongest doubling spots.",
  "• Hard 12 to 16 — stand against 2-6, hit against 7-Ace.",
  "• Hard 17 or more — always stand.",
  "• Soft 17 or less — always hit.",
  "• Soft 18 — stand against 2-8, otherwise hit.",
  "• Soft 19 or more — always stand.",
  "",
  "Never take insurance without counting the shoe.",
].join("\n");

/**
 * Owns every view component and translates game state into interface state.
 *
 * The controller calls {@link refresh} whenever anything changes; enabling and
 * disabling controls happens here only, so no button can ever be live in a
 * state that does not accept it.
 */
export class UIManager {
  readonly table: TableView;
  readonly seats = new Map<number, BetSpot>();
  readonly chipRail: ChipRail;
  readonly actionBar: ActionBar;
  readonly bottomBar: BottomBar;
  readonly resultPanel: ResultPanel;
  readonly toast: MessageToast;
  readonly overlay: InfoOverlay;
  private readonly dealerBadge = new ScoreBadge();
  private lastControlSet: "betting" | "player" | null = null;

  constructor(
    layers: UILayers,
    textures: TextureFactory,
    chipAnimator: ChipAnimator,
    callbacks: UICallbacks,
  ) {
    this.table = new TableView(textures);
    layers.table.addChild(this.table);

    for (const seat of SEATS) {
      const spot = new BetSpot(
        seat as SeatConfig,
        layers.chips,
        textures,
        chipAnimator,
        {
          onPlace: callbacks.onPlaceBet,
          onRemove: callbacks.onRemoveBet,
        },
      );
      this.seats.set(seat.id, spot);
      layers.table.addChild(spot);
      layers.badges.addChild(spot.badges);
    }

    this.dealerBadge.position.set(
      DEALER_BADGE_POSITION.x,
      DEALER_BADGE_POSITION.y,
    );
    layers.badges.addChild(this.dealerBadge);

    this.chipRail = new ChipRail(textures, {
      onSelect: callbacks.onSelectChip,
      onStep: callbacks.onStepChip,
    });

    this.actionBar = new ActionBar(callbacks);
    this.bottomBar = new BottomBar(callbacks);
    this.resultPanel = new ResultPanel();
    this.toast = new MessageToast();
    this.overlay = new InfoOverlay();

    layers.hud.addChild(this.chipRail, this.actionBar, this.bottomBar);
    layers.overlay.addChild(this.resultPanel, this.toast, this.overlay);

    this.bottomBar.setBalance(BETTING.startingBalance, false);
  }

  get chipOrigin(): Point {
    return this.chipRail.chipOrigin;
  }

  get balanceAnchor(): Point {
    return this.bottomBar.balanceAnchor;
  }

  seat(seatId: number): BetSpot {
    const spot = this.seats.get(seatId);
    if (!spot) throw new Error(`unknown seat ${seatId}`);
    return spot;
  }

  /** Single entry point for control enablement. */
  refresh(input: UIStateInput): void {
    const bettingPhase =
      input.state === GameState.BETTING || input.state === GameState.ROUND_END;
    const canBet = bettingPhase && !input.busy;
    const playerTurn = input.state === GameState.PLAYER_TURN;

    for (const spot of this.seats.values()) spot.setInteractive(canBet);
    this.chipRail.setEnabled(canBet);

    const targetSet = playerTurn ? "player" : "betting";
    if (targetSet !== this.lastControlSet) {
      if (playerTurn) this.actionBar.showPlayerControls();
      else this.actionBar.showBettingControls();
      this.lastControlSet = targetSet;
    }

    this.actionBar.setAvailability({
      deal: canBet && input.hasBet,
      clear: canBet && input.hasBet,
      repeat: canBet && input.canRepeat,
      hit: playerTurn && !input.busy && input.canHit,
      stand: playerTurn && !input.busy,
    });
  }

  setDealerScore(text: string, tone: BadgeTone = "neutral"): void {
    this.dealerBadge.setValue(text, tone);
    this.dealerBadge.bump();
  }

  hideDealerScore(): void {
    this.dealerBadge.hide();
  }

  resetSeats(): void {
    for (const spot of this.seats.values()) spot.reset();
  }

  setActiveSeat(seatId: number | null): void {
    for (const [id, spot] of this.seats) spot.setActive(id === seatId);
  }

  showInfo(): void {
    this.overlay.toggle({ title: "HOW TO PLAY", body: RULES_TEXT });
  }

  showStrategy(): void {
    this.overlay.toggle({ title: "BASIC STRATEGY", body: STRATEGY_TEXT });
  }

  destroy(): void {
    for (const spot of this.seats.values()) spot.destroy({ children: true });
    this.seats.clear();
  }
}
