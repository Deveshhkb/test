import { Application, Container, Sprite } from "pixi.js";
import gsap from "gsap";
import { CardAnimator } from "./animation/CardAnimation";
import { ChipAnimator } from "./animation/ChipAnimation";
import { AudioManager } from "./audio/AudioManager";
import {
  AUDIO_ENABLED_BY_DEFAULT,
  BETTING,
  DEALER_POSITION,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  RULES,
  SEATS,
  TIMING,
} from "./config/gameConfig";
import {
  GameAction,
  GameState,
  GameStateManager,
} from "./core/GameStateManager";
import { CardPool } from "./entities/CardPool";
import { BetManager, BetRejection } from "./game/BetManager";
import { BlackjackEngine, DealtCard } from "./game/BlackjackEngine";
import { BlackjackRules, Outcome } from "./game/BlackjackRules";
import { Shoe } from "./game/Deck";
import { PlayerHand, evaluateHand } from "./game/Hand";
import {
  RoundSettlement,
  SettlementManager,
  SettlementResult,
} from "./game/SettlementManager";
import { HandView } from "./ui/HandView";
import { BadgeTone } from "./ui/ScoreBadge";
import { DISCARD_POSITION } from "./ui/TableView";
import { UIManager } from "./ui/UIManager";
import { formatCurrency } from "./utils/currency";
import { StageScaler } from "./utils/responsive";
import { TextureFactory } from "./utils/textures";

/** GSAP-driven pause, so waits share the animation clock. */
function wait(seconds: number): Promise<void> {
  return new Promise((resolve) => {
    gsap.delayedCall(seconds, resolve);
  });
}

const REJECTION_MESSAGES: Record<BetRejection, string> = {
  [BetRejection.BELOW_MINIMUM]: `Minimum bet is ${formatCurrency(BETTING.minBet)}`,
  [BetRejection.ABOVE_MAXIMUM]: `Maximum bet is ${formatCurrency(BETTING.maxBet)}`,
  [BetRejection.INSUFFICIENT_FUNDS]: "Not enough cash for that chip",
  [BetRejection.NO_BET_PLACED]: "Place a bet to start the round",
  [BetRejection.NOTHING_TO_REPEAT]: "No previous bet to repeat",
};

/**
 * Composition root and round conductor.
 *
 * It wires the rules engine, the money model, the state machine and the view
 * together, and owns the sequence of a round: deal, player decisions, dealer
 * play, settlement, reset. Rules live in the engine, payouts in the settlement
 * manager, control enablement in the UI manager; this class only orchestrates.
 */
export class BlackjackGame {
  private readonly stateManager = new GameStateManager();
  private readonly rules = new BlackjackRules(RULES);
  private readonly shoe: Shoe;
  private readonly engine: BlackjackEngine;
  private readonly betManager: BetManager;
  private readonly audio = new AudioManager(AUDIO_ENABLED_BY_DEFAULT);
  private readonly cardAnimator = new CardAnimator();
  private readonly chipAnimator = new ChipAnimator();
  private readonly textures: TextureFactory;
  private readonly cardPool: CardPool;
  private readonly ui: UIManager;
  private readonly scaler: StageScaler;
  private readonly dealerView: HandView;
  private readonly seatViews = new Map<number, HandView>();
  private readonly layers: Record<
    "background" | "table" | "chips" | "cards" | "badges" | "hud" | "overlay",
    Container
  >;
  private readonly content = new Container();
  private readonly backgroundLayer = new Container();
  private releaseAudioUnlock: (() => void) | null = null;
  private destroyed = false;

