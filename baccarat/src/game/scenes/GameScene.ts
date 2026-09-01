import { Container, Graphics, Sprite } from "pixi.js";

import { CARD_HEIGHT, CARD_WIDTH, Depth, Fonts, POOL_SIZE_CHIPS, Palette } from "../Constants";
import { ObjectPool } from "../core/ObjectPool";
import { ActionButton } from "../objects/ActionButton";
import { BettingSpot, type BettingSpotOptions } from "../objects/BettingSpot";
import { Chip } from "../objects/Chip";
import { ChipStepper } from "../objects/ChipStepper";
import { Deck } from "../objects/Deck";
import { InfoPanel } from "../objects/InfoPanel";
import { ResultBanner } from "../objects/ResultBanner";
import { ResultsPanel } from "../objects/ResultsPanel";
import { RoadMap } from "../objects/RoadMap";
import { HandZone } from "../objects/HandZone";
import { ShadowLabel } from "../objects/ShadowLabel";
import { StatusBar } from "../objects/StatusBar";
import { CardShoeCase, ChipRack, LimitSign, TableLogo } from "../objects/TableDressing";
import { Timer } from "../objects/Timer";
import {
  BetType,
  GameState,
  HandSide,
  RoundOutcome,
  type BetSettlement,
  type RoundResult,
  type ViewportMetrics,
} from "../types";
import { Ease } from "../managers/AnimationManager";
import { clamp } from "../utils/MathUtils";

import { Scene } from "./Scene";

/**
 * Horizontal room one hand needs, as `scale * HAND_SPAN_PER_SCALE + THIRD_CARD_PAD`:
 * two upright cards plus the third lying on its side beside them.
 */
const HAND_SPAN_PER_SCALE = CARD_WIDTH * 2 + CARD_HEIGHT;
const THIRD_CARD_PAD = 46;
/** How far a hand reaches past its centre on the side the third card lies. */
const OUTWARD_SPAN_PER_SCALE = CARD_WIDTH + CARD_HEIGHT;
/** Breathing room kept between a hand and whatever is next to it. */
const HAND_GUTTER = 22;

/** Resolved geometry for one wager band. */
interface SpotLayout {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The table.
 *
 * Composes every display object, wires them to the event bus, and owns the two
 * layouts. It contains no game logic: it reacts to events and asks managers for
 * actions, which is what lets the entire look be replaced without touching a
 * rule.
 *
 * The layout follows a single-player RNG table: three arced wager bands stacked
 * in the middle of the felt, the two hands flanking them, a chip stepper and an
 * action cluster on the near rail, and a black status strip along the bottom.
 */
export class GameScene extends Scene {
  /* Layers --------------------------------------------------------- */
  private readonly voidFill = new Graphics();
  private readonly felt = new Sprite();
  private readonly feltMask = new Graphics();
  private readonly rail = new Graphics();
  private readonly feltTrim = new Graphics();
  private readonly secondaryPlate = new Graphics();
  private readonly dressing = new Container();
  private readonly betLayer = new Container();
  private readonly cardLayer = new Container();
  private readonly hudLayer = new Container();
  private readonly overlayLayer = new Container();

  /* Table furniture ------------------------------------------------- */
  private readonly limitSign: LimitSign;
  private readonly chipRack: ChipRack;
  private readonly shoeCase: CardShoeCase;
  private readonly logo: TableLogo;
  private readonly deck: Deck;
  private readonly discardTray = new Graphics();

  /* Play ------------------------------------------------------------ */
  private readonly playerAnchor = new Container();
  private readonly bankerAnchor = new Container();
  private readonly playerZone: HandZone;
  private readonly bankerZone: HandZone;
  private readonly spots = new Map<BetType, BettingSpot>();
  private readonly chipPool: ObjectPool<Chip>;

  /* HUD -------------------------------------------------------------- */
  private readonly timer: Timer;
  private readonly statusPlate = new Graphics();
  private readonly statusMessage: ShadowLabel;
  private readonly statusBar: StatusBar;
  private readonly stepper: ChipStepper;
  private readonly resultsPanel: ResultsPanel;
  private readonly roadmap: RoadMap;
  private readonly banner: ResultBanner;
  private readonly infoPanel: InfoPanel;

  private readonly buttons: Record<
    "clear" | "deal" | "history" | "undo" | "repeat" | "double" | "info" | "sound",
    ActionButton
  >;

  private lastResult: RoundResult | null = null;
  private portraitPanelInitialised = false;

