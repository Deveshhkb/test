import {
  BitmapText,
  Container,
  FederatedPointerEvent,
  Graphics,
  Matrix,
  Point,
  Sprite,
} from 'pixi.js';
import { TableLayout } from '../Game/TableLayout';
import { TextureFactory } from '../Game/TextureFactory';
import { FONT } from '../Game/Fonts';
import { BOARD, BOARD_HEIGHT, BOARD_WIDTH, getNumberColor, gridNumber } from '../Game/Constants';
import { Localization } from '../Localization';
import { BetSpot, BetType, PocketColor, RouletteNumber, Theme } from '../Types';
import { numberKey } from '../Utilities/Helpers';

/**
 * The betting felt.
 *
 * Responsibilities are narrow by design: draw the layout, translate pointer
 * positions into bet spots, and highlight things. It holds no wager state -
 * that is {@link BetManager}'s job - and it runs no animations of its own
 * beyond static highlight redraws.
 *
 * ## Geometry
 * Everything is authored in *board units* (1 unit = 1 number cell) and scaled
 * by a single `cell` value computed at layout time. There is not a hard-coded
 * pixel coordinate anywhere in the class, which is what lets the identical
 * drawing code serve a 320px-wide phone and a 4K monitor.
 *
 * ## Redraw policy
 * The felt is drawn on layout, theme change and language change only - never
 * per frame. Hover and win highlights live on separate thin `Graphics` layers
 * so touching them never re-tessellates the 150-odd cells underneath.
 */
export class BettingBoard extends Container {
  /* Layers, back to front. */
  private readonly felt = new Graphics();
  private readonly grid = new Graphics();
  private readonly labels = new Container();
  private readonly hoverLayer = new Graphics();
  private readonly winLayer = new Graphics();
  private readonly winGlow: Sprite;
  private readonly chipLayer = new Container();

  /** Pixel size of one board unit. */
  private cell = 40;
  private interactiveEnabled = false;
  private hoveredSpotId?: string;

  /** Fired when the player commits to a spot. */
  public onSpotSelected?: (spot: BetSpot) => void;
  /** Fired when the hovered spot changes (desktop only). */
  public onSpotHover?: (spot: BetSpot | undefined) => void;

  public constructor(
    private readonly layout: TableLayout,
    private readonly textures: TextureFactory,
    private theme: Theme,
    private localization: Localization,
    private isTouch: boolean,
  ) {
    super();

    this.winGlow = new Sprite(textures.getGlowTexture());
    this.winGlow.anchor.set(0.5);
    this.winGlow.alpha = 0;
    this.winGlow.blendMode = 'add';

    this.addChild(this.felt, this.grid, this.labels, this.hoverLayer, this.winGlow, this.winLayer);
    this.addChild(this.chipLayer);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointertap', this.handleTap);
    if (!isTouch) {
      this.on('pointermove', this.handleMove);
      this.on('pointerleave', this.handleLeave);
    }
  }

  /** Chips are parented to the board so they inherit its transform for free. */
  public getChipLayer(): Container {
    return this.chipLayer;
  }

  /* --------------------------------------------------------------------- */
  /* Layout                                                                */
  /* --------------------------------------------------------------------- */

  /** Board size in pixels at the current cell scale. */
  public getBoardSize(): { width: number; height: number } {
    return { width: BOARD_WIDTH * this.cell, height: BOARD_HEIGHT * this.cell };
  }

  public getCellSize(): number {
    return this.cell;
  }

  /**
   * Fit the board into the given box.
   *
   * The smaller of the two fit factors wins, so the felt is letterboxed inside
   * its slot and never distorted.
   */
  public resize(availableWidth: number, availableHeight: number): void {
    const cell = Math.min(availableWidth / BOARD_WIDTH, availableHeight / BOARD_HEIGHT);
    this.cell = Math.max(8, cell);

    // Centre the board on its own origin so callers position it by its middle.
    this.pivot.set((BOARD_WIDTH * this.cell) / 2, (BOARD_HEIGHT * this.cell) / 2);

    this.redraw();
  }

  public setTheme(theme: Theme): void {
    this.theme = theme;
    this.redraw();
  }

  public setLocalization(localization: Localization): void {
    this.localization = localization;
    this.redraw();
  }

  public setTouchMode(isTouch: boolean): void {
    if (this.isTouch === isTouch) return;
    this.isTouch = isTouch;

    this.off('pointermove', this.handleMove);
    this.off('pointerleave', this.handleLeave);
    if (!isTouch) {
      this.on('pointermove', this.handleMove);
      this.on('pointerleave', this.handleLeave);
    }
  }