  private constructor(private readonly app: Application) {
    this.textures = new TextureFactory();
    this.shoe = new Shoe({
      deckCount: RULES.deckCount,
      penetration: RULES.shoePenetration,
    });
    this.engine = new BlackjackEngine(
      this.rules,
      this.shoe,
      new SettlementManager(this.rules),
    );
    this.betManager = new BetManager(
      BETTING,
      SEATS.map((seat) => seat.id),
    );

    this.layers = {
      background: this.backgroundLayer,
      table: new Container(),
      chips: new Container(),
      cards: new Container(),
      badges: new Container(),
      hud: new Container(),
      overlay: new Container(),
    };

    this.content.addChild(
      this.layers.table,
      this.layers.chips,
      this.layers.cards,
      this.layers.badges,
      this.layers.hud,
      this.layers.overlay,
    );
    app.stage.addChild(this.backgroundLayer, this.content);

    this.buildBackground();

    this.ui = new UIManager(
      {
        table: this.layers.table,
        chips: this.layers.chips,
        cards: this.layers.cards,
        badges: this.layers.badges,
        hud: this.layers.hud,
        overlay: this.layers.overlay,
      },
      this.textures,
      this.chipAnimator,
      {
        onPlaceBet: (seatId) => this.handlePlaceBet(seatId),
        onRemoveBet: (seatId) => this.handleRemoveBet(seatId),
        onSelectChip: (value) => this.handleSelectChip(value),
        onStepChip: (direction) => this.handleStepChip(direction),
        onDeal: () => void this.handleDeal(),
        onClear: () => this.handleClear(),
        onRepeat: () => this.handleRepeat(),
        onHit: () => void this.handleHit(),
        onStand: () => void this.handleStand(),
        onInfo: () => this.withClick(() => this.ui.showInfo()),
        onStrategy: () => this.withClick(() => this.ui.showStrategy()),
        onToggleSound: (enabled) => this.audio.setEnabled(enabled),
      },
    );

    this.cardPool = new CardPool(this.layers.cards, this.textures);
    this.dealerView = new HandView(
      this.cardPool,
      this.cardAnimator,
      DEALER_POSITION,
    );
    for (const seat of SEATS) {
      const spot = this.ui.seat(seat.id);
      this.seatViews.set(
        seat.id,
        new HandView(this.cardPool, this.cardAnimator, spot.handOrigin),
      );
    }

    this.scaler = new StageScaler(app, {
      designWidth: DESIGN_WIDTH,
      designHeight: DESIGN_HEIGHT,
      content: this.content,
      background: this.backgroundLayer,
    });

    this.bindModelEvents();
    this.unlockAudioOnFirstGesture();

    this.stateManager.transitionTo(GameState.BETTING);
    this.syncBetDisplays();
    this.refreshUI();
  }

  /** Boots Pixi and returns a running game attached to `host`. */
  static async create(host: HTMLElement): Promise<BlackjackGame> {
    const app = new Application();
    await app.init({
      background: "#04101c",
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      powerPreference: "high-performance",
      width: window.innerWidth,
      height: window.innerHeight,
    });
    host.appendChild(app.canvas);
    return new BlackjackGame(app);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    gsap.globalTimeline.clear();
    this.releaseAudioUnlock?.();
    this.scaler.destroy();
    this.dealerView.dispose();
    for (const view of this.seatViews.values()) view.dispose();
    this.cardPool.destroy();
    this.ui.destroy();
    this.betManager.removeAllListeners();
    this.stateManager.removeAllListeners();
    this.audio.destroy();
    this.textures.destroy();
    this.app.destroy(true, { children: true });
  }

  // ---------------------------------------------------------------- betting

  private handlePlaceBet(seatId: number): void {
    if (!this.stateManager.canPerform(GameAction.PLACE_BET)) return;

    const chip = this.betManager.selectedChip;
    if (!this.betManager.placeChip(seatId, chip)) return;

    this.audio.play("chipPlace");
    this.ui.chipRail.punch();
    void this.ui.seat(seatId).stack.addChip(chip, this.ui.chipOrigin);
  }

  private handleRemoveBet(seatId: number): void {
    if (!this.stateManager.canPerform(GameAction.REMOVE_BET)) return;
    if (this.betManager.removeChip(seatId) === null) return;

    this.audio.play("buttonClick");
    void this.ui.seat(seatId).stack.removeTopChip(this.ui.chipOrigin);
  }

  private handleSelectChip(value: number): void {
    if (!this.stateManager.canPerform(GameAction.SELECT_CHIP)) return;
    if (this.betManager.selectChip(value)) this.audio.play("buttonClick");
  }