  constructor(...args: ConstructorParameters<typeof Scene>) {
    super(...args);
    const strings = this.ctx.config.strings;

    this.chipPool = new ObjectPool<Chip>(() => new Chip(this.ctx), {
      initial: 20,
      max: POOL_SIZE_CHIPS,
      name: "chips",
    });

    this.felt.anchor.set(0.5);
    this.felt.texture = this.ctx.assets.get("fx_vignette");
    this.felt.mask = this.feltMask;

    this.limitSign = new LimitSign(this.ctx);
    this.chipRack = new ChipRack(this.ctx);
    this.shoeCase = new CardShoeCase();
    this.logo = new TableLogo(this.ctx);
    this.deck = new Deck(this.ctx);

    this.playerZone = new HandZone(this.ctx, HandSide.Player, strings.player, Palette.goldBright);
    this.bankerZone = new HandZone(this.ctx, HandSide.Banker, strings.banker, 0xffffff);

    this.timer = new Timer(this.ctx);
    this.statusMessage = new ShadowLabel({
      fontFamily: Fonts.Label,
      fontSize: 32,
      tint: 0xffffff,
    });

    this.statusBar = new StatusBar(this.ctx);
    this.stepper = new ChipStepper(this.ctx);
    this.resultsPanel = new ResultsPanel(this.ctx);
    this.roadmap = new RoadMap(this.ctx);
    this.banner = new ResultBanner(this.ctx);
    this.infoPanel = new InfoPanel(this.ctx);

    this.buttons = {
      clear: new ActionButton(this.ctx, {
        icon: "clear",
        caption: strings.clearBet,
        onTap: () => this.ctx.bets.clear(),
      }),
      deal: new ActionButton(this.ctx, {
        icon: "deal",
        caption: strings.deal,
        onTap: () => this.requestDeal(),
      }),
      history: new ActionButton(this.ctx, {
        icon: "history",
        highlight: true,
        onTap: () => this.toggleResults(),
      }),
      undo: new ActionButton(this.ctx, { icon: "undo", onTap: () => this.ctx.bets.undo() }),
      repeat: new ActionButton(this.ctx, { icon: "repeat", onTap: () => this.ctx.bets.repeat() }),
      double: new ActionButton(this.ctx, {
        icon: "double",
        glyphText: "2\u00d7",
        onTap: () => this.ctx.bets.double(),
      }),
      info: new ActionButton(this.ctx, { icon: "info", onTap: () => this.infoPanel.toggle() }),
      sound: new ActionButton(this.ctx, { icon: "sound", onTap: () => this.toggleSound() }),
    };

    this.buildLayers();
    this.buildSpots();
  }

  private buildLayers(): void {
    this.dressing.addChild(
      this.feltTrim,
      this.chipRack,
      this.limitSign,
      this.shoeCase,
      this.logo,
      this.discardTray,
      this.deck,
    );
    // Zones sit under the cards: the printed slots are what cards land on.
    this.cardLayer.addChild(this.playerZone, this.bankerZone, this.playerAnchor, this.bankerAnchor);

    this.hudLayer.addChild(
      this.timer,
      this.statusPlate,
      this.statusMessage,
      this.roadmap,
      this.resultsPanel,
      this.stepper,
      this.statusBar,
    );
    this.hudLayer.addChild(this.secondaryPlate);
    for (const button of Object.values(this.buttons)) this.hudLayer.addChild(button);

    this.overlayLayer.addChild(this.banner, this.infoPanel);

    this.voidFill.zIndex = Depth.Background;
    this.felt.zIndex = Depth.Background + 1;
    this.rail.zIndex = Depth.TableFelt;
    this.dressing.zIndex = Depth.TableFelt + 1;
    this.betLayer.zIndex = Depth.BettingLayer;
    this.cardLayer.zIndex = Depth.CardLayer;
    this.hudLayer.zIndex = Depth.HudLayer;
    this.overlayLayer.zIndex = Depth.OverlayLayer;

    this.addChild(
      this.voidFill,
      this.felt,
      this.feltMask,
      this.rail,
      this.dressing,
      this.betLayer,
      this.cardLayer,
      this.hudLayer,
      this.overlayLayer,
    );
    this.sortableChildren = true;
  }

  /** The layout is data — adding a side bet means adding a row here. */
  private buildSpots(): void {
    const { theme, strings, features } = this.ctx.config;

    const definitions: BettingSpotOptions[] = [
      { betType: BetType.Tie, label: strings.tie, color: theme.tie, primary: true },
      { betType: BetType.Banker, label: strings.banker, color: theme.banker, primary: true },
      { betType: BetType.Player, label: strings.player, color: theme.player, primary: true },
    ];

    if (features.sidebets) {
      definitions.push(
        { betType: BetType.PlayerPair, label: strings.playerPair, color: theme.player },
        { betType: BetType.BankerPair, label: strings.bankerPair, color: theme.banker },
        { betType: BetType.PerfectPair, label: strings.perfectPair, color: theme.pair },
        { betType: BetType.Natural, label: strings.natural, color: theme.gold },
      );
    }

    for (const definition of definitions) {
      const spot = new BettingSpot(this.ctx, definition, this.chipPool);
      spot.refreshLabels();
      this.spots.set(definition.betType, spot);
      this.betLayer.addChild(spot);
    }
  }

  /* ---------------------------------------------------------------- *
   * Wiring
   * ---------------------------------------------------------------- */