  /* --------------------------------------------------------------------- */
  /* Coordinate conversion                                                 */
  /* --------------------------------------------------------------------- */

  /** Board units -> board-local pixels. */
  public boardToLocal(x: number, y: number): { x: number; y: number } {
    return { x: (x - BOARD.MIN_X) * this.cell, y: (y - BOARD.MIN_Y) * this.cell };
  }

  /** Board-local pixels -> board units. */
  public localToBoard(x: number, y: number): { x: number; y: number } {
    return { x: x / this.cell + BOARD.MIN_X, y: y / this.cell + BOARD.MIN_Y };
  }

  /** Centre of a bet spot in board-local pixels - where its chip stack sits. */
  public getSpotPosition(spotId: string): { x: number; y: number } | undefined {
    const spot = this.layout.getSpot(spotId);
    if (!spot) return undefined;
    return this.boardToLocal(spot.x, spot.y);
  }

  /* --------------------------------------------------------------------- */
  /* Interaction                                                           */
  /* --------------------------------------------------------------------- */

  public setInteractiveEnabled(enabled: boolean): void {
    this.interactiveEnabled = enabled;
    this.eventMode = enabled ? 'static' : 'none';
    this.cursor = enabled ? 'pointer' : 'default';
    if (!enabled) this.clearHover();
  }

  private readonly handleTap = (event: FederatedPointerEvent): void => {
    if (!this.interactiveEnabled) return;
    const spot = this.resolveSpot(event);
    if (spot) this.onSpotSelected?.(spot);
  };

  private readonly handleMove = (event: FederatedPointerEvent): void => {
    if (!this.interactiveEnabled) return;
    const spot = this.resolveSpot(event);

    if (spot?.id === this.hoveredSpotId) return;
    this.hoveredSpotId = spot?.id;
    this.drawHover(spot);
    this.onSpotHover?.(spot);
  };

  private readonly handleLeave = (): void => this.clearHover();

  private clearHover(): void {
    if (this.hoveredSpotId === undefined) return;
    this.hoveredSpotId = undefined;
    this.hoverLayer.clear();
    this.onSpotHover?.(undefined);
  }

  private resolveSpot(event: FederatedPointerEvent): BetSpot | undefined {
    const local = this.toLocal(event.global, undefined, TEMP_POINT);
    const board = this.localToBoard(local.x, local.y);
    return this.layout.hitTest(board.x, board.y, this.isTouch);
  }

  /* --------------------------------------------------------------------- */
  /* Highlights                                                            */
  /* --------------------------------------------------------------------- */

  /** Outline every cell a hovered spot pays on. */
  private drawHover(spot: BetSpot | undefined): void {
    this.hoverLayer.clear();
    if (!spot) return;

    for (const number of spot.numbers) {
      const rect = this.cellRect(number);
      if (!rect) continue;
      this.hoverLayer
        .rect(rect.x, rect.y, rect.width, rect.height)
        .fill({ color: this.theme.highlight, alpha: 0.22 });
    }

    // A marker on the spot itself disambiguates split/corner bets, where the
    // highlighted cells alone do not say which point was picked.
    const centre = this.boardToLocal(spot.x, spot.y);
    this.hoverLayer
      .circle(centre.x, centre.y, this.cell * 0.16)
      .fill({ color: this.theme.highlight, alpha: 0.85 });
  }

  /**
   * Light the winning number's cell. Returns the cell centre in board-local
   * pixels so the caller can park the dolly there.
   */
  public highlightWinner(number: RouletteNumber): { x: number; y: number } | undefined {
    this.winLayer.clear();
    const rect = this.cellRect(number);
    if (!rect) return undefined;

    this.winLayer
      .rect(rect.x, rect.y, rect.width, rect.height)
      .fill({ color: this.theme.highlight, alpha: 0.3 })
      .stroke({ width: Math.max(2, this.cell * 0.08), color: this.theme.highlight });

    const centre = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    this.winGlow.position.set(centre.x, centre.y);
    this.winGlow.width = this.cell * 4;
    this.winGlow.height = this.cell * 4;
    this.winGlow.tint = this.theme.highlight;

    return centre;
  }

  public getWinGlow(): Sprite {
    return this.winGlow;
  }

  public clearWinHighlight(): void {
    this.winLayer.clear();
    this.winGlow.alpha = 0;
  }