  private handleStepChip(direction: 1 | -1): void {
    if (!this.stateManager.canPerform(GameAction.SELECT_CHIP)) return;
    if (this.betManager.stepChip(direction)) this.audio.play("buttonClick");
  }

  private handleClear(): void {
    if (!this.stateManager.canPerform(GameAction.CLEAR_BET)) return;
    if (!this.betManager.clearBets()) return;

    this.audio.play("buttonClick");
    for (const seatId of this.seatViews.keys()) {
      void this.ui.seat(seatId).stack.removeAllTo(this.ui.chipOrigin);
    }
  }

  private handleRepeat(): void {
    if (!this.stateManager.canPerform(GameAction.REPEAT_BET)) return;

    for (const seatId of this.seatViews.keys()) {
      this.ui.seat(seatId).stack.clearImmediate();
    }
    if (!this.betManager.repeatBets()) return;

    this.audio.play("chipPlace");
    for (const seatId of this.seatViews.keys()) {
      const chips = this.betManager.chipsForSeat(seatId);
      const spot = this.ui.seat(seatId);
      chips.forEach((chip, index) => {
        void spot.stack.addChip(chip, this.ui.chipOrigin, index * 0.05);
      });
    }
  }

  // ------------------------------------------------------------------ round

  private async handleDeal(): Promise<void> {
    if (!this.stateManager.canPerform(GameAction.DEAL)) return;

    const bets = this.betManager.commit();
    if (!Array.isArray(bets)) {
      this.ui.toast.show(REJECTION_MESSAGES[bets]);
      return;
    }

    this.audio.play("buttonClick");
    this.stateManager.transitionTo(GameState.DEALING);

    await this.stateManager.withLock(async () => {
      this.refreshUI();
      this.ui.bottomBar.setWin(0);
      const sequence = this.engine.startRound(bets);
      await this.dealOpeningCards(sequence);
      this.ui.table.setShoeFill(this.shoe.remaining / this.shoe.size);
    });

    await this.beginPlayerPhase();
  }

  private async dealOpeningCards(
    sequence: readonly DealtCard[],
  ): Promise<void> {
    for (const dealt of sequence) {
      const view =
        dealt.target.kind === "dealer"
          ? this.dealerView
          : this.seatViews.get(dealt.target.seatId)!;

      this.audio.play("cardDeal");
      await view.dealCard(dealt.card, !dealt.faceDown);
      this.updateScores();
      await wait(TIMING.cardDealStagger);
    }
  }

  private async beginPlayerPhase(): Promise<void> {
    const active = this.engine.beginPlayerPhase();

    if (!active) {
      await this.runDealerTurn(GameState.DEALING);
      return;
    }

    this.stateManager.transitionTo(GameState.PLAYER_TURN);
    this.ui.setActiveSeat(active.seatId);
    this.refreshUI();
  }

  private async handleHit(): Promise<void> {
    if (!this.stateManager.canPerform(GameAction.HIT)) return;
    if (!this.engine.canHitActiveHand()) return;

    let finished = false;
    await this.stateManager.withLock(async () => {
      this.refreshUI();
      const result = this.engine.hit();
      const view = this.seatViews.get(result.seatId)!;

      this.audio.play("cardDeal");
      await view.dealCard(result.card, true);
      this.updateScores();

      if (result.busted) this.audio.play("lose");
      finished = result.busted || result.reachedLimit;
    });

    if (finished) await this.advanceSeat();
    else this.refreshUI();
  }

  private async handleStand(): Promise<void> {
    if (!this.stateManager.canPerform(GameAction.STAND)) return;

    this.audio.play("buttonClick");
    this.engine.stand();
    await this.advanceSeat();
  }

  /** Moves to the next seat, or to the dealer when every seat has acted. */
  private async advanceSeat(): Promise<void> {
    const next = this.engine.advanceToNextHand();
    if (next) {
      this.ui.setActiveSeat(next.seatId);
      this.refreshUI();
      return;
    }
    await this.runDealerTurn(GameState.PLAYER_TURN);
  }