  protected override onEnter(): void {
    this.ctx.cards.attach({
      layer: this.cardLayer,
      deck: this.deck,
      playerAnchor: this.playerAnchor,
      bankerAnchor: this.bankerAnchor,
      discardPoint: () => this.discardTray.toGlobal({ x: 0, y: 0 }),
    });

    this.bindEvents();
    this.bindShortcuts();

    this.statusBar.setBalance(this.ctx.bets.currentBalance, false);
    this.resultsPanel.render(this.ctx.roadmaps.snapshot.beadPlate, false);
    this.roadmap.render(this.ctx.roadmaps.snapshot, false);
    this.deck.startIdle();
    this.refreshControls();
  }

  private bindEvents(): void {
    const bus = this.ctx.bus;

    this.track(
      bus.on("bet:changed", ({ bets, total }) => {
        const origin = this.stepper.originGlobal();
        for (const [betType, spot] of this.spots) spot.setAmount(bets[betType] ?? 0, origin);
        this.statusBar.setBet(total);
        this.refreshControls();
      }),
    );

    this.track(bus.on("bet:chipSelected", ({ index }) => this.stepper.setSelected(index)));

    this.track(
      bus.on("bet:rejected", ({ betType, message }) => {
        this.spots.get(betType)?.setHovering(false);
        this.flashStatus(message);
      }),
    );

    this.track(bus.on("balance:changed", ({ balance }) => this.statusBar.setBalance(balance)));

    this.track(
      bus.on("timer:tick", ({ remainingSeconds, totalSeconds }) => {
        this.timer.update(remainingSeconds, totalSeconds);
      }),
    );

    this.track(
      bus.on("round:bettingOpen", ({ durationSeconds }) => {
        this.banner.hide();
        this.setStatus(this.ctx.config.strings.placeYourBets);
        if (durationSeconds > 0) {
          this.timer.start(this.ctx.config.strings.placeYourBets);
          this.timer.update(durationSeconds, durationSeconds);
        } else {
          this.timer.hideImmediately();
        }
        for (const spot of this.spots.values()) spot.setLocked(false);
        this.stepper.setEnabled(true);
        this.refreshControls();
      }),
    );

    this.track(
      bus.on("round:bettingClosed", () => {
        this.setStatus(this.ctx.config.strings.betsClosed);
        this.timer.stop(this.ctx.config.strings.betsClosed);
        for (const spot of this.spots.values()) spot.setLocked(true);
        this.stepper.setEnabled(false);
        this.refreshControls();
      }),
    );

    this.track(
      bus.on("hand:scoreChanged", ({ player, banker }) => {
        this.playerZone.setHandPresent(true);
        this.bankerZone.setHandPresent(true);
        this.playerZone.setTotal(player);
        this.bankerZone.setTotal(banker);
      }),
    );

    this.track(
      bus.on("round:result", ({ result }) => {
        this.lastResult = result;

        if (result.outcome === RoundOutcome.Player) {
          this.playerZone.playWin();
          this.bankerZone.playLose();
        } else if (result.outcome === RoundOutcome.Banker) {
          this.bankerZone.playWin();
          this.playerZone.playLose();
        } else {
          this.playerZone.playWin();
          this.bankerZone.playWin();
        }
      }),
    );

    this.track(
      bus.on("round:settled", ({ settlements, netProfit, totalStake }) => {
        // The banner carries the outcome, so the phase line gets out of its way.
        this.statusMessage.visible = false;
        this.statusPlate.visible = false;
        this.presentSettlements(settlements, netProfit, totalStake);
      }),
    );

    this.track(bus.on("round:reset", () => this.resetTable()));

    this.track(
      bus.on("roadmap:updated", ({ snapshot }) => {
        this.resultsPanel.render(snapshot.beadPlate, true);
        this.roadmap.render(snapshot, true);
      }),
    );

    this.track(
      bus.on("shoe:changed", () => {
        void this.deck.shuffle();
      }),
    );

    this.track(
      bus.on("round:burn", ({ cards }) => {
        const local = this.deck.toLocal(this.discardTray.toGlobal({ x: 0, y: 0 }));
        void this.deck.burn(local.x, local.y, cards.length);
      }),
    );

    this.track(
      bus.on("state:changed", ({ to }) => {
        const dealing =
          to === GameState.Dealing || to === GameState.PlayerDraw || to === GameState.BankerDraw;
        if (dealing) this.setStatus(this.ctx.config.strings.dealing);
        // Dim the layout while cards are in the air so the table reads clearly.
        this.ctx.animation.to(this.betLayer, {
          alpha: dealing ? 0.62 : 1,
          duration: 0.3,
          ease: Ease.uiOut,
        });
        this.refreshControls();
      }),
    );

    this.track(
      bus.on("audio:muteChanged", ({ muted }) => this.buttons.sound.setActive(muted)),
    );
  }

