import { Container, Graphics } from 'pixi.js';
import { Scene, GameContext } from './Scene';
import { mixColors } from './BootScene';

import { Wheel } from '../Objects/Wheel';
import { Ball } from '../Objects/Ball';
import { BettingBoard } from '../Objects/BettingBoard';
import { WinningMarker } from '../Objects/WinningMarker';
import { HistoryPanel } from '../Objects/HistoryPanel';

import { Hud } from '../UI/Hud';
import { ChipTray } from '../UI/ChipTray';
import { ControlBar, ControlAction } from '../UI/ControlBar';

import { TableLayout } from '../Game/TableLayout';
import { BetManager } from '../Managers/BetManager';
import { ChipManager } from '../Managers/ChipManager';
import { WheelManager } from '../Managers/WheelManager';
import { HistoryManager } from '../Managers/HistoryManager';
import { GameManager, PresentationDrivers } from '../Managers/GameManager';
import { InputAction } from '../Managers/InputManager';

import {
  BetSpot,
  GameEvent,
  GameState,
  LayoutMetrics,
  Orientation,
  PocketColor,
  RoundResult,
  RouletteNumber,
  SoundId,
  Theme,
} from '../Types';
import { LAYER } from '../Game/Constants';
import { Logger } from '../Utilities/Logger';

/** Rectangle in screen pixels - the unit of the layout solver. */
interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Absolute floors, in CSS pixels, for things a finger has to hit or an eye has
 * to read.
 *
 * Everything else in the layout scales freely, but a control that scales below
 * these stops working: a 19px-tall button is not tappable, and a 26px HUD strip
 * cannot fit a caption above a value. On a small phone these floors take their
 * space out of the felt, which is the right trade - a slightly smaller betting
 * grid is a cosmetic loss, an unusable Clear button is a real one.
 */
const MIN_PX = {
  /** Comfortable touch target - the usual accessibility guidance. */
  TOUCH: 44,
  HUD_HEIGHT: 46,
  STATUS_HEIGHT: 26,
  TRAY_HEIGHT: 58,
  /** Two rows of controls plus the gap between them. */
  CONTROLS_TWO_ROW: 94,
} as const;

/**
 * The table scene - where every subsystem meets.
 *
 * ## Layout strategy
 *
 * The scene never positions anything by literal pixel values. `onResize`
 * partitions the safe area into named rectangles (`solveLandscape` /
 * `solvePortrait`) and each component is fitted to its rectangle. Adding a
 * panel or changing the balance between wheel and felt is an edit to the
 * solver, not a hunt through a hundred coordinates.
 *
 * In portrait the felt is rotated a quarter turn, which is what mobile casino
 * clients do: a 14:5 layout laid flat across a phone is unreadably small, while
 * rotated it fills the screen at a usable size. Because chips are parented to
 * the board they inherit the rotation for free.
 *
 * ## Ownership
 *
 * The scene owns the game-specific managers (bets, chips, wheel, history,
 * state) because their lifetime is exactly the table's lifetime. Everything
 * longer-lived - renderer, bus, audio, textures - arrives through
 * {@link GameContext}.
 */
export class RouletteScene extends Scene {
  private readonly log = Logger.create('RouletteScene');

  /* Display */
  private readonly background = new Graphics();
  private readonly tableLayer = new Container();
  private readonly wheelLayer = new Container();
  private readonly hudLayer = new Container();

  private readonly wheel: Wheel;
  private readonly ball: Ball;
  private readonly board: BettingBoard;
  private readonly marker: WinningMarker;
  private readonly history: HistoryPanel;
  private readonly hud: Hud;
  private readonly chipTray: ChipTray;
  private readonly controls: ControlBar;

  /* Logic */
  private readonly tableLayout: TableLayout;
  private readonly bets: BetManager;
  private readonly chips: ChipManager;
  private readonly wheelManager: WheelManager;
  private readonly historyManager: HistoryManager;
  private readonly gameManager: GameManager;

  private metrics?: LayoutMetrics;
  private lastResult?: RoundResult;

