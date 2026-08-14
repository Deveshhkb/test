import { Container, Graphics, Matrix } from 'pixi.js';
import { Scene, GameContext } from './Scene';
import { mixColors } from './BootScene';

import { Wheel } from '../Objects/Wheel';
import { Ball } from '../Objects/Ball';
import { BettingBoard } from '../Objects/BettingBoard';
import { WinningMarker } from '../Objects/WinningMarker';
import { HistoryPanel } from '../Objects/HistoryPanel';

import { TopBar } from '../UI/TopBar';
import { BottomBar, BottomBarAction } from '../UI/BottomBar';
import { ChipStepper } from '../UI/ChipStepper';
import { ActionBar, TableAction } from '../UI/ActionBar';

import { TableLayout } from '../Game/TableLayout';
import { BetManager } from '../Managers/BetManager';
import { ChipManager } from '../Managers/ChipManager';
import { WheelManager } from '../Managers/WheelManager';
import { HistoryManager } from '../Managers/HistoryManager';
import { GameManager, PresentationDrivers } from '../Managers/GameManager';
import { AnimationManager } from '../Managers/AnimationManager';
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

  /** Full-screen felt behind everything. */
  private readonly feltLayer = new Graphics();
  /** Darkens the table while the wheel overlay is up. */
  private readonly dimLayer = new Graphics();

  private readonly wheel: Wheel;
  private readonly ball: Ball;
  private readonly board: BettingBoard;
  private readonly marker: WinningMarker;
  private readonly history: HistoryPanel;
  private readonly topBar: TopBar;
  private readonly bottomBar: BottomBar;
  private readonly chipStepper: ChipStepper;
  private readonly actions: ActionBar;

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
    this.topBar = new TopBar(animations, theme, localization);
    this.bottomBar = new BottomBar(animations, theme, localization);
    this.bottomBar.setCurrency(config.network.currency);
    this.bottomBar.refreshCaptions();
    this.chipStepper = new ChipStepper(config.betting.chips, textures, animations, theme);
    this.actions = new ActionBar(animations, theme, localization);

    // The statistics panel is retained but off by default: the reference client
    // does not show one, and the top strip already carries recent results.
    this.history = new HistoryPanel(animations, theme, localization);
    this.history.visible = false;

    this.hudLayer.addChild(this.topBar, this.bottomBar, this.chipStepper, this.actions);
    this.hudLayer.addChild(this.history, this.marker.getBannerLayer());

    /* ----- State machine ----- */
    this.gameManager = new GameManager(
      config,
      this.bets,
      this.historyManager,
      this.wheelManager,
      bus,
    );

    /* ----- Assembly ----- */
    // Every layer needs an explicit zIndex. `sortableChildren` sorts by it, and
    // anything left at the default 0 sinks below the board - which is exactly
    // how the dim scrim ended up painting *behind* the felt it was meant to
    // darken, leaving the layout legible straight through the wheel overlay.
    this.background.zIndex = LAYER.BACKGROUND;
    this.feltLayer.zIndex = LAYER.FELT;
    this.tableLayer.zIndex = LAYER.TABLE;
    this.dimLayer.zIndex = LAYER.DIM;
    this.wheelLayer.zIndex = LAYER.WHEEL;
    this.hudLayer.zIndex = LAYER.HUD;
    this.container.sortableChildren = true;
    this.container.addChild(
      this.background,
      this.feltLayer,
      this.tableLayer,
      this.dimLayer,
      this.wheelLayer,
      this.hudLayer,
    );

    // The wheel is not part of the betting screen at all - it flies in as an
    // overlay when the spin starts and shrinks away afterwards.
    this.wheelLayer.visible = false;
    this.wheelLayer.alpha = 0;
    this.dimLayer.visible = false;
    this.dimLayer.alpha = 0;
    this.dimLayer.eventMode = 'none';
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
    this.bottomBar.setCash(this.bets.getBalance(), false);
    this.bottomBar.setStake(0);

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

    this.chipStepper.onSelect = (value) => {
      this.bets.selectChip(value);
      this.context.audio.play(SoundId.BUTTON_CLICK, 0.6);
    };

    this.actions.onAction = (action) => this.handleTableAction(action);
    this.bottomBar.onAction = (action) => {
      if (action === BottomBarAction.SOUND) this.context.audio.toggleMute();
      this.context.audio.play(SoundId.BUTTON_CLICK, 0.5);
    };
  }

  private subscribeToEvents(): void {
    const bus = this.context.bus;

    bus.on(GameEvent.STATE_CHANGE, ({ to }) => this.handleStateChange(to), this);
    bus.on(GameEvent.BETS_CHANGED, ({ total }) => this.handleBetsChanged(total), this);
    bus.on(GameEvent.BALANCE_CHANGE, ({ balance }) => this.bottomBar.setCash(balance), this);
    bus.on(GameEvent.HISTORY_UPDATE, ({ entries }) => this.topBar.update(entries), this);
    bus.on(GameEvent.WIN_NUMBER, ({ number, color }) => this.presentWinner(number, color), this);
    bus.on(GameEvent.CHIP_SELECTED, ({ value }) => this.chipStepper.select(value, false), this);
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

    const from = this.board
      .getChipLayer()
      .toLocal(this.chipStepper.getChipGlobalPosition());
    const target = this.board.getSpotPosition(spot.id);
    if (!target) return;

    const bet = this.bets.getBet(spot.id);
    this.chips.animatePlacement(value, from, target, (bet?.chips.length ?? 1) - 1);
  }

  private handleTableAction(action: TableAction): void {
    this.context.audio.play(SoundId.BUTTON_CLICK, 0.7);

    switch (action) {
      case TableAction.SPIN:
        if (this.gameManager.requestSpin()) this.context.audio.play(SoundId.BET_CONFIRM, 0.8);
        break;
      case TableAction.CLEAR_BETS:
        this.bets.clear();
        this.context.audio.play(SoundId.CHIP_CLEAR);
        this.context.bus.emit(GameEvent.CLEAR_BET);
        break;
      case TableAction.SPECIAL_BETS:
        // Racetrack / neighbour bets are not implemented yet; the control is
        // present so the layout matches, and is left disabled rather than
        // silently doing nothing when pressed.
        this.log.debug('special bets requested - not implemented');
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
        if (this.bets.undo()) this.context.audio.play(SoundId.CHIP_CLEAR, 0.7);
        this.refreshControls();
        break;
      case InputAction.REPEAT:
        this.bets.repeat();
        break;
      case InputAction.DOUBLE:
        this.bets.double();
        break;
      case InputAction.CLEAR:
        this.handleTableAction(TableAction.CLEAR_BETS);
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
    const next = Math.min(chips.length - 1, Math.max(0, index + direction));

    this.bets.selectChip(chips[next].value);
    this.chipStepper.select(chips[next].value, false);
  }

  private handleRejection(reason: string): void {
    this.log.debug(`bet rejected: ${this.context.localization.t(reason)}`);
    this.context.audio.play(SoundId.LOSE, 0.3);
  }

  /* --------------------------------------------------------------------- */
  /* State reactions                                                       */
  /* --------------------------------------------------------------------- */

  private handleStateChange(to: GameState): void {
    switch (to) {
      case GameState.BETTING_OPEN:
      case GameState.LAST_CALL:
        this.board.setInteractiveEnabled(true);
        this.chipStepper.setEnabled(true);
        break;

      case GameState.BETTING_CLOSED:
        this.board.setInteractiveEnabled(false);
        this.chipStepper.setEnabled(false);
        this.actions.setAllEnabled(false);
        this.context.audio.play(SoundId.NO_MORE_BETS);
        break;

      case GameState.SPINNING:
        this.context.audio.playLoop(SoundId.WHEEL_SPIN, 0.45);
        this.showWheelOverlay();
        break;

      case GameState.RESET:
        this.marker.hideBanner();
        this.hideWheelOverlay();
        break;

      default:
        break;
    }

    this.refreshControls();
  }

  private handleBetsChanged(total: number): void {
    this.bottomBar.setStake(total);
    this.chips.syncStacks(this.bets.getBets(), (spotId) => this.board.getSpotPosition(spotId));
    this.refreshControls();
  }

  /**
   * Reflect the current situation on the action cluster.
   *
   * Clear appears only when there is something to clear, and SPIN is live only
   * with a stake on the felt - a spin with no bet is not a round, it is just an
   * animation.
   */
  private refreshControls(): void {
    const open = this.bets.isBettingOpen();
    const hasBets = this.bets.hasBets();

    this.actions.setEnabled(TableAction.SPIN, open && hasBets);
    this.actions.setEnabled(TableAction.SPECIAL_BETS, false);
    this.actions.setEnabled(TableAction.CLEAR_BETS, open && hasBets);

    // Showing or hiding a button changes the cluster's width.
    if (this.actions.setVisibleAction(TableAction.CLEAR_BETS, hasBets) && this.metrics) {
      this.onResize(this.metrics);
    }
  }

  /* --------------------------------------------------------------------- */
  /* Wheel overlay                                                         */
  /* --------------------------------------------------------------------- */

  /**
   * Bring the wheel in over the table.
   *
   * The reference client hides the wheel entirely while betting and zooms it in
   * for the spin. That is worth copying for more than looks: it lets the felt
   * use the full screen during the only phase where the player is reading it,
   * and it puts the wheel at a size where the ball is actually followable
   * during the only phase where that matters.
   */
  private showWheelOverlay(): void {
    const metrics = this.metrics;
    if (!metrics) return;

    this.wheelLayer.visible = true;
    this.dimLayer.visible = true;

    // The chip stepper and the action cluster have nothing to offer mid-spin,
    // and at the size the wheel comes in at they would sit on top of it. The
    // reference hides both and keeps only the two status bars.
    this.context.animations.fadeOut(this.chipStepper, 0.25);
    this.context.animations.fadeOut(this.actions, 0.25);

    this.context.animations.to(this.dimLayer, {
      alpha: 1,
      duration: 0.4,
      ease: AnimationManager.EASE_UI_IN,
      overwrite: 'auto',
    });
    this.context.animations.fromTo(
      this.wheelLayer,
      { alpha: 0 },
      { alpha: 1, duration: 0.35, ease: AnimationManager.EASE_UI_IN, overwrite: 'auto' },
    );
    this.context.animations.fromTo(
      this.wheelLayer.scale,
      { x: 0.25, y: 0.25 },
      { x: 1, y: 1, duration: 0.62, ease: 'back.out(1.25)', overwrite: 'auto' },
    );
  }

  private hideWheelOverlay(): void {
    this.context.animations.fadeIn(this.chipStepper, 0.3);
    this.context.animations.fadeIn(this.actions, 0.3);

    if (!this.wheelLayer.visible) return;

    this.context.animations.to(this.dimLayer, {
      alpha: 0,
      duration: 0.45,
      overwrite: 'auto',
      onComplete: () => {
        this.dimLayer.visible = false;
      },
    });
    this.context.animations.to(this.wheelLayer, {
      alpha: 0,
      duration: 0.45,
      overwrite: 'auto',
      onComplete: () => {
        this.wheelLayer.visible = false;
        this.wheelLayer.scale.set(1);
      },
    });
    this.context.animations.to(this.wheelLayer.scale, {
      x: 0.22,
      y: 0.22,
      duration: 0.5,
      ease: 'power2.in',
      overwrite: 'auto',
    });
  }

  /* --------------------------------------------------------------------- */
  /* Result presentation                                                   */
  /* --------------------------------------------------------------------- */

  private presentWinner(number: RouletteNumber, color: PocketColor): void {
    const cell = this.board.highlightWinner(number);
    if (cell) this.marker.showDolly(cell.x, cell.y, number);

    const metrics = this.metrics;
    if (metrics) {
      this.marker.showBanner(
        ...this.bannerAnchor(metrics),
        number,
        this.colorLabel(color),
      );
    }

    this.context.audio.play(SoundId.BALL_DROP, 0.5);
  }

  /**
   * Where the result card goes.
   *
   * It has to clear the wheel *and* stay on screen, and on a narrow viewport
   * those two demands conflict - so the card slots into whichever side gap is
   * wider, and falls back to centred-below when neither gap can hold it. Fixing
   * it at a percentage of the width, which is what it did first, puts it
   * straight over the wheel on anything but the reference's aspect ratio.
   */
  private bannerAnchor(metrics: LayoutMetrics): [number, number] {
    const card = this.marker.getBannerSize();
    const wheelCentre = this.wheelLayer.position;
    const wheelRadius = this.wheel.getRadius();
    const margin = 16 * metrics.scale;

    const rightGap = metrics.width - (wheelCentre.x + wheelRadius);
    const leftGap = wheelCentre.x - wheelRadius;

    let x: number;
    let y = wheelCentre.y;

    if (rightGap >= card.width + margin * 2) {
      x = metrics.width - card.width / 2 - margin;
    } else if (leftGap >= card.width + margin * 2) {
      x = card.width / 2 + margin;
    } else {
      // No room either side: sit it below the wheel, centred.
      x = metrics.width / 2;
      y = Math.min(
        metrics.height - card.height / 2 - margin,
        wheelCentre.y + wheelRadius + card.height / 2 + margin,
      );
    }

    const local = this.hudLayer.toLocal({ x, y });
    return [local.x, local.y];
  }

  private colorLabel(color: PocketColor): string {
    if (color === PocketColor.RED) return this.context.localization.t('label.red');
    if (color === PocketColor.BLACK) return this.context.localization.t('label.black');
    return '0';
  }

  private async runPayout(result: RoundResult): Promise<void> {
    this.lastResult = result;
    this.marker.hideBanner();

    const winners = result.resolutions.filter((r) => r.won).map((r) => r.spotId);
    const losers = result.resolutions.filter((r) => !r.won).map((r) => r.spotId);

    const sweepTarget = this.board
      .getChipLayer()
      .toLocal(this.wheelLayer.getGlobalPosition());
    if (losers.length > 0) {
      this.chips.animateLoss(losers, sweepTarget);
      this.context.audio.play(SoundId.CHIP_CLEAR, 0.55);
    }

    if (winners.length === 0) {
      this.context.audio.play(SoundId.LOSE, 0.5);
      await this.context.animations.wait(this.context.config.timing.payoutDuration * 0.5);
      return;
    }

    const collectTarget = this.board
      .getChipLayer()
      .toLocal(this.bottomBar.getGlobalPosition());

    const big = result.totalPayout >= result.totalStaked * 8;
    this.context.audio.play(big ? SoundId.BIG_WIN : SoundId.WIN);
    this.context.audio.play(SoundId.PAYOUT, 0.7);

    await this.chips.animateWin(winners, collectTarget);
  }

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

    const regions = this.solve(metrics);
    this.applyRegions(regions, metrics);
  }

  /**
   * One solver for both orientations.
   *
   * The reference is a desktop layout: bars top and bottom, the felt filling
   * everything between, and the controls tucked into the bottom corners *over*
   * the felt rather than in reserved strips. Portrait keeps the same structure
   * and rotates the felt a quarter turn, which is the only way a 14:5 layout is
   * legible on a phone.
   */
  private solve(metrics: LayoutMetrics): Record<string, Rect> {
    const scale = metrics.scale;
    const portrait = metrics.orientation === Orientation.PORTRAIT;

    const left = metrics.safeLeft;
    const top = metrics.safeTop;
    const width = metrics.safeWidth;
    const height = metrics.safeHeight;

    const topBarHeight = Math.max(MIN_PX.HUD_HEIGHT, (portrait ? 56 : 62) * scale);
    const bottomBarHeight = Math.max(38, (portrait ? 44 : 48) * scale);
    const controlsHeight = Math.max(MIN_PX.TOUCH + 24, (portrait ? 110 : 128) * scale);

    const bodyTop = top + topBarHeight;
    const bodyHeight = height - topBarHeight - bottomBarHeight;

    // The felt takes the body minus the control strip along its bottom.
    const boardHeight = Math.max(60, bodyHeight - controlsHeight);
    const pad = 10 * scale;

    return {
      topBar: { x: left, y: top, width, height: topBarHeight },
      bottomBar: {
        x: left,
        y: top + height - bottomBarHeight,
        width,
        height: bottomBarHeight,
      },
      board: {
        x: left + pad,
        y: bodyTop + pad,
        width: width - pad * 2,
        height: boardHeight - pad * 2,
      },
      chips: {
        x: left + pad,
        y: bodyTop + boardHeight,
        width: portrait ? width * 0.55 : width * 0.34,
        height: controlsHeight,
      },
      actions: {
        x: left + width * (portrait ? 0.45 : 0.5),
        y: bodyTop + boardHeight,
        width: width * (portrait ? 0.55 : 0.5) - pad,
        height: controlsHeight,
      },
      // The overlay wheel is measured against the *whole* viewport rather than
      // the felt's slot: it is a takeover, and in the reference it fills the
      // screen vertically between the two bars.
      wheel: {
        x: left,
        y: top + topBarHeight,
        width,
        height: height - topBarHeight - bottomBarHeight,
      },
    };
  }

  private applyRegions(regions: Record<string, Rect>, metrics: LayoutMetrics): void {
    const portrait = metrics.orientation === Orientation.PORTRAIT;
    const scale = metrics.scale;

    /* ----- Felt background, full bleed ----- */
    this.drawFelt(metrics);

    /* ----- Board ----- */
    const boardRect = regions.board;
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
    this.chips.setChipSize(cell * 0.62);
    this.marker.setScale(cell);
    // Card sized against the viewport, not the felt - see `setCardScale`.
    this.marker.setCardScale(Math.min(metrics.width, metrics.height) * 0.075);
    this.chips.syncStacks(this.bets.getBets(), (spotId) => this.board.getSpotPosition(spotId));

    /* ----- Wheel overlay: as large as the body allows ----- */
    const wheelRect = regions.wheel;
    // 0.52 rather than 0.47: the reference wheel slightly overruns its box,
    // which is what makes it read as sitting *over* the table rather than in a
    // panel cut out of it.
    const radius = Math.max(60, Math.min(wheelRect.width, wheelRect.height) * 0.52);
    this.wheel.setRadius(radius);
    this.ball.setWheelRadius(radius);
    this.wheelLayer.position.set(
      wheelRect.x + wheelRect.width / 2,
      wheelRect.y + wheelRect.height / 2,
    );

    this.dimLayer.clear();
    this.dimLayer
      .rect(0, 0, metrics.width, metrics.height)
      .fill({ color: 0x000000, alpha: 0.62 });

    /* ----- Bars ----- */
    const topRect = regions.topBar;
    this.topBar.position.set(topRect.x, topRect.y);
    this.topBar.resize(topRect.width, topRect.height, scale);
    this.topBar.setLimits(
      this.context.config.betting.minBet,
      this.context.config.betting.maxBet,
      this.context.config.network.currency,
    );
    this.topBar.update(this.historyManager.getEntries());

    const bottomRect = regions.bottomBar;
    this.bottomBar.position.set(bottomRect.x, bottomRect.y);
    this.bottomBar.resize(bottomRect.width, bottomRect.height, scale);

    /* ----- Controls ----- */
    const chipsRect = regions.chips;
    this.chipStepper.position.set(
      chipsRect.x + chipsRect.width / 2,
      chipsRect.y + chipsRect.height / 2,
    );
    this.chipStepper.resize(chipsRect.width, chipsRect.height, scale);

    const actionsRect = regions.actions;
    this.actions.position.set(
      actionsRect.x + actionsRect.width / 2,
      actionsRect.y + actionsRect.height / 2,
    );
    this.actions.resize(actionsRect.width, actionsRect.height, scale);
  }

  /** Full-bleed felt, using the operator texture when one is supplied. */
  private drawFelt(metrics: LayoutMetrics): void {
    const texture = this.context.textures.getFeltTexture();
    this.feltLayer.clear();

    if (!texture) {
      this.feltLayer
        .rect(0, 0, metrics.width, metrics.height)
        .fill({ color: this.context.theme.feltPrimary });
      return;
    }

    const cover = Math.max(metrics.width / texture.width, metrics.height / texture.height);
    const matrix = new Matrix()
      .scale(cover, cover)
      .translate(
        (metrics.width - texture.width * cover) / 2,
        (metrics.height - texture.height * cover) / 2,
      );

    this.feltLayer.rect(0, 0, metrics.width, metrics.height).fill({ texture, matrix });
  }

  private drawBackground(metrics: LayoutMetrics, theme: Theme): void {
    const bands = 12;
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
    this.topBar.setTheme(theme);
    this.bottomBar.setTheme(theme);
    this.chipStepper.setTheme(theme);
    this.actions.setTheme(theme);
    this.marker.setTheme(theme);
    this.history.setTheme(theme);

    if (this.metrics) this.onResize(this.metrics);
  }

  public override onLanguageChange(): void {
    const localization = this.context.localization;
    this.board.setLocalization(localization);
    this.topBar.setLocalization(localization);
    this.bottomBar.setLocalization(localization);
    this.actions.setLocalization(localization);
    this.history.setLocalization(localization);

    if (this.metrics) this.onResize(this.metrics);
  }

  public override onConfigChange(config: typeof this.context.config): void {
    this.bets.updateConfig(config.betting);
    this.chips.updateDenominations(config.betting.chips);
    this.chipStepper.updateDenominations(config.betting.chips);
    this.wheelManager.updateConfig(config.wheel);
    this.gameManager.updateConfig(config);
    this.bottomBar.setCurrency(config.network.currency);

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
    this.hideWheelOverlay();
    this.bets.resetAll(this.context.config.network.startingBalance);
    this.historyManager.clear();
    this.lastResult = undefined;

    this.bottomBar.setCash(this.context.config.network.startingBalance, false);
    this.bottomBar.setStake(0);

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
    this.chipStepper.onSelect = undefined;
    this.actions.onAction = undefined;
    this.bottomBar.onAction = undefined;

    super.destroy();
  }
}