  private bindShortcuts(): void {
    const input = this.ctx.input;
    for (let i = 0; i < 9; i++) {
      this.track(input.registerShortcut(String(i + 1), () => this.ctx.bets.selectChip(i)));
    }
    this.track(input.registerShortcut("u", () => this.ctx.bets.undo()));
    this.track(input.registerShortcut("r", () => this.ctx.bets.repeat()));
    this.track(input.registerShortcut("d", () => this.ctx.bets.double()));
    this.track(input.registerShortcut("c", () => this.ctx.bets.clear()));
    this.track(input.registerShortcut("m", () => this.toggleSound()));
    this.track(input.registerShortcut("h", () => this.toggleResults()));
    this.track(input.registerShortcut("i", () => this.infoPanel.toggle()));
    this.track(input.registerShortcut(" ", () => this.requestDeal()));
    this.track(input.registerShortcut("enter", () => this.requestDeal()));
  }

  /* ---------------------------------------------------------------- *
   * Actions
   * ---------------------------------------------------------------- */

  private requestDeal(): void {
    if (this.ctx.bets.requestDeal()) return;
    this.flashStatus(this.ctx.config.strings.noBet);
  }

  private toggleResults(): void {
    const open = this.resultsPanel.toggle();
    this.buttons.history.setActive(open);
  }

  private toggleSound(): void {
    const muted = this.ctx.audio.toggleMute();
    this.ctx.bus.emit("audio:muteChanged", { muted });
  }

  private setStatus(text: string): void {
    this.statusMessage.text = text.toUpperCase();
    this.statusMessage.setTint(0xffffff);
    this.statusMessage.visible = true;
    this.statusPlate.visible = true;
    this.drawStatusPlate();
  }

  /** A dark lozenge behind the phase line so it never fights the felt. */
  private drawStatusPlate(): void {
    const w = this.statusMessage.textWidth + 64;
    const h = this.statusMessage.textHeight + 22;
    this.statusPlate
      .clear()
      .roundRect(-w / 2, -h / 2, w, h, h / 2)
      .fill({ color: 0x05070c, alpha: 0.62 })
      .roundRect(-w / 2, -h / 2, w, h, h / 2)
      .stroke({ width: 1.5, color: this.ctx.config.theme.gold, alpha: 0.4 });
    this.statusPlate.position.set(this.statusMessage.x, this.statusMessage.y);
  }

  /** Momentary warning — reverts to the phase message afterwards. */
  private flashStatus(text: string): void {
    this.statusMessage.text = text.toUpperCase();
    this.statusMessage.setTint(Palette.danger);
    this.drawStatusPlate();
    this.ctx.animation.killTweensOf(this.statusMessage.scale);
    this.ctx.animation.fromTo(
      this.statusMessage.scale,
      { x: 1.25, y: 1.25 },
      { x: 1, y: 1, duration: 0.3, ease: Ease.uiIn },
    );
    this.ctx.animation.delayedCall(1.6, () => {
      if (this.ctx.bets.isBettingOpen) this.setStatus(this.ctx.config.strings.placeYourBets);
    });
  }

  private refreshControls(): void {
    const bets = this.ctx.bets;
    const open = bets.isBettingOpen;

    this.buttons.clear.setEnabled(open && bets.total > 0);
    this.buttons.undo.setEnabled(bets.canUndo);
    this.buttons.repeat.setEnabled(bets.canRepeat);
    this.buttons.double.setEnabled(bets.canDouble);

    // A timed table deals on its own clock, so Deal is only live on manual ones.
    const manual = this.ctx.config.roundMode === "manual";
    this.buttons.deal.visible = manual;
    this.buttons.deal.setEnabled(manual && bets.canDeal);
  }

  /* ---------------------------------------------------------------- *
   * Result presentation
   * ---------------------------------------------------------------- */

  private presentSettlements(
    settlements: readonly BetSettlement[],
    netProfit: number,
    totalStake: number,
  ): void {
    const playerPoint = this.stepper.originGlobal();
    const housePoint = this.deck.toGlobal({ x: 0, y: 0 });

    for (const settlement of settlements) {
      const spot = this.spots.get(settlement.betType);
      if (!spot) continue;

      if (settlement.won === true) {
        spot.playWin();
        spot.stack.collect(playerPoint);
      } else if (settlement.won === false) {
        spot.playLose();
        spot.stack.sweep(housePoint);
      }
      // A push leaves the chips where they are until the table clears.
    }

    if (this.lastResult) this.banner.show(this.lastResult, netProfit, totalStake);
  }

  private resetTable(): void {
    this.lastResult = null;
    this.banner.hide();
    this.playerZone.reset();
    this.bankerZone.reset();
    for (const spot of this.spots.values()) {
      spot.resetPresentation();
      spot.setAmount(0);
    }
    this.betLayer.alpha = 1;
    this.refreshControls();
  }

  /* ---------------------------------------------------------------- *
   * Config
   * ---------------------------------------------------------------- */

