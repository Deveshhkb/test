import { Container, Graphics, Sprite } from "pixi.js";

import { CHIP_SIZE, Depth, POOL_SIZE_CHIPS, Palette } from "../Constants";
import { ObjectPool } from "../core/ObjectPool";
import { BettingSpot, type BettingSpotOptions } from "../objects/BettingSpot";
import { Button } from "../objects/Button";
import { Chip } from "../objects/Chip";
import { ChipTray } from "../objects/ChipTray";
import { Deck } from "../objects/Deck";
import { InfoBar } from "../objects/InfoBar";
import { ResultBanner } from "../objects/ResultBanner";
import { RoadMap } from "../objects/RoadMap";
import { ScorePlate } from "../objects/ScoreBoard";
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

interface SpotLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The table.
 *
 * Composes every display object, wires them to the event bus, and owns the two
 * layouts (landscape and portrait). It contains no game logic whatsoever: it
 * reacts to events and asks managers for actions. That separation is what lets
 * the entire look be replaced without touching a rule.
 */
export class GameScene extends Scene {
  /* Display -------------------------------------------------------- */
  private readonly background = new Sprite();
  private readonly feltArt = new Graphics();
  private readonly tableLayer = new Container();
  private readonly betLayer = new Container();
  private readonly cardLayer = new Container();
  private readonly hudLayer = new Container();
  private readonly overlayLayer = new Container();

  private readonly deck: Deck;
  private readonly discardTray = new Graphics();
  private readonly playerAnchor = new Container();
  private readonly bankerAnchor = new Container();
  private readonly playerPlate: ScorePlate;
  private readonly bankerPlate: ScorePlate;
  private readonly timer: Timer;
  private readonly infoBar: InfoBar;
  private readonly roadmap: RoadMap;
  private readonly banner: ResultBanner;
  private readonly chipTray: ChipTray;

  private readonly chipPool: ObjectPool<Chip>;
  private readonly spots = new Map<BetType, BettingSpot>();
  private readonly buttons: Record<"undo" | "repeat" | "double" | "clear" | "sound", Button>;

  private houseAnchor = { x: 0, y: 0 };
  private lastResult: RoundResult | null = null;

  constructor(...args: ConstructorParameters<typeof Scene>) {
    super(...args);

    this.chipPool = new ObjectPool<Chip>(() => new Chip(this.ctx), {
      initial: 24,
      max: POOL_SIZE_CHIPS,
      name: "chips",
    });

    this.background.anchor.set(0.5);
    this.background.texture = this.ctx.assets.get("fx_vignette");

    this.deck = new Deck(this.ctx);
    this.playerPlate = new ScorePlate(this.ctx, HandSide.Player);
    this.bankerPlate = new ScorePlate(this.ctx, HandSide.Banker);
    this.timer = new Timer(this.ctx);
    this.infoBar = new InfoBar(this.ctx);
    this.roadmap = new RoadMap(this.ctx);
    this.banner = new ResultBanner(this.ctx);
    this.chipTray = new ChipTray(this.ctx);

    this.buttons = {
      undo: new Button(this.ctx, { label: "Undo", onTap: () => this.ctx.bets.undo() }),
      repeat: new Button(this.ctx, { label: "Repeat", onTap: () => this.ctx.bets.repeat() }),
      double: new Button(this.ctx, { label: "Double", onTap: () => this.ctx.bets.double() }),
      clear: new Button(this.ctx, { label: "Clear", onTap: () => this.ctx.bets.clear() }),
      sound: new Button(this.ctx, { label: "Sound", onTap: () => this.toggleSound() }),
    };

    this.buildLayers();
    this.buildSpots();
  }

  private buildLayers(): void {
    this.tableLayer.addChild(this.feltArt, this.discardTray, this.deck);
    this.cardLayer.addChild(this.playerAnchor, this.bankerAnchor);
    this.hudLayer.addChild(
      this.infoBar,
      this.roadmap,
      this.playerPlate,
      this.bankerPlate,
      this.timer,
      this.chipTray,
    );
    for (const button of Object.values(this.buttons)) this.hudLayer.addChild(button);
    this.overlayLayer.addChild(this.banner);

    this.background.zIndex = Depth.Background;
    this.tableLayer.zIndex = Depth.TableFelt;
    this.betLayer.zIndex = Depth.BettingLayer;
    this.cardLayer.zIndex = Depth.CardLayer;
    this.hudLayer.zIndex = Depth.HudLayer;
    this.overlayLayer.zIndex = Depth.OverlayLayer;

    this.addChild(
      this.background,
      this.tableLayer,
      this.betLayer,
      this.cardLayer,
      this.hudLayer,
      this.overlayLayer,
    );
    this.sortableChildren = true;
  }