  public constructor(context: GameContext) {
    super(context);

    const { config, theme, textures, animations, audio, bus, localization } = context;

    /* ----- Logic ----- */
    this.tableLayout = new TableLayout(config.wheel.type);
    this.bets = new BetManager(
      config.betting,
      this.tableLayout,
      bus,
      config.network.startingBalance,
    );
    this.historyManager = new HistoryManager(bus);

    /* ----- Wheel ----- */
    const pockets = WheelManager.buildPockets(config.wheel);
    this.wheel = new Wheel(textures, pockets, config.wheel.type, theme);
    this.ball = new Ball(textures);
    this.wheelLayer.addChild(this.wheel, this.ball);

    this.wheelManager = new WheelManager(
      this.wheel,
      this.ball,
      config.wheel,
      animations,
      audio,
      bus,
      config.network.seed ?? 0x9e3779b9,
    );

    /* ----- Felt ----- */
    this.board = new BettingBoard(
      this.tableLayout,
      textures,
      theme,
      localization,
      context.resize.getMetrics().isTouch,
    );
    this.chips = new ChipManager(
      this.board.getChipLayer(),
      textures,
      animations,
      config.betting.chips,
    );
    // The dolly rides on the felt; the banner is screen furniture and is
    // parented into the HUD layer below so it stays upright and centred even
    // when the board is rotated for portrait.
    this.marker = new WinningMarker(textures, animations, theme);
    this.board.addChild(this.marker);
    this.tableLayer.addChild(this.board);

    /* ----- UI ----- */
    this.hud = new Hud(animations, theme, localization);
    this.hud.setCurrency(config.network.currency);
    this.history = new HistoryPanel(animations, theme, localization);
    this.chipTray = new ChipTray(config.betting.chips, textures, animations, theme);
    this.controls = new ControlBar(theme, localization);
    this.hudLayer.addChild(this.hud, this.history, this.chipTray, this.controls);
    this.hudLayer.addChild(this.marker.getBannerLayer());

    /* ----- State machine ----- */
    this.gameManager = new GameManager(
      config,
      this.bets,
      this.historyManager,
      this.wheelManager,
      bus,
    );

    /* ----- Assembly ----- */
    this.tableLayer.zIndex = LAYER.TABLE;
    this.wheelLayer.zIndex = LAYER.WHEEL;
    this.hudLayer.zIndex = LAYER.HUD;
    this.container.sortableChildren = true;
    this.container.addChild(this.background, this.tableLayer, this.wheelLayer, this.hudLayer);
  }

  /* --------------------------------------------------------------------- */
  /* Accessors used by Game                                                */
  /* --------------------------------------------------------------------- */

  public getGameManager(): GameManager {
    return this.gameManager;
  }

  public getBetManager(): BetManager {
    return this.bets;
  }

  public getHistoryManager(): HistoryManager {
    return this.historyManager;
  }

  /* --------------------------------------------------------------------- */
  /* Setup                                                                 */
  /* --------------------------------------------------------------------- */

  public async init(): Promise<void> {
    this.wireInteractions();
    this.subscribeToEvents();

    // Pre-allocate the chip pool so the first bets of the first round do not
    // allocate while the player is watching.
    this.chips.warmUp(48);

    this.gameManager.setDrivers(this.buildDrivers());
    this.hud.setBalance(this.bets.getBalance(), false);
    this.hud.setTotalBet(0);
    this.hud.setLastWin(0);

    // Boot and loading are already finished by the time this scene exists;
    // `start()` replays them so the published state sequence stays complete.
    this.gameManager.start();
  }

  /** Presentation callbacks handed to the state machine. */
  private buildDrivers(): PresentationDrivers {
    return {
      spin: (winningNumber, roundId) => this.wheelManager.spin(winningNumber, roundId),
      payout: (result) => this.runPayout(result),
      cleanup: () => this.runCleanup(),
    };
  }

  private wireInteractions(): void {
    this.board.onSpotSelected = (spot) => this.handleSpotSelected(spot);
    this.board.onSpotHover = (spot) => {
      if (spot) {
        this.context.bus.emit(GameEvent.SPOT_HOVER, { spotId: spot.id, numbers: spot.numbers });
      } else {
        this.context.bus.emit(GameEvent.SPOT_HOVER_END);
      }
    };

    this.chipTray.onSelect = (value) => {
      this.bets.selectChip(value);
      this.context.audio.play(SoundId.BUTTON_CLICK, 0.6);
    };

    this.controls.onAction = (action) => this.handleControlAction(action);
  }