  /** Re-reads config after `updateConfig()`. */
  applyConfig(): void {
    // Order matters: every holder of an atlas texture must re-resolve before
    // the engine frees the atlas it replaced.
    const strings = this.ctx.config.strings;
    this.felt.texture = this.ctx.assets.get("fx_vignette");
    this.chipPool.forEach((chip) => chip.refreshTextures());
    this.stepper.refresh();

    this.spots.get(BetType.Player)?.setLabel(strings.player);
    this.spots.get(BetType.Banker)?.setLabel(strings.banker);
    this.spots.get(BetType.Tie)?.setLabel(strings.tie);
    for (const spot of this.spots.values()) spot.refreshLabels();

    this.deck.refreshTextures();
    this.playerZone.setLabel(strings.player);
    this.bankerZone.setLabel(strings.banker);
    this.banner.refreshTextures();
    this.limitSign.refresh();
    this.statusBar.refreshLabels();
    this.buttons.clear.setCaption(strings.clearBet);
    this.buttons.deal.setCaption(strings.deal);
    this.infoPanel.refresh();
    this.ctx.cards.refreshTextures();
    this.ctx.cards.relayout();
    this.roadmap.render(this.ctx.roadmaps.snapshot, false);
    this.resultsPanel.render(this.ctx.roadmaps.snapshot.beadPlate, false);
    this.layout(this.ctx.metrics);
  }

  /* ---------------------------------------------------------------- *
   * Layout
   * ---------------------------------------------------------------- */

  layout(metrics: ViewportMetrics): void {
    this.scale.set(metrics.scale);
    const w = metrics.designWidth;
    const h = metrics.designHeight;

    this.drawTable(w, h);
    if (metrics.isPortrait) this.layoutPortrait(w, h);
    else this.layoutLandscape(w, h);

    this.infoPanel.position.set(w / 2, h / 2);
    this.infoPanel.resizeTo(w, h);
    this.ctx.cards.relayout();
  }

  /**
   * The felt is an oversized oval whose top runs off screen, lit from the
   * middle and rimmed with a leather rail along the near edge — the geometry
   * that makes a flat canvas read as a table seen from a player's seat.
   */
  private drawTable(w: number, h: number): void {
    const theme = this.ctx.config.theme;
    const cx = w / 2;
    const cy = h * 0.04;
    const rx = w * 0.78;
    const ry = h * 0.86;

    this.voidFill.clear().rect(0, 0, w, h).fill(0x05070a);
    this.feltMask.clear().ellipse(cx, cy, rx, ry).fill(0xffffff);

    this.felt.position.set(cx, cy);
    const cover = Math.max(rx, ry) * 2.1;
    this.felt.width = cover;
    this.felt.height = cover;

    this.rail
      .clear()
      .ellipse(cx, cy, rx, ry)
      .stroke({ width: h * 0.085, color: theme.rail, alpha: 1 })
      .ellipse(cx, cy, rx, ry)
      .stroke({ width: h * 0.02, color: 0x000000, alpha: 0.35 })
      .ellipse(cx, cy, rx - h * 0.045, ry - h * 0.045)
      .stroke({ width: 2, color: 0xffffff, alpha: 0.08 });
  }