  /** Dim every cell the result did not pay - the "losers" pass. */
  public dimLosingSpots(winning: RouletteNumber): void {
    const winningKey = numberKey(winning);
    this.hoverLayer.clear();

    for (let column = 0; column < BOARD.COLUMNS; column += 1) {
      for (let row = 0; row < BOARD.ROWS; row += 1) {
        const value = gridNumber(column, row);
        if (numberKey(value) === winningKey) continue;
        const rect = this.cellRect(value);
        if (!rect) continue;
        this.hoverLayer
          .rect(rect.x, rect.y, rect.width, rect.height)
          .fill({ color: 0x000000, alpha: 0.42 });
      }
    }
  }

  public clearDim(): void {
    this.hoverLayer.clear();
  }

  /** Board-local rectangle of a number's cell. */
  private cellRect(
    value: RouletteNumber,
  ): { x: number; y: number; width: number; height: number } | undefined {
    const spot = this.layout.getSpot(`straight:${numberKey(value)}`);
    if (!spot) return undefined;

    const topLeft = this.boardToLocal(spot.x - spot.hitWidth, spot.y - spot.hitHeight);
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: spot.hitWidth * 2 * this.cell,
      height: spot.hitHeight * 2 * this.cell,
    };
  }

  /* --------------------------------------------------------------------- */
  /* Drawing                                                               */
  /* --------------------------------------------------------------------- */

  private redraw(): void {
    this.felt.clear();
    this.grid.clear();
    this.hoverLayer.clear();
    this.winLayer.clear();
    this.labels.removeChildren().forEach((child) => child.destroy());

    this.drawFelt();
    this.drawNumberCells();
    this.drawColumnBets();
    this.drawDozens();
    this.drawOutsideBets();
    this.drawPointMarkers();
  }

  private drawFelt(): void {
    const { width, height } = this.getBoardSize();
    const pad = this.cell * 0.35;
    const radius = this.cell * 0.3;

    // Table surround, slightly larger than the printed layout.
    this.felt
      .roundRect(-pad, -pad, width + pad * 2, height + pad * 2, radius)
      .fill({ color: this.theme.feltSecondary })
      .stroke({ width: Math.max(2, this.cell * 0.07), color: this.theme.goldDark, alpha: 0.85 });

    const inner = {
      x: -pad * 0.4,
      y: -pad * 0.4,
      width: width + pad * 0.8,
      height: height + pad * 0.8,
    };
    const feltTexture = this.textures.getFeltTexture();

    if (feltTexture) {
      // Scale the felt photograph to cover the layout. `cover` rather than
      // `stretch` keeps the weave isotropic - a non-uniform scale on a fabric
      // texture reads immediately as wrong.
      const cover = Math.max(
        inner.width / feltTexture.width,
        inner.height / feltTexture.height,
      );
      // Centre the overflow. The felt art is vignetted, so anchoring it at the
      // top-left would park its bright spot in a corner and leave the layout
      // visibly lit from one side.
      const scaledWidth = feltTexture.width * cover;
      const scaledHeight = feltTexture.height * cover;
      const matrix = new Matrix()
        .scale(cover, cover)
        .translate(
          inner.x + (inner.width - scaledWidth) / 2,
          inner.y + (inner.height - scaledHeight) / 2,
        );

      this.felt
        .roundRect(inner.x, inner.y, inner.width, inner.height, radius * 0.7)
        .fill({ texture: feltTexture, matrix });
      return;
    }

    this.felt
      .roundRect(inner.x, inner.y, inner.width, inner.height, radius * 0.7)
      .fill({ color: this.theme.feltPrimary });
  }

  private drawNumberCells(): void {
    const stroke = Math.max(1, this.cell * 0.045);

    // Zero (and 00 on an American layout) are their own spots, coloured green.
    for (const spot of this.layout.getSpotsOfType(BetType.STRAIGHT_UP)) {
      const value = spot.numbers[0];
      const rect = this.cellRect(value);
      if (!rect) continue;

      const color = getNumberColor(value);
      const fill =
        color === PocketColor.RED
          ? this.theme.red
          : color === PocketColor.BLACK
            ? this.theme.black
            : this.theme.green;

      this.grid
        .rect(rect.x, rect.y, rect.width, rect.height)
        .fill({ color: fill })
        .stroke({ width: stroke, color: this.theme.feltLine, alpha: 0.9 });

      this.addLabel(
        String(value),
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
        this.cell * 0.46,
        FONT.NUMBER,
      );
    }
  }

  private drawColumnBets(): void {
    const stroke = Math.max(1, this.cell * 0.045);

    for (const spot of this.layout.getSpotsOfType(BetType.COLUMN)) {
      const topLeft = this.boardToLocal(spot.x - spot.hitWidth, spot.y - spot.hitHeight);
      const width = spot.hitWidth * 2 * this.cell;
      const height = spot.hitHeight * 2 * this.cell;

      this.grid
        .rect(topLeft.x, topLeft.y, width, height)
        .fill({ color: this.theme.feltPrimary })
        .stroke({ width: stroke, color: this.theme.feltLine, alpha: 0.9 });

      this.addLabel(
        this.localization.t('label.column'),
        topLeft.x + width / 2,
        topLeft.y + height / 2,
        this.cell * 0.26,
        FONT.UI,
      );
    }
  }

  private drawDozens(): void {
    const stroke = Math.max(1, this.cell * 0.045);

    for (const spot of this.layout.getSpotsOfType(BetType.DOZEN)) {
      const topLeft = this.boardToLocal(spot.x - spot.hitWidth, spot.y - spot.hitHeight);
      const width = spot.hitWidth * 2 * this.cell;
      const height = spot.hitHeight * 2 * this.cell;

      this.grid
        .rect(topLeft.x, topLeft.y, width, height)
        .fill({ color: this.theme.feltPrimary })
        .stroke({ width: stroke, color: this.theme.feltLine, alpha: 0.9 });

      this.addLabel(
        this.localization.t(spot.label),
        topLeft.x + width / 2,
        topLeft.y + height / 2,
        this.cell * 0.34,
        FONT.UI,
      );
    }
  }

  /**
   * Even-money row. Red and Black are drawn as diamonds rather than words,
   * which is both the table convention and language-independent.
   */
  private drawOutsideBets(): void {
    const stroke = Math.max(1, this.cell * 0.045);
    const diamondTypes = new Set<BetType>([BetType.RED, BetType.BLACK]);

    for (const type of [
      BetType.LOW,
      BetType.EVEN,
      BetType.RED,
      BetType.BLACK,
      BetType.ODD,
      BetType.HIGH,
    ]) {
      for (const spot of this.layout.getSpotsOfType(type)) {
        const topLeft = this.boardToLocal(spot.x - spot.hitWidth, spot.y - spot.hitHeight);
        const width = spot.hitWidth * 2 * this.cell;
        const height = spot.hitHeight * 2 * this.cell;
        const cx = topLeft.x + width / 2;
        const cy = topLeft.y + height / 2;

        this.grid
          .rect(topLeft.x, topLeft.y, width, height)
          .fill({ color: this.theme.feltPrimary })
          .stroke({ width: stroke, color: this.theme.feltLine, alpha: 0.9 });

        if (diamondTypes.has(type)) {
          const size = height * 0.32;
          this.grid
            .moveTo(cx, cy - size)
            .lineTo(cx + size, cy)
            .lineTo(cx, cy + size)
            .lineTo(cx - size, cy)
            .closePath()
            .fill({ color: type === BetType.RED ? this.theme.red : this.theme.black })
            .stroke({ width: Math.max(1, this.cell * 0.03), color: this.theme.feltLine });
        } else {
          this.addLabel(this.localization.t(spot.label), cx, cy, this.cell * 0.3, FONT.UI);
        }
      }
    }
  }

  /**
   * Faint dots on split/corner/street/six-line points.
   *
   * Real felt has no such marks, but on a touch screen with no hover state they
   * are the only affordance telling a player those bets exist at all. They are
   * subtle enough to read as part of the print.
   */
  private drawPointMarkers(): void {
    if (this.cell < 26) return;

    const pointTypes = [BetType.SPLIT, BetType.CORNER, BetType.STREET, BetType.SIX_LINE];
    for (const type of pointTypes) {
      for (const spot of this.layout.getSpotsOfType(type)) {
        const point = this.boardToLocal(spot.x, spot.y);
        this.grid
          .circle(point.x, point.y, this.cell * 0.035)
          .fill({ color: this.theme.feltLine, alpha: 0.32 });
      }
    }
  }

  private addLabel(
    text: string,
    x: number,
    y: number,
    fontSize: number,
    fontFamily: string,
  ): void {
    const label = new BitmapText({
      text,
      style: { fontFamily, fontSize, fill: this.theme.text },
    });
    label.anchor.set(0.5);
    label.position.set(x, y);
    this.labels.addChild(label);
  }

  public override destroy(): void {
    this.off('pointertap', this.handleTap);
    this.off('pointermove', this.handleMove);
    this.off('pointerleave', this.handleLeave);
    super.destroy({ children: true, texture: false });
  }
}

/** Reused to keep `toLocal` allocation-free on pointer move. */
const TEMP_POINT = new Point();