  private subscribeToEvents(): void {
    const bus = this.context.bus;

    bus.on(GameEvent.STATE_CHANGE, ({ to }) => this.handleStateChange(to), this);
    bus.on(GameEvent.SYNC_TIMER, ({ remaining, total }) => this.handleTimer(remaining, total), this);
    bus.on(GameEvent.BETS_CHANGED, ({ total }) => this.handleBetsChanged(total), this);
    bus.on(GameEvent.BALANCE_CHANGE, ({ balance }) => this.hud.setBalance(balance), this);
    bus.on(GameEvent.HISTORY_UPDATE, ({ entries, stats }) => this.history.update(entries, stats), this);
    bus.on(GameEvent.WIN_NUMBER, ({ number, color }) => this.presentWinner(number, color), this);
    bus.on(GameEvent.CHIP_SELECTED, ({ value }) => this.chipTray.select(value, false), this);
    bus.on(GameEvent.BET_REJECTED, ({ reason }) => this.handleRejection(reason), this);
  }

  /* --------------------------------------------------------------------- */
  /* Player actions                                                        */
  /* --------------------------------------------------------------------- */

  private handleSpotSelected(spot: BetSpot): void {
    const value = this.bets.getSelectedChip();
    const result = this.bets.placeBet(spot.id, value);
    if (!result.accepted) return;

    this.context.audio.play(SoundId.CHIP_PLACE);

    // Fly a chip from the tray to the spot. Positions are converted through
    // global space so the animation is correct regardless of how the board is
    // rotated or scaled in the current layout.
    const trayGlobal = this.chipTray.getSlotGlobalPosition(value);
    const target = this.board.getSpotPosition(spot.id);
    if (!trayGlobal || !target) return;

    const from = this.board.getChipLayer().toLocal({ x: trayGlobal.x, y: trayGlobal.y });
    const bet = this.bets.getBet(spot.id);
    this.chips.animatePlacement(value, from, target, (bet?.chips.length ?? 1) - 1);
  }

  private handleControlAction(action: ControlAction): void {
    this.context.audio.play(SoundId.BUTTON_CLICK, 0.7);

    switch (action) {
      case ControlAction.UNDO:
        if (this.bets.undo()) this.context.audio.play(SoundId.CHIP_CLEAR, 0.7);
        this.context.bus.emit(GameEvent.UNDO_BET);
        break;
      case ControlAction.REPEAT:
        this.bets.repeat();
        this.context.bus.emit(GameEvent.REPEAT_BET);
        break;
      case ControlAction.DOUBLE:
        this.bets.double();
        this.context.bus.emit(GameEvent.DOUBLE_BET);
        break;
      case ControlAction.CLEAR:
        this.bets.clear();
        this.context.audio.play(SoundId.CHIP_CLEAR);
        this.context.bus.emit(GameEvent.CLEAR_BET);
        break;
      default:
        break;
    }
    this.refreshControls();
  }

  /** Route a keyboard shortcut into the same paths the buttons use. */
  public handleInputAction(action: InputAction): void {
    switch (action) {
      case InputAction.UNDO:
        this.handleControlAction(ControlAction.UNDO);
        break;
      case InputAction.REPEAT:
        this.handleControlAction(ControlAction.REPEAT);
        break;
      case InputAction.DOUBLE:
        this.handleControlAction(ControlAction.DOUBLE);
        break;
      case InputAction.CLEAR:
        this.handleControlAction(ControlAction.CLEAR);
        break;
      case InputAction.TOGGLE_MUTE:
        this.context.audio.toggleMute();
        break;
      case InputAction.NEXT_CHIP:
      case InputAction.PREVIOUS_CHIP:
        this.cycleChip(action === InputAction.NEXT_CHIP ? 1 : -1);
        break;
      default:
        break;
    }
  }