  private layoutLandscape(w: number, h: number): void {
    const margin = Math.max(14, w * 0.012);
    const statusHeight = clamp(h * 0.065, 46, 70);

    /* --- Table furniture across the back ------------------------------ */
    const rackWidth = Math.min(560, w * 0.3);
    const rackHeight = Math.min(78, h * 0.075);
    this.chipRack.position.set(w * 0.5, rackHeight * 0.42);
    this.chipRack.resizeTo(rackWidth, rackHeight);

    const signWidth = Math.min(330, w * 0.185);
    this.limitSign.position.set(w * 0.26, h * 0.1);
    this.limitSign.resizeTo(signWidth);

    const shoeWidth = Math.min(190, w * 0.11);
    this.shoeCase.position.set(w * 0.78, h * 0.09);
    this.shoeCase.resizeTo(shoeWidth, shoeWidth * 0.78);

    this.logo.position.set(w * 0.5, h * 0.2);
    this.logo.resizeTo(Math.min(760, w * 0.42));

    /* --- Shoe and discard, where cards come from and go --------------- */
    this.deck.position.set(w * 0.782, h * 0.145);
    this.deck.scale.set(clamp(h / 1400, 0.42, 0.72));
    this.deck.setHousingVisible(false);

    this.drawDiscardTray(112, 80);
    this.discardTray.position.set(w * 0.075, h * 0.1);

    /* --- Wager bands, stacked and widening downward ------------------- */
    const bandHeight = clamp(h * 0.1, 62, 104);
    const bandGap = bandHeight * 0.58;
    const bandCentre = w * 0.5;
    const bandBaseWidth = Math.min(520, w * 0.28);
    const tieY = h * 0.43;
    this.layoutBands(bandCentre, tieY, bandHeight, bandGap, bandBaseWidth);

    /* --- Results rail, right edge -------------------------------------- */
    const panelWidth = Math.min(250, w * 0.14);
    const panelHeight = Math.min(430, h * 0.44);
    const railLeft = w - margin - panelWidth;
    this.resultsPanel.position.set(railLeft, h * 0.2);
    this.resultsPanel.resizeTo(panelWidth, panelHeight);
    this.roadmap.visible = false;

    /* --- Hands: sized to the gap between the bands and the rail --------- */
    // Deriving the card scale from the measured gap — rather than from a fixed
    // fraction of the viewport — is what stops a three-card hand sliding under
    // the scoreboard: the third card lies sideways and needs real room.
    const widestBand = bandBaseWidth * 1.12;
    const bandEdge = bandCentre + widestBand / 2;
    const gap = railLeft - bandEdge - HAND_GUTTER * 2;
    const handScale = clamp((gap - THIRD_CARD_PAD) / HAND_SPAN_PER_SCALE, 0.45, 0.92);
    const handY = h * 0.47;
    const zoneWidth = Math.min(gap, 400);
    const bankerX = (bandEdge + railLeft) / 2;
    this.layoutHand(this.playerZone, this.playerAnchor, w - bankerX, handY, zoneWidth, handScale);
    this.layoutHand(this.bankerZone, this.bankerAnchor, bankerX, handY, zoneWidth, handScale);

    /* --- Phase readout and countdown ---------------------------------- */
    this.statusMessage.position.set(w * 0.5, h * 0.285);
    this.statusMessage.setFontScale(clamp(w / 1900, 0.7, 1.15));
    this.drawStatusPlate();
    this.timer.position.set(w * 0.5, h * 0.285);
    this.timer.setRadius(clamp(h * 0.06, 34, 62));

    /* --- Near rail: stepper left, actions right ----------------------- */
    const controlY = h - statusHeight - clamp(h * 0.11, 60, 108);
    const stepperWidth = Math.min(430, w * 0.26);
    const stepperHeight = clamp(h * 0.105, 62, 104);
    this.stepper.position.set(w * 0.175, controlY);
    this.stepper.resizeTo(stepperWidth, stepperHeight);

    const radius = clamp(h * 0.048, 28, 50);
    // Wide enough that the Indonesian captions sit side by side without touching.
    const spacing = Math.max(radius * 2.55, Math.min(w * 0.115, 210));
    const rightX = w - margin - radius * 1.4;
    this.placeButton(this.buttons.history, rightX, controlY, radius);
    this.placeButton(this.buttons.deal, rightX - spacing, controlY, radius);
    this.placeButton(this.buttons.clear, rightX - spacing * 2, controlY, radius);
    this.buttons.deal.setCaptionMaxWidth(spacing * 0.94);
    this.buttons.clear.setCaptionMaxWidth(spacing * 0.94);

    // Undo / repeat / double sit between the stepper and the action cluster.
    const smallRadius = radius * 0.66;
    const smallGap = smallRadius * 2.5;
    const smallX = w * 0.175 + stepperWidth / 2 + smallRadius * 2;
    this.placeButton(this.buttons.undo, smallX, controlY, smallRadius);
    this.placeButton(this.buttons.repeat, smallX + smallGap, controlY, smallRadius);
    this.placeButton(this.buttons.double, smallX + smallGap * 2, controlY, smallRadius);
    this.setSecondaryVisible(true);

    /* --- Status strip -------------------------------------------------- */
    this.layoutStatusBar(w, h, statusHeight, false);

    /* --- Overlays ------------------------------------------------------ */
    this.banner.position.set(w * 0.5, h * 0.28);
    this.banner.resizeTo(Math.min(620, w * 0.36), clamp(h * 0.2, 130, 190));
  }