  private async runDealerTurn(from: GameState): Promise<void> {
    if (!this.stateManager.is(from)) return;
    this.stateManager.transitionTo(GameState.DEALER_TURN);
    this.ui.setActiveSeat(null);

    await this.stateManager.withLock(async () => {
      this.refreshUI();
      await wait(TIMING.dealerRevealDelay);

      this.audio.play("cardFlip");
      this.engine.revealHoleCard();
      await this.dealerView.revealCard(1);
      this.updateScores();

      while (this.engine.dealerShouldDraw()) {
        await wait(TIMING.dealerDrawDelay);
        const card = this.engine.dealerDraw();
        this.audio.play("cardDeal");
        await this.dealerView.dealCard(card, true);
        this.updateScores();
      }
    });

    await this.settleRound();
  }

  // ------------------------------------------------------------- settlement

  private async settleRound(): Promise<void> {
    this.stateManager.transitionTo(GameState.RESULT);
    const settlement = this.engine.settle();

    await this.stateManager.withLock(async () => {
      this.refreshUI();
      await wait(0.2);

      const chipMoves: Promise<void>[] = [];
      for (const result of settlement.results) {
        const spot = this.ui.seat(result.seatId);
        const { text, tone } = describeSettlement(result);
        spot.showResult(text, tone);

        if (result.payout > 0) {
          this.betManager.credit(result.payout);
          chipMoves.push(spot.stack.payout(this.ui.balanceAnchor));
        } else {
          chipMoves.push(spot.stack.collect(DEALER_POSITION));
        }
      }

      this.playSettlementSound(settlement);
      await this.showRoundBanner(settlement);
      await Promise.all(chipMoves);
      await wait(TIMING.resultHold);
    });

    await this.resetForNextRound();
  }

  private playSettlementSound(settlement: RoundSettlement): void {
    const hasBlackjack = settlement.results.some(
      (result) => result.outcome === Outcome.PLAYER_BLACKJACK,
    );
    if (hasBlackjack) this.audio.play("blackjack");
    else if (settlement.totalNet > 0) this.audio.play("win");
    else if (settlement.totalNet < 0) this.audio.play("lose");
    else this.audio.play("push");
  }

  private async showRoundBanner(settlement: RoundSettlement): Promise<void> {
    const won = settlement.totalPayout;
    const hasBlackjack = settlement.results.some(
      (result) => result.outcome === Outcome.PLAYER_BLACKJACK,
    );

    let title = "DEALER WINS";
    let subtitle = "";
    let tone: BadgeTone = "lose";

    if (settlement.totalNet > 0) {
      title = hasBlackjack ? "BLACKJACK!" : "YOU WIN";
      subtitle = formatCurrency(won);
      tone = hasBlackjack ? "blackjack" : "win";
    } else if (settlement.totalNet === 0 && won > 0) {
      title = "PUSH";
      subtitle = "Bet returned";
      tone = "push";
    } else if (won > 0) {
      // Mixed round: the table lost overall, but some seats were still paid.
      subtitle = `Paid ${formatCurrency(won)}`;
    }

    if (won > 0) this.ui.bottomBar.setWin(won);
    await this.ui.resultPanel.show(title, subtitle, tone);
  }

  private async resetForNextRound(): Promise<void> {
    this.stateManager.transitionTo(GameState.ROUND_END);

    await this.stateManager.withLock(async () => {
      await this.ui.resultPanel.hide();

      const clears = [this.dealerView.clear(DISCARD_POSITION)];
      for (const view of this.seatViews.values())
        clears.push(view.clear(DISCARD_POSITION));
      await Promise.all(clears);

      this.betManager.clearTable();
      this.ui.resetSeats();
      this.ui.hideDealerScore();
      this.engine.endRound();
      this.syncBetDisplays();
    });

    this.stateManager.transitionTo(GameState.BETTING);
    this.refreshUI();
  }

  // ------------------------------------------------------------------ views