  private cycleChip(direction: 1 | -1): void {
    const chips = this.context.config.betting.chips;
    const index = chips.findIndex((chip) => chip.value === this.bets.getSelectedChip());
    const next = (index + direction + chips.length) % chips.length;

    this.bets.selectChip(chips[next].value);
    this.chipTray.select(chips[next].value, false);
    this.context.audio.play(SoundId.BUTTON_CLICK, 0.5);
  }

  private handleRejection(reason: string): void {
    // The rejection reason *is* a localisation key - see `BetRejection`.
    this.log.debug(`bet rejected: ${this.context.localization.t(reason)}`);
    this.context.audio.play(SoundId.LOSE, 0.3);
  }

  /* --------------------------------------------------------------------- */
  /* State reactions                                                       */
  /* --------------------------------------------------------------------- */

  private handleStateChange(to: GameState): void {
    this.hud.setStatus(to);

    switch (to) {
      case GameState.BETTING_OPEN:
        this.board.setInteractiveEnabled(true);
        this.chipTray.setEnabled(true);
        this.hud.showTimer();
        this.hud.setLastWin(0);
        break;

      case GameState.LAST_CALL:
        this.context.audio.play(SoundId.COUNTDOWN_URGENT, 0.8);
        break;

      case GameState.BETTING_CLOSED:
        this.board.setInteractiveEnabled(false);
        this.chipTray.setEnabled(false);
        this.controls.setAllEnabled(false);
        this.hud.hideTimer();
        this.context.audio.play(SoundId.NO_MORE_BETS);
        break;

      case GameState.SPINNING:
        this.context.audio.playLoop(SoundId.WHEEL_SPIN, 0.45);
        break;

      case GameState.RESET:
        this.marker.hideBanner();
        break;

      default:
        break;
    }

    this.refreshControls();
  }

  private handleTimer(remaining: number, total: number): void {
    const urgent = remaining <= this.context.config.timing.lastCallThreshold;
    this.hud.setTimer(remaining, total, urgent);

    // One tick per whole second in the closing seconds.
    if (urgent && remaining > 0 && Math.abs(remaining - Math.round(remaining)) < 0.05) {
      this.context.audio.play(SoundId.COUNTDOWN_TICK, 0.5);
    }
  }

  private handleBetsChanged(total: number): void {
    this.hud.setTotalBet(total);
    this.chips.syncStacks(this.bets.getBets(), (spotId) => this.board.getSpotPosition(spotId));
    this.refreshControls();
  }

  private refreshControls(): void {
    this.controls.reflect({
      bettingOpen: this.bets.isBettingOpen(),
      hasBets: this.bets.hasBets(),
      canUndo: this.bets.canUndo(),
      canRepeat: this.bets.canRepeat(),
    });
  }

  /* --------------------------------------------------------------------- */
  /* Result presentation                                                   */
  /* --------------------------------------------------------------------- */

  /** Light the winning cell, drop the dolly, raise the banner. */
  private presentWinner(number: RouletteNumber, color: PocketColor): void {
    const cell = this.board.highlightWinner(number);
    if (cell) {
      this.marker.showDolly(cell.x, cell.y, number);
      this.context.animations.fromTo(
        this.board.getWinGlow(),
        { alpha: 0 },
        { alpha: 0.7, duration: 0.3, ease: 'power2.out' },
      );
    }

    const metrics = this.metrics;
    if (metrics) {
      // Screen centre, expressed in the HUD layer's space.
      const local = this.hudLayer.toLocal({
        x: metrics.width / 2,
        y: metrics.height * 0.44,
      });
      this.marker.showBanner(local.x, local.y, number, this.colorLabel(color));
    }

    this.context.audio.play(SoundId.BALL_DROP, 0.5);
  }

  private colorLabel(color: PocketColor): string {
    if (color === PocketColor.RED) return this.context.localization.t('label.red');
    if (color === PocketColor.BLACK) return this.context.localization.t('label.black');
    return '0';
  }