  private layoutPortrait(w: number, h: number): void {
    const margin = Math.max(12, w * 0.03);
    const statusHeight = clamp(h * 0.042, 42, 64);

    const rackWidth = Math.min(w * 0.62, 620);
    const rackHeight = clamp(h * 0.032, 40, 66);
    this.chipRack.position.set(w * 0.56, rackHeight * 0.42);
    this.chipRack.resizeTo(rackWidth, rackHeight);

    const signWidth = Math.min(w * 0.3, 300);
    this.limitSign.position.set(margin + signWidth * 0.5, h * 0.045);
    this.limitSign.resizeTo(signWidth);

    const shoeWidth = Math.min(w * 0.17, 180);
    this.shoeCase.position.set(w - margin - shoeWidth * 0.5, h * 0.05);
    this.shoeCase.resizeTo(shoeWidth, shoeWidth * 0.78);

    this.logo.position.set(w * 0.5, h * 0.115);
    this.logo.resizeTo(Math.min(700, w * 0.72));

    this.deck.position.set(w - margin - shoeWidth * 0.5, h * 0.075);
    this.deck.scale.set(clamp(w / 1900, 0.28, 0.5));
    this.deck.setHousingVisible(false);

    this.drawDiscardTray(92, 68);
    this.discardTray.position.set(margin + 52, h * 0.16);

    /* --- Hands sit side by side above the wager bands ------------------ */
    // Same reasoning as landscape: the limit is how far the sideways third
    // card reaches toward the screen edge, so size the cards from that.
    const playerX = w * 0.26;
    const outwardRoom = playerX - margin;
    const handScale = clamp((outwardRoom - THIRD_CARD_PAD) / OUTWARD_SPAN_PER_SCALE, 0.45, 0.95);
    const handY = h * 0.34;
    const zoneWidth = Math.min(w * 0.46, 460);
    this.layoutHand(this.playerZone, this.playerAnchor, playerX, handY, zoneWidth, handScale);
    this.layoutHand(this.bankerZone, this.bankerAnchor, w - playerX, handY, zoneWidth, handScale);

    this.statusMessage.position.set(w * 0.5, h * 0.465);
    this.statusMessage.setFontScale(clamp(w / 1100, 0.6, 1));
    this.drawStatusPlate();
    this.timer.position.set(w * 0.5, h * 0.465);
    this.timer.setRadius(clamp(h * 0.03, 28, 52));

    /* --- Wager bands -------------------------------------------------- */
    const bandHeight = clamp(h * 0.058, 56, 96);
    const bandGap = bandHeight * 0.5;
    this.layoutBands(w * 0.5, h * 0.55, bandHeight, bandGap, Math.min(w * 0.66, 640));

    /* --- Results panel floats over the upper felt --------------------- */
    // Too narrow for a permanent rail, so the list floats over the felt and
    // starts closed — the history button brings it up on demand.
    const panelWidth = Math.min(w * 0.56, 420);
    const panelHeight = Math.min(h * 0.26, 460);
    this.resultsPanel.position.set((w - panelWidth) / 2, h * 0.15);
    this.resultsPanel.resizeTo(panelWidth, panelHeight);
    this.roadmap.visible = false;
    if (!this.portraitPanelInitialised) {
      this.portraitPanelInitialised = true;
      this.resultsPanel.setOpen(false);
      this.buttons.history.setActive(false);
    }

    /* --- Controls: actions on the edges, stepper centred -------------- */
    const radius = clamp(w * 0.062, 26, 52);
    const actionY = h * 0.775;
    // Anchor by the pill, not the disc: the caption is wider than the button
    // and would otherwise run off the edge of a narrow screen.
    const captionBudget = Math.min(w * 0.32, radius * 4.4);
    const edgeInset = margin + captionBudget / 2;
    this.placeButton(this.buttons.clear, edgeInset, actionY, radius);
    this.placeButton(this.buttons.deal, w - edgeInset, actionY, radius);
    this.buttons.clear.setCaptionMaxWidth(captionBudget);
    this.buttons.deal.setCaptionMaxWidth(captionBudget);
    this.placeButton(this.buttons.history, w * 0.5, actionY - radius * 0.1, radius * 0.72);

    const smallRadius = radius * 0.58;
    const smallGap = smallRadius * 2.6;
    this.placeButton(this.buttons.undo, w * 0.5 - smallGap, actionY + radius * 1.55, smallRadius);
    this.placeButton(this.buttons.repeat, w * 0.5, actionY + radius * 1.55, smallRadius);
    this.placeButton(this.buttons.double, w * 0.5 + smallGap, actionY + radius * 1.55, smallRadius);
    this.setSecondaryVisible(true);

    const stepperWidth = Math.min(w * 0.72, 520);
    const stepperHeight = clamp(h * 0.05, 58, 96);
    this.stepper.position.set(w * 0.5, h - statusHeight - stepperHeight * 0.85);
    this.stepper.resizeTo(stepperWidth, stepperHeight);

    this.layoutStatusBar(w, h, statusHeight, true);

    this.banner.position.set(w * 0.5, h * 0.42);
    this.banner.resizeTo(Math.min(620, w * 0.86), clamp(h * 0.11, 120, 200));
  }

  /**
   * Three concentric arcs: Tie at the top, then Banker, then Player nearest the
   * player's edge, each a little wider than the one above so they read as bands
   * on a curved table rather than a stack of boxes.
   */
  private layoutBands(
    centreX: number,
    topY: number,
    bandHeight: number,
    gap: number,
    baseWidth: number,
  ): void {
    const order: BetType[] = [BetType.Tie, BetType.Banker, BetType.Player];
    const layouts = new Map<BetType, SpotLayout>();

    order.forEach((betType, index) => {
      layouts.set(betType, {
        x: centreX,
        y: topY + index * (bandHeight + gap),
        width: baseWidth * (1 + index * 0.06),
        height: bandHeight,
      });
    });

    // Side bets, when enabled, ride as a narrower row beneath the main bands.
    if (this.ctx.config.features.sidebets) {
      const sideY = topY + order.length * (bandHeight + gap) + bandHeight * 0.35;
      const sideWidth = baseWidth * 0.3;
      const sideOrder = [
        BetType.PlayerPair,
        BetType.PerfectPair,
        BetType.Natural,
        BetType.BankerPair,
      ];
      const step = sideWidth + gap * 0.6;
      const start = centreX - (step * (sideOrder.length - 1)) / 2;
      sideOrder.forEach((betType, index) => {
        layouts.set(betType, {
          x: start + index * step,
          y: sideY,
          width: sideWidth,
          height: bandHeight * 0.66,
        });
      });
    }

    this.drawFeltTrim(centreX, topY, bandHeight, gap, baseWidth, order.length);

    for (const [betType, spot] of this.spots) {
      const layout = layouts.get(betType);
      if (!layout) {
        spot.visible = false;
        continue;
      }
      spot.visible = true;
      spot.position.set(layout.x, layout.y);
      spot.resizeTo(layout.width, layout.height, layout.height * 0.14);
    }
  }