  private updateScores(): void {
    for (const hand of this.engine.playerHands) {
      const spot = this.ui.seat(hand.seatId);
      const { text, tone } = describeHand(hand);
      spot.setScore(text, tone);
    }

    const dealer = this.engine.dealerHand;
    if (dealer.size === 0) return;

    if (!this.engine.isHoleCardRevealed && dealer.size > 1) {
      const upCard = evaluateHand([dealer.cards[0]]);
      this.ui.setDealerScore(String(upCard.value));
      return;
    }

    const value = dealer.value;
    if (value.isBust) this.ui.setDealerScore(`${value.value}  BUST`, "lose");
    else if (value.isBlackjack)
      this.ui.setDealerScore("BLACKJACK", "blackjack");
    else this.ui.setDealerScore(String(value.value));
  }

  private syncBetDisplays(): void {
    const snapshot = this.betManager.snapshot();
    this.ui.bottomBar.setBalance(snapshot.balance);
    this.ui.bottomBar.setTotalBet(snapshot.totalBet);
    this.ui.chipRail.setSelected(snapshot.selectedChip);
    for (const [seatId, amount] of snapshot.seatBets) {
      this.ui.seat(seatId).setBetAmount(amount);
    }
  }

  private refreshUI(): void {
    this.ui.refresh({
      state: this.stateManager.current,
      busy: this.stateManager.busy,
      hasBet: this.betManager.hasBet,
      canRepeat: this.betManager.canRepeat,
      canHit: this.engine.canHitActiveHand(),
    });
  }

  private bindModelEvents(): void {
    // Mirroring the phase onto the document makes the game observable from
    // outside the canvas, which end-to-end tests and QA tooling depend on.
    this.stateManager.on("interactivity", ({ state, busy }) => {
      document.body.dataset.gameState = state;
      document.body.dataset.gameBusy = String(busy);
    });

    this.betManager.on("change", () => {
      this.syncBetDisplays();
      this.refreshUI();
    });

    this.betManager.on("rejected", ({ reason }) => {
      this.ui.toast.show(REJECTION_MESSAGES[reason]);
    });

    this.stateManager.on("interactivity", () => this.refreshUI());
  }

  private buildBackground(): void {
    const felt = new Sprite(this.textures.felt(DESIGN_WIDTH, DESIGN_HEIGHT));
    felt.setSize(DESIGN_WIDTH, DESIGN_HEIGHT);
    this.backgroundLayer.addChild(felt);
  }

  /** Browsers only allow audio after an interaction. */
  private unlockAudioOnFirstGesture(): void {
    this.releaseAudioUnlock = () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      this.releaseAudioUnlock = null;
    };
    const unlock = () => {
      this.audio.unlock();
      this.releaseAudioUnlock?.();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
  }

  private withClick(action: () => void): void {
    this.audio.play("buttonClick");
    action();
  }
}

function describeHand(hand: PlayerHand): { text: string; tone: BadgeTone } {
  const value = hand.value;
  if (value.isBust) return { text: `${value.value}  BUST`, tone: "lose" };
  if (value.isBlackjack) return { text: "BLACKJACK", tone: "blackjack" };
  // Soft hands show both readings, the way a dealer would call them.
  if (value.isSoft)
    return { text: `${value.hard} / ${value.value}`, tone: "neutral" };
  return { text: `${value.value}`, tone: "neutral" };
}

/**
 * Seat result badge. Winning seats show what they were paid rather than
 * repeating the hand label already on the score badge.
 */
function describeSettlement(result: SettlementResult): {
  text: string;
  tone: BadgeTone;
} {
  switch (result.outcome) {
    case Outcome.PLAYER_BLACKJACK:
      return {
        text: `+${formatCurrency(result.netProfit)}`,
        tone: "blackjack",
      };
    case Outcome.PLAYER_WIN:
      return { text: `+${formatCurrency(result.netProfit)}`, tone: "win" };
    case Outcome.PUSH:
      return { text: "PUSH", tone: "push" };
    case Outcome.PLAYER_BUST:
      return { text: "BUST", tone: "lose" };
    case Outcome.DEALER_WIN:
    case Outcome.DEALER_BLACKJACK:
      return { text: "LOSE", tone: "lose" };
  }
}