  /**
   * Sweep the losers, pay the winners.
   *
   * Losing chips leave first and winning chips are paid second, which is both
   * the order a real table works in and the order that reads most clearly -
   * the felt empties, then the win arrives.
   */
  private async runPayout(result: RoundResult): Promise<void> {
    this.lastResult = result;

    // The banner has had its hold during WINNER_DETECTED; it comes down now so
    // the player can actually watch their chips being paid, which is the part
    // of the round that matters to them.
    this.marker.hideBanner();

    const winners = result.resolutions.filter((r) => r.won).map((r) => r.spotId);
    const losers = result.resolutions.filter((r) => !r.won).map((r) => r.spotId);

    this.board.dimLosingSpots(result.winningNumber);

    // Losing chips sweep off the dealer edge of the felt.
    const sweepTarget = this.board.getChipLayer().toLocal(
      this.wheelLayer.getGlobalPosition(),
    );
    if (losers.length > 0) {
      this.chips.animateLoss(losers, sweepTarget);
      this.context.audio.play(SoundId.CHIP_CLEAR, 0.55);
    }

    if (winners.length === 0) {
      this.hud.setLastWin(0);
      this.context.audio.play(SoundId.LOSE, 0.5);
      await this.context.animations.wait(this.context.config.timing.payoutDuration * 0.5);
      return;
    }

    // Winning chips travel to the balance readout.
    const balanceGlobal = this.hud.getGlobalPosition();
    const collectTarget = this.board.getChipLayer().toLocal(balanceGlobal);

    const big = result.totalPayout >= result.totalStaked * 8;
    this.context.audio.play(big ? SoundId.BIG_WIN : SoundId.WIN);
    this.context.audio.play(SoundId.PAYOUT, 0.7);

    await this.chips.animateWin(winners, collectTarget);
    this.hud.setLastWin(result.totalPayout);
  }

  /** Return the table to a clean state for the next round. */
  private async runCleanup(): Promise<void> {
    this.board.clearDim();
    this.board.clearWinHighlight();
    this.marker.hideDolly();
    this.chips.clearAll(true);
    this.wheelManager.clearBall();

    await this.context.animations.wait(0.35);
    this.marker.hideBanner();
  }

  /* --------------------------------------------------------------------- */
  /* Frame                                                                 */
  /* --------------------------------------------------------------------- */

  public override update(deltaSeconds: number): void {
    this.wheelManager.update(deltaSeconds);
    this.gameManager.update(deltaSeconds);
  }

  /* --------------------------------------------------------------------- */
  /* Layout                                                                */
  /* --------------------------------------------------------------------- */

  public onResize(metrics: LayoutMetrics): void {
    this.metrics = metrics;
    this.drawBackground(metrics, this.context.theme);
    this.board.setTouchMode(metrics.isTouch);

    const regions =
      metrics.orientation === Orientation.LANDSCAPE
        ? this.solveLandscape(metrics)
        : this.solvePortrait(metrics);

    this.applyRegions(regions, metrics);
  }

  /**
   * Landscape: wheel in a left column, felt and controls in a right column.
   * This is the shape a desktop or tablet player expects, and it keeps the
   * wheel permanently visible while betting.
   */
  private solveLandscape(metrics: LayoutMetrics): Record<string, Rect> {
    const scale = metrics.scale;
    const pad = 12 * scale;
    const left = metrics.safeLeft + pad;
    const top = metrics.safeTop + pad;
    const width = metrics.safeWidth - pad * 2;
    const height = metrics.safeHeight - pad * 2;

    const columnWidth = Math.max(200 * scale, Math.min(width * 0.34, 420 * scale));
    const rightX = left + columnWidth + pad;
    const rightWidth = width - columnWidth - pad;

    const hudHeight = Math.max(MIN_PX.HUD_HEIGHT, 60 * scale);
    const statusHeight = Math.max(MIN_PX.STATUS_HEIGHT, 34 * scale);
    const historyHeight = Math.min(height * 0.42, 220 * scale);
    const trayHeight = Math.max(MIN_PX.TRAY_HEIGHT, 78 * scale);
    const controlsHeight = Math.max(MIN_PX.TOUCH, 52 * scale);

    return {
      wheel: {
        x: left,
        y: top,
        width: columnWidth,
        height: height - historyHeight - pad,
      },
      history: {
        x: left,
        y: top + height - historyHeight,
        width: columnWidth,
        height: historyHeight,
      },
      hud: { x: rightX, y: top, width: rightWidth, height: hudHeight },
      status: { x: rightX, y: top + hudHeight, width: rightWidth, height: statusHeight },
      board: {
        x: rightX,
        y: top + hudHeight + statusHeight,
        width: rightWidth,
        height: height - hudHeight - statusHeight - trayHeight - controlsHeight - pad * 3,
      },
      tray: {
        x: rightX,
        y: top + height - trayHeight - controlsHeight - pad,
        width: rightWidth,
        height: trayHeight,
      },
      controls: {
        x: rightX,
        y: top + height - controlsHeight,
        width: rightWidth,
        height: controlsHeight,
      },
    };
  }