  private layoutStatusBar(w: number, h: number, height: number, compact: boolean): void {
    const radius = height * 0.34;
    const pad = compact ? 8 : 14;

    this.statusBar.position.set(0, h - height);
    this.statusBar.resizeTo(w, height, compact, pad * 2 + radius * 4.4);

    const y = h - height / 2;
    this.placeButton(this.buttons.info, pad + radius * 1.2, y, radius);
    this.placeButton(this.buttons.sound, pad + radius * 3.6, y, radius);
  }

  /** The dealer's discard tray, where spent cards are swept. */
  private drawDiscardTray(width: number, height: number): void {
    const hw = width / 2;
    const hh = height / 2;
    this.discardTray
      .clear()
      .roundRect(-hw, -hh, width, height, 10)
      .fill({ color: 0x16323d, alpha: 0.95 })
      .roundRect(-hw + 5, -hh + 5, width - 10, height - 10, 7)
      .fill({ color: 0x0b1c24, alpha: 0.95 })
      .roundRect(-hw, -hh, width, height, 10)
      .stroke({ width: 2, color: 0x2f7286, alpha: 0.85 })
      .moveTo(-hw + 8, -hh + 9)
      .lineTo(hw - 8, -hh + 9)
      .stroke({ width: 2, color: 0xffffff, alpha: 0.12 });
  }

  /**
   * The gold hairlines that frame the wager area.
   *
   * A real baccarat felt is *printed*: the zones sit inside concentric arcs
   * that follow the table edge. Two of them, above and below the bands, is
   * enough to stop the layout floating in the middle of a plain gradient.
   */
  private drawFeltTrim(
    centreX: number,
    topY: number,
    bandHeight: number,
    gap: number,
    baseWidth: number,
    bandCount: number,
  ): void {
    const gold = this.ctx.config.theme.gold;
    const bottomY = topY + (bandCount - 1) * (bandHeight + gap);

    const arc = (y: number, halfWidth: number, bow: number, alpha: number): void => {
      this.feltTrim
        .moveTo(centreX - halfWidth, y)
        .quadraticCurveTo(centreX, y + bow, centreX + halfWidth, y)
        .stroke({ width: 2, color: gold, alpha });
    };

    // Kept narrower than the hand zones on either side: a trim line that runs
    // under a name banner reads as a mistake, not as decoration.
    this.feltTrim.clear();
    arc(topY - bandHeight * 0.78, baseWidth * 0.5, bandHeight * 0.34, 0.45);
    arc(topY - bandHeight * 0.68, baseWidth * 0.46, bandHeight * 0.3, 0.2);
    arc(bottomY + bandHeight * 0.86, baseWidth * 0.58, bandHeight * 0.4, 0.45);
    arc(bottomY + bandHeight * 0.97, baseWidth * 0.62, bandHeight * 0.44, 0.2);
  }

  /** Places a hand zone and parks the card anchor on its printed slots. */
  private layoutHand(
    zone: HandZone,
    anchor: Container,
    x: number,
    y: number,
    width: number,
    cardScale: number,
  ): void {
    zone.position.set(x, y);
    zone.resizeTo(width, cardScale);
    anchor.position.set(x, y + zone.cardAnchorY);
    anchor.scale.set(cardScale);
  }

  private placeButton(button: ActionButton, x: number, y: number, radius: number): void {
    button.position.set(x, y);
    button.setRadius(radius);
  }

  /**
   * Undo / repeat / double share one recessed plate. Loose icon buttons on an
   * open felt read as debug controls; grouping them makes them a toolbar.
   */
  private setSecondaryVisible(visible: boolean): void {
    this.buttons.undo.visible = visible;
    this.buttons.repeat.visible = visible;
    this.buttons.double.visible = visible;
    this.secondaryPlate.visible = visible;
    if (!visible) return;

    const radius = this.buttons.undo.currentRadius;
    const left = this.buttons.undo.x;
    const right = this.buttons.double.x;
    const y = this.buttons.undo.y;
    const padX = radius * 0.75;
    const height = radius * 2 + radius * 0.6;

    this.secondaryPlate
      .clear()
      .roundRect(left - radius - padX, y - height / 2, right - left + (radius + padX) * 2, height, height / 2)
      .fill({ color: 0x05070c, alpha: 0.45 })
      .roundRect(left - radius - padX, y - height / 2, right - left + (radius + padX) * 2, height, height / 2)
      .stroke({ width: 1.5, color: this.ctx.config.theme.gold, alpha: 0.28 });
  }

  /* ---------------------------------------------------------------- *
   * Teardown
   * ---------------------------------------------------------------- */

  override destroy(): void {
    for (const spot of this.spots.values()) spot.destroy();
    this.spots.clear();
    this.chipPool.destroy();
    this.felt.mask = null;
    super.destroy();
  }
}