  /** The layout is data — adding a side bet means adding a row here. */
  private buildSpots(): void {
    const theme = this.ctx.config.theme;
    const definitions: BettingSpotOptions[] = [
      { betType: BetType.Player, label: "Player", color: theme.player, shape: "left-trapezoid", primary: true },
      { betType: BetType.Tie, label: "Tie", color: theme.tie, shape: "hex", primary: true },
      { betType: BetType.Banker, label: "Banker", color: theme.banker, shape: "right-trapezoid", primary: true },
    ];

    if (this.ctx.config.features.sidebets) {
      definitions.push(
        { betType: BetType.PlayerPair, label: "P Pair", color: theme.player },
        { betType: BetType.PerfectPair, label: "Perfect Pair", color: theme.pair },
        { betType: BetType.Natural, label: "Natural", color: theme.gold },
        { betType: BetType.BankerPair, label: "B Pair", color: theme.banker },
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

    this.infoBar.setBalance(this.ctx.bets.currentBalance, false);
    this.roadmap.render(this.ctx.roadmaps.snapshot, false);
    this.deck.startIdle();
    this.refreshControls();
  }

  private bindEvents(): void {
    const bus = this.ctx.bus;

    this.track(
      bus.on("bet:changed", ({ bets, total }) => {
        const origin = this.chipTray.originGlobal();
        for (const [betType, spot] of this.spots) {
          spot.setAmount(bets[betType] ?? 0, origin);
        }
        this.infoBar.setBet(total);
        this.infoBar.setPotentialWin(this.ctx.bets.potentialWin());
        this.infoBar.setCommission(this.ctx.bets.pendingCommission());
        this.refreshControls();
      }),
    );

    this.track(
      bus.on("bet:chipSelected", ({ index }) => this.chipTray.setSelected(index)),
    );

    this.track(
      bus.on("bet:rejected", ({ betType }) => {
        this.spots.get(betType)?.setHovering(false);
      }),
    );

    this.track(bus.on("balance:changed", ({ balance }) => this.infoBar.setBalance(balance)));

    this.track(
      bus.on("timer:tick", ({ remainingSeconds, totalSeconds }) => {
        this.timer.update(remainingSeconds, totalSeconds);
      }),
    );

    this.track(
      bus.on("round:bettingOpen", ({ durationSeconds }) => {
        this.banner.hide();
        this.timer.start();
        this.timer.update(durationSeconds, durationSeconds);
        for (const spot of this.spots.values()) spot.setLocked(false);
        this.chipTray.setEnabled(true);
        this.refreshControls();
      }),
    );

    this.track(
      bus.on("round:bettingClosed", () => {
        this.timer.stop();
        for (const spot of this.spots.values()) spot.setLocked(true);
        this.chipTray.setEnabled(false);
        this.refreshControls();
      }),
    );

    this.track(
      bus.on("hand:scoreChanged", ({ player, banker }) => {
        this.playerPlate.setTotal(player);
        this.bankerPlate.setTotal(banker);
      }),
    );

    this.track(
      bus.on("round:result", ({ result }) => {
        this.lastResult = result;
        this.playerPlate.setPair(result.playerPair);
        this.bankerPlate.setPair(result.bankerPair);

        if (result.outcome === RoundOutcome.Player) {
          this.playerPlate.playWin();
          this.bankerPlate.playLose();
        } else if (result.outcome === RoundOutcome.Banker) {
          this.bankerPlate.playWin();
          this.playerPlate.playLose();
        } else {
          this.playerPlate.playWin();
          this.bankerPlate.playWin();
        }
      }),
    );

    this.track(
      bus.on("round:settled", ({ settlements, netProfit, totalStake }) => {
        this.presentSettlements(settlements, netProfit, totalStake);
      }),
    );

    this.track(bus.on("round:reset", () => this.resetTable()));

    this.track(
      bus.on("roadmap:updated", ({ snapshot }) => this.roadmap.render(snapshot, true)),
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
        // Dim the layout while cards are in the air so the table reads clearly.
        const dealing = to === GameState.Dealing || to === GameState.PlayerDraw || to === GameState.BankerDraw;
        this.ctx.animation.to(this.betLayer, {
          alpha: dealing ? 0.72 : 1,
          duration: 0.3,
          ease: Ease.uiOut,
        });
      }),
    );

    this.track(
      bus.on("audio:muteChanged", ({ muted }) => {
        this.buttons.sound.setLabel(muted ? "Muted" : "Sound");
      }),
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
  }

  private toggleSound(): void {
    const muted = this.ctx.audio.toggleMute();
    this.ctx.bus.emit("audio:muteChanged", { muted });
  }

  private refreshControls(): void {
    const bets = this.ctx.bets;
    this.buttons.undo.setEnabled(bets.canUndo);
    this.buttons.repeat.setEnabled(bets.canRepeat);
    this.buttons.double.setEnabled(bets.canDouble);
    this.buttons.clear.setEnabled(bets.isBettingOpen && bets.total > 0);
  }

  /* ---------------------------------------------------------------- *
   * Result presentation
   * ---------------------------------------------------------------- */

  private presentSettlements(
    settlements: readonly BetSettlement[],
    netProfit: number,
    totalStake: number,
  ): void {
    const playerPoint = this.chipTray.originGlobal();
    const housePoint = this.houseGlobal();

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

  private houseGlobal(): { x: number; y: number } {
    const point = this.deck.toGlobal({ x: 0, y: 0 });
    this.houseAnchor = { x: point.x, y: point.y };
    return this.houseAnchor;
  }

  private resetTable(): void {
    this.lastResult = null;
    this.banner.hide();
    this.playerPlate.reset();
    this.bankerPlate.reset();
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
    this.background.texture = this.ctx.assets.get("fx_vignette");
    this.chipPool.forEach((chip) => chip.refreshTextures());
    this.chipTray.refresh();
    for (const spot of this.spots.values()) spot.refreshLabels();
    this.deck.refreshTextures();
    this.playerPlate.refreshTextures();
    this.bankerPlate.refreshTextures();
    this.banner.refreshTextures();
    this.infoBar.refreshLabels();
    this.ctx.cards.refreshTextures();
    this.ctx.cards.relayout();
    this.roadmap.render(this.ctx.roadmaps.snapshot, false);
    this.layout(this.ctx.metrics);
  }

  /* ---------------------------------------------------------------- *
   * Layout
   * ---------------------------------------------------------------- */

  layout(metrics: ViewportMetrics): void {
    this.scale.set(metrics.scale);
    const w = metrics.designWidth;
    const h = metrics.designHeight;

    this.background.position.set(w / 2, h / 2);
    // Cover: the vignette must never show an edge.
    const cover = Math.max(w, h) * 1.25;
    this.background.width = cover;
    this.background.height = cover;

    if (metrics.isPortrait) this.layoutPortrait(w, h);
    else this.layoutLandscape(w, h);

    this.ctx.cards.relayout();
  }

  private layoutLandscape(w: number, h: number): void {
    const margin = Math.max(16, w * 0.012);

    // --- Top: wallet strip ---------------------------------------------
    const infoHeight = 76;
    this.infoBar.position.set(margin, margin);
    this.infoBar.resizeTo(w - margin * 2, infoHeight, false);

    // --- Roadmaps ------------------------------------------------------
    const roadHeight = Math.min(178, h * 0.17);
    const roadY = margin + infoHeight + 10;
    this.roadmap.position.set(margin, roadY);
    this.roadmap.resizeTo(w - margin * 2, roadHeight, false);
    this.roadmap.visible = this.ctx.config.features.roadmaps;

    // --- Table ---------------------------------------------------------
    const tableTop = this.roadmap.visible ? roadY + roadHeight + 12 : roadY;
    const controlsHeight = 172;
    const betRowsHeight = 262;
    const tableBottom = h - controlsHeight - betRowsHeight - margin;
    const tableHeight = Math.max(260, tableBottom - tableTop);
    // Cards shrink with the felt so a short viewport never crops a hand.
    const handScale = clamp(tableHeight / 430, 0.5, 1);

    this.drawFelt(margin, tableTop, w - margin * 2, tableHeight);

    this.deck.position.set(margin + 96, tableTop + tableHeight * 0.32);
    this.deck.scale.set(clamp(tableHeight / 420, 0.55, 1));

    this.discardTray.clear()
      .roundRect(-70, -50, 140, 100, 12)
      .fill({ color: 0x000000, alpha: 0.35 })
      .roundRect(-70, -50, 140, 100, 12)
      .stroke({ width: 1.5, color: Palette.gold, alpha: 0.25 });
    this.discardTray.position.set(w - margin - 96, tableTop + tableHeight * 0.32);

    const handY = tableTop + tableHeight * 0.72;
    this.playerAnchor.position.set(w * 0.3, handY);
    this.playerAnchor.scale.set(handScale);
    this.bankerAnchor.position.set(w * 0.7, handY);
    this.bankerAnchor.scale.set(handScale);

    const plateWidth = Math.min(240, w * 0.15);
    this.playerPlate.position.set(w * 0.3, tableTop + tableHeight * 0.15);
    this.playerPlate.resizeTo(plateWidth, 92);
    this.bankerPlate.position.set(w * 0.7, tableTop + tableHeight * 0.15);
    this.bankerPlate.resizeTo(plateWidth, 92);

    this.timer.position.set(w / 2, tableTop + tableHeight * 0.3);
    this.timer.setRadius(Math.min(66, tableHeight * 0.2));

    // --- Betting layout ------------------------------------------------
    const sideY = tableBottom + 60;
    const mainY = sideY + 172;
    this.layoutSpots(w, sideY, mainY, false);

    // --- Controls ------------------------------------------------------
    const controlY = h - margin - 58;
    const trayWidth = Math.min(w * 0.52, 780);
    this.chipTray.position.set(w / 2, controlY);
    this.chipTray.resizeTo(trayWidth, CHIP_SIZE + 28);

    const buttonWidth = Math.min(128, (w - trayWidth) / 2 / 2.4);
    const buttonHeight = 60;
    const leftX = w / 2 - trayWidth / 2 - buttonWidth / 2 - 16;
    const rightX = w / 2 + trayWidth / 2 + buttonWidth / 2 + 16;

    this.placeButton(this.buttons.clear, leftX - buttonWidth - 10, controlY, buttonWidth, buttonHeight);
    this.placeButton(this.buttons.undo, leftX, controlY, buttonWidth, buttonHeight);
    this.placeButton(this.buttons.repeat, rightX, controlY, buttonWidth, buttonHeight);
    this.placeButton(this.buttons.double, rightX + buttonWidth + 10, controlY, buttonWidth, buttonHeight);
    this.placeButton(this.buttons.sound, w - margin - 46, margin + infoHeight + 10 + roadHeight / 2, 78, 48);
    this.buttons.sound.visible = false;

    // Sits in the medallion above the hands: it carries both totals itself, so
    // covering the score plates costs no information — covering cards would.
    this.banner.position.set(w / 2, tableTop + tableHeight * 0.28);
    this.banner.resizeTo(Math.min(620, w * 0.4), Math.min(168, tableHeight * 0.46));
  }

  private layoutPortrait(w: number, h: number): void {
    const margin = Math.max(14, w * 0.03);

    const infoHeight = 92;
    this.infoBar.position.set(margin, margin);
    this.infoBar.resizeTo(w - margin * 2, infoHeight, true);

    const roadHeight = Math.min(300, h * 0.16);
    const roadY = margin + infoHeight + 10;
    this.roadmap.position.set(margin, roadY);
    this.roadmap.resizeTo(w - margin * 2, roadHeight, true);
    this.roadmap.visible = this.ctx.config.features.roadmaps;

    const tableTop = this.roadmap.visible ? roadY + roadHeight + 14 : roadY;
    const controlsHeight = 230;
    const betRowsHeight = 330;
    const tableBottom = h - controlsHeight - betRowsHeight - margin;
    const tableHeight = Math.max(300, tableBottom - tableTop);
    const handScale = clamp((w * 0.42) / 300, 0.45, 0.9);

    this.drawFelt(margin, tableTop, w - margin * 2, tableHeight);

    this.deck.position.set(margin + 78, tableTop + 96);
    this.deck.scale.set(0.72);

    this.discardTray.clear()
      .roundRect(-56, -42, 112, 84, 12)
      .fill({ color: 0x000000, alpha: 0.35 })
      .roundRect(-56, -42, 112, 84, 12)
      .stroke({ width: 1.5, color: Palette.gold, alpha: 0.25 });
    this.discardTray.position.set(w - margin - 78, tableTop + 96);

    this.timer.position.set(w / 2, tableTop + 96);
    this.timer.setRadius(58);

    const handY = tableTop + tableHeight * 0.72;
    this.playerAnchor.position.set(w * 0.26, handY);
    this.playerAnchor.scale.set(handScale);
    this.bankerAnchor.position.set(w * 0.74, handY);
    this.bankerAnchor.scale.set(handScale);

    const plateWidth = Math.min(210, w * 0.38);
    this.playerPlate.position.set(w * 0.26, tableTop + tableHeight * 0.42);
    this.playerPlate.resizeTo(plateWidth, 84);
    this.bankerPlate.position.set(w * 0.74, tableTop + tableHeight * 0.42);
    this.bankerPlate.resizeTo(plateWidth, 84);

    const sideY = tableBottom + 70;
    const mainY = sideY + 190;
    this.layoutSpots(w, sideY, mainY, true);

    const controlY = h - margin - 74;
    const trayWidth = w - margin * 2;
    this.chipTray.position.set(w / 2, controlY);
    this.chipTray.resizeTo(trayWidth, CHIP_SIZE * 0.8 + 24);

    const buttonWidth = (w - margin * 2 - 30) / 4;
    const buttonHeight = 56;
    const buttonY = controlY - CHIP_SIZE * 0.8 - 44;
    const startX = margin + buttonWidth / 2;
    this.placeButton(this.buttons.clear, startX, buttonY, buttonWidth, buttonHeight);
    this.placeButton(this.buttons.undo, startX + (buttonWidth + 10), buttonY, buttonWidth, buttonHeight);
    this.placeButton(this.buttons.repeat, startX + (buttonWidth + 10) * 2, buttonY, buttonWidth, buttonHeight);
    this.placeButton(this.buttons.double, startX + (buttonWidth + 10) * 3, buttonY, buttonWidth, buttonHeight);
    this.buttons.sound.visible = false;

    this.banner.position.set(w / 2, tableTop + tableHeight * 0.2);
    this.banner.resizeTo(Math.min(620, w * 0.86), 200);
  }

  /**
   * Places the seven wagers. Main lines sit on the bottom row in the
   * Player / Tie / Banker order every baccarat player expects; side bets ride
   * above them.
   */
  private layoutSpots(w: number, sideY: number, mainY: number, portrait: boolean): void {
    const mainHeight = portrait ? 150 : 156;
    const mainWidth = Math.min(portrait ? w * 0.3 : 360, w * 0.32);
    const tieWidth = mainWidth * (portrait ? 0.82 : 0.74);

    const positions: Partial<Record<BetType, SpotLayout>> = {
      [BetType.Player]: {
        x: w / 2 - mainWidth * 0.55 - tieWidth / 2,
        y: mainY,
        width: mainWidth,
        height: mainHeight,
      },
      [BetType.Tie]: { x: w / 2, y: mainY, width: tieWidth, height: mainHeight },
      [BetType.Banker]: {
        x: w / 2 + mainWidth * 0.55 + tieWidth / 2,
        y: mainY,
        width: mainWidth,
        height: mainHeight,
      },
    };

    if (this.ctx.config.features.sidebets) {
      const sideHeight = portrait ? 96 : 92;
      const sideWidth = Math.min(portrait ? w * 0.23 : 232, w * 0.24);
      const gap = portrait ? 8 : 14;
      const step = sideWidth + gap;
      const order = [BetType.PlayerPair, BetType.PerfectPair, BetType.Natural, BetType.BankerPair];
      const start = w / 2 - (step * (order.length - 1)) / 2;
      order.forEach((betType, index) => {
        positions[betType] = {
          x: start + index * step,
          y: sideY,
          width: sideWidth,
          height: sideHeight,
        };
      });
    }

    for (const [betType, spot] of this.spots) {
      const layout = positions[betType];
      if (!layout) {
        spot.visible = false;
        continue;
      }
      spot.visible = true;
      spot.position.set(layout.x, layout.y);
      spot.resizeTo(layout.width, layout.height);
    }
  }

  private placeButton(button: Button, x: number, y: number, width: number, height: number): void {
    button.position.set(x, y);
    button.resizeTo(width, height);
  }

  /** The felt: a soft rounded table body with a gold rail. */
  private drawFelt(x: number, y: number, width: number, height: number): void {
    const theme = this.ctx.config.theme;
    const radius = Math.min(height / 2, 180);

    this.feltArt
      .clear()
      .roundRect(x, y, width, height, radius)
      .fill({ color: theme.feltMid, alpha: 0.92 })
      .roundRect(x + 10, y + 10, width - 20, height - 20, radius - 8)
      .stroke({ width: 2, color: theme.gold, alpha: 0.35 })
      .roundRect(x, y, width, height, radius)
      .stroke({ width: 8, color: 0x0a1f16, alpha: 0.9 });
  }

  /* ---------------------------------------------------------------- *
   * Teardown
   * ---------------------------------------------------------------- */

  override destroy(): void {
    for (const spot of this.spots.values()) spot.destroy();
    this.spots.clear();
    this.chipPool.destroy();
    super.destroy();
  }
}