  /**
   * Portrait: a vertical stack with the felt rotated a quarter turn.
   *
   * Controls occupy two rows at the bottom, inside the safe area, so the home
   * indicator on a modern phone never overlaps a button.
   */
  private solvePortrait(metrics: LayoutMetrics): Record<string, Rect> {
    const scale = metrics.scale;
    const pad = 10 * scale;
    const left = metrics.safeLeft + pad;
    const top = metrics.safeTop + pad;
    const width = metrics.safeWidth - pad * 2;
    const height = metrics.safeHeight - pad * 2;

    const hudHeight = Math.max(MIN_PX.HUD_HEIGHT, 58 * scale);
    const statusHeight = Math.max(MIN_PX.STATUS_HEIGHT, 32 * scale);
    const historyHeight = Math.max(44, 52 * scale);
    const trayHeight = Math.max(MIN_PX.TRAY_HEIGHT, 84 * scale);
    const controlsHeight = Math.max(MIN_PX.CONTROLS_TWO_ROW, 96 * scale);
    const wheelHeight = Math.min(height * 0.25, width * 0.68);

    const historyTop = top + hudHeight + statusHeight;
    const wheelTop = historyTop + historyHeight + pad;
    const boardTop = wheelTop + wheelHeight + pad;
    const boardHeight =
      height -
      hudHeight -
      statusHeight -
      historyHeight -
      wheelHeight -
      trayHeight -
      controlsHeight -
      pad * 4;

    return {
      hud: { x: left, y: top, width, height: hudHeight },
      status: { x: left, y: top + hudHeight, width, height: statusHeight },
      history: { x: left, y: historyTop, width, height: historyHeight },
      wheel: { x: left, y: wheelTop, width, height: wheelHeight },
      board: { x: left, y: boardTop, width, height: Math.max(80 * scale, boardHeight) },
      tray: {
        x: left,
        y: top + height - trayHeight - controlsHeight - pad,
        width,
        height: trayHeight,
      },
      controls: {
        x: left,
        y: top + height - controlsHeight,
        width,
        height: controlsHeight,
      },
    };
  }

  /** Fit every component into its solved rectangle. */
  private applyRegions(regions: Record<string, Rect>, metrics: LayoutMetrics): void {
    const portrait = metrics.orientation === Orientation.PORTRAIT;
    const scale = metrics.scale;

    /* ----- Wheel ----- */
    const wheelRect = regions.wheel;
    const radius = Math.max(40, Math.min(wheelRect.width, wheelRect.height) * 0.47);
    this.wheel.setRadius(radius);
    this.ball.setWheelRadius(radius);
    this.wheelLayer.position.set(
      wheelRect.x + wheelRect.width / 2,
      wheelRect.y + wheelRect.height / 2,
    );

    /* ----- Board ----- */
    const boardRect = regions.board;
    // A quarter turn in portrait means the board is fitted against swapped
    // extents; its own `resize` still works in unrotated board space.
    this.board.rotation = portrait ? -Math.PI / 2 : 0;
    this.board.resize(
      portrait ? boardRect.height : boardRect.width,
      portrait ? boardRect.width : boardRect.height,
    );
    this.board.position.set(
      boardRect.x + boardRect.width / 2,
      boardRect.y + boardRect.height / 2,
    );

    const cell = this.board.getCellSize();
    this.chips.setChipSize(cell * 0.66);
    this.marker.setScale(cell);
    // Rebuild stacks at the new scale.
    this.chips.syncStacks(this.bets.getBets(), (spotId) => this.board.getSpotPosition(spotId));

    /* ----- HUD ----- */
    const hudRect = regions.hud;
    this.hud.position.set(hudRect.x, hudRect.y);
    this.hud.resize(hudRect.width, hudRect.height, scale);

    // The status pill gets a row of its own so it can never land on the history
    // strip or the felt. Coordinates are HUD-local.
    const statusRect = regions.status;
    this.hud.setStatusPosition(
      statusRect.x - hudRect.x + statusRect.width / 2,
      statusRect.y - hudRect.y + statusRect.height / 2,
    );

    /* ----- History ----- */
    const historyRect = regions.history;
    this.history.position.set(historyRect.x, historyRect.y);
    this.history.resize(historyRect.width, historyRect.height, metrics.orientation, scale);
    this.history.update(this.historyManager.getEntries(), this.historyManager.getStatistics());

    /* ----- Chip tray ----- */
    const trayRect = regions.tray;
    this.chipTray.position.set(trayRect.x + trayRect.width / 2, trayRect.y + trayRect.height / 2);
    this.chipTray.resize(trayRect.width, trayRect.height, scale, !portrait);

    /* ----- Controls ----- */
    const controlsRect = regions.controls;
    this.controls.position.set(
      controlsRect.x + controlsRect.width / 2,
      controlsRect.y + controlsRect.height / 2,
    );
    this.controls.resize(controlsRect.width, controlsRect.height, scale, metrics.orientation);
  }

  private drawBackground(metrics: LayoutMetrics, theme: Theme): void {
    const bands = 20;
    const bandHeight = Math.ceil(metrics.height / bands);

    this.background.clear();
    for (let i = 0; i < bands; i += 1) {
      this.background
        .rect(0, i * bandHeight, metrics.width, bandHeight + 1)
        .fill({ color: mixColors(theme.backgroundTop, theme.backgroundBottom, i / (bands - 1)) });
    }
  }

  /* --------------------------------------------------------------------- */
  /* Runtime reconfiguration                                               */
  /* --------------------------------------------------------------------- */

  public override onThemeChange(theme: Theme): void {
    this.board.setTheme(theme);
    this.history.setTheme(theme);
    this.hud.setTheme(theme);
    this.chipTray.setTheme(theme);
    this.controls.setTheme(theme);
    this.marker.setTheme(theme);

    if (this.metrics) {
      this.drawBackground(this.metrics, theme);
      this.onResize(this.metrics);
    }
  }

  public override onLanguageChange(): void {
    const localization = this.context.localization;
    this.board.setLocalization(localization);
    this.history.setLocalization(localization);
    this.hud.setLocalization(localization);
    this.controls.setLocalization(localization);
    this.hud.setStatus(this.gameManager.getState());
  }

  public override onConfigChange(config: typeof this.context.config): void {
    this.bets.updateConfig(config.betting);
    this.chips.updateDenominations(config.betting.chips);
    this.chipTray.updateDenominations(config.betting.chips);
    this.wheelManager.updateConfig(config.wheel);
    this.gameManager.updateConfig(config);
    this.hud.setCurrency(config.network.currency);

    if (this.metrics) this.onResize(this.metrics);
  }

  public override onPause(): void {
    this.board.setInteractiveEnabled(false);
  }

  public override onResume(): void {
    if (this.bets.isBettingOpen()) this.board.setInteractiveEnabled(true);
  }

  /** Abandon the round, clear the felt, start again. */
  public resetTable(): void {
    this.gameManager.reset();
    this.wheelManager.reset();
    this.chips.clearAll(false);
    this.board.clearDim();
    this.board.clearWinHighlight();
    this.marker.reset();
    this.bets.resetAll(this.context.config.network.startingBalance);
    this.historyManager.clear();
    this.lastResult = undefined;

    this.hud.setBalance(this.context.config.network.startingBalance, false);
    this.hud.setTotalBet(0);
    this.hud.setLastWin(0);

    this.gameManager.restart();
  }

  public getLastResult(): RoundResult | undefined {
    return this.lastResult;
  }

  public override destroy(): void {
    this.gameManager.destroy();
    this.wheelManager.destroy();
    this.chips.destroy();

    this.board.onSpotSelected = undefined;
    this.board.onSpotHover = undefined;
    this.chipTray.onSelect = undefined;
    this.controls.onAction = undefined;

    super.destroy();
  }
}
