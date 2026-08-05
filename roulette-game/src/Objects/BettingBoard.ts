import { BitmapText, Container, FederatedPointerEvent, Graphics, Point, Sprite } from 'pixi.js';
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
  /**
   * Additive glows laid over the cells a hovered bet covers.
   *
   * Pooled sprites rather than drawn rectangles, because the effect depends on
   * *additive blending*: one cyan sprite reads pale pink over a red cell and
   * stays cyan over a black one, which is exactly the two-colour behaviour the
   * reference client shows - from a single texture.
   */
  private readonly glowLayer = new Container();
  private readonly glowPool: Sprite[] = [];

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

    this.addChild(this.felt, this.grid, this.labels, this.glowLayer, this.hoverLayer);
    this.addChild(this.winGlow, this.winLayer, this.chipLayer);

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
    this.releaseGlows();
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

  /**
   * Light every cell a hovered spot pays on.
   *
   * Glow sprites are recycled between hovers - moving the pointer across the
   * grid must not allocate, and on a 12-number column bet that would otherwise
   * be twelve sprites per pointer move.
   */
  private drawHover(spot: BetSpot | undefined): void {
    this.releaseGlows();
    this.hoverLayer.clear();
    if (!spot) return;

    for (const number of spot.numbers) {
      const rect = this.cellRect(number);
      if (!rect) continue;
      this.showGlow(rect);
    }

    // Split, corner and six-line bets cover cells that are not adjacent on
    // screen, so a marker on the spot itself says which point was picked.
    const centre = this.boardToLocal(spot.x, spot.y);
    this.hoverLayer
      .circle(centre.x, centre.y, this.cell * 0.1)
      .fill({ color: this.theme.feltLine, alpha: 0.9 });
  }

  /** Take a glow from the pool and lay it over a cell. */
  private showGlow(rect: { x: number; y: number; width: number; height: number }): void {
    let glow = this.glowPool.find((candidate) => !candidate.visible);

    if (!glow) {
      glow = new Sprite(this.textures.getGlowTexture());
      glow.anchor.set(0.5);
      glow.blendMode = 'add';
      this.glowPool.push(glow);
      this.glowLayer.addChild(glow);
    }

    glow.visible = true;
    glow.tint = this.theme.betGlow;
    glow.alpha = 0.55;
    glow.position.set(rect.x + rect.width / 2, rect.y + rect.height / 2);
    // Slightly larger than the cell so the falloff bleeds over the white rule,
    // which is what makes the whole cell read as lit rather than just its middle.
    glow.width = rect.width * 1.15;
    glow.height = rect.height * 1.15;
  }

  private releaseGlows(): void {
    for (const glow of this.glowPool) glow.visible = false;
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
    this.releaseGlows();

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
    this.releaseGlows();
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

  /**
   * The reference layout is printed *directly onto the table* - there is no
   * panel, no surround and no border around the grid. The scene owns the felt
   * background, so this draws nothing at all; the method is kept as the single
   * place that decision is recorded.
   */
  private drawFelt(): void {
    /* Intentionally empty - see the comment above. */
  }

  /**
   * The 36 numbered cells plus the zero.
   *
   * Zero is drawn as a left-pointing pentagon rather than a rectangle, which is
   * how it is printed on a real single-zero layout and how the reference client
   * renders it.
   */
  private drawNumberCells(): void {
    const stroke = this.lineWidth();

    for (const spot of this.layout.getSpotsOfType(BetType.STRAIGHT_UP)) {
      const value = spot.numbers[0];
      const rect = this.cellRect(value);
      if (!rect) continue;

      const color = getNumberColor(value);
      const isZero = color === PocketColor.GREEN;

      if (isZero) {
        this.drawZeroPentagon(rect, stroke);
      } else {
        this.grid
          .rect(rect.x, rect.y, rect.width, rect.height)
          .fill({ color: color === PocketColor.RED ? this.theme.red : this.theme.black })
          .stroke({ width: stroke, color: this.theme.feltLine });
      }

      this.addLabel(
        String(value),
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
        this.cell * 0.46,
        FONT.NUMBER,
      );
    }
  }

  /** Left-pointing pentagon occupying the zero cell. */
  private drawZeroPentagon(
    rect: { x: number; y: number; width: number; height: number },
    stroke: number,
  ): void {
    const tip = rect.x - this.cell * 0.34;
    const midY = rect.y + rect.height / 2;
    // The shoulders sit a little in from the corners so the point reads as a
    // chamfer on the cell rather than a separate arrow head.
    const shoulder = rect.height * 0.22;

    this.grid
      .moveTo(rect.x + rect.width, rect.y)
      .lineTo(rect.x, rect.y)
      .lineTo(tip, rect.y + shoulder)
      .lineTo(tip, midY)
      .lineTo(tip, rect.y + rect.height - shoulder)
      .lineTo(rect.x, rect.y + rect.height)
      .lineTo(rect.x + rect.width, rect.y + rect.height)
      .closePath()
      .fill({ color: this.theme.green })
      .stroke({ width: stroke, color: this.theme.feltLine });
  }

  /** White rule width, scaled with the cell but never sub-pixel. */
  private lineWidth(): number {
    return Math.max(1.5, this.cell * 0.035);
  }

  private drawColumnBets(): void {
    for (const spot of this.layout.getSpotsOfType(BetType.COLUMN)) {
      this.drawOutsideCell(spot, '2:1', this.cell * 0.4);
    }
  }

  private drawDozens(): void {
    for (const spot of this.layout.getSpotsOfType(BetType.DOZEN)) {
      this.drawOutsideCell(spot, this.localization.t(spot.label), this.cell * 0.3);
    }
  }

  /**
   * Even-money row.
   *
   * Red and Black are solid blocks of their colour filling the whole cell -
   * that is what the reference prints, and it is language independent.
   */
  private drawOutsideBets(): void {
    for (const type of [
      BetType.LOW,
      BetType.EVEN,
      BetType.RED,
      BetType.BLACK,
      BetType.ODD,
      BetType.HIGH,
    ]) {
      for (const spot of this.layout.getSpotsOfType(type)) {
        if (type === BetType.RED || type === BetType.BLACK) {
          this.drawOutsideCell(spot, '', 0, type === BetType.RED ? this.theme.red : this.theme.black);
        } else {
          this.drawOutsideCell(spot, this.localization.t(spot.label), this.cell * 0.34);
        }
      }
    }
  }

  /**
   * One outside-bet cell: an optional solid fill, a white rule and a label.
   *
   * `fill` omitted leaves the felt showing through, which is how every
   * non-colour outside bet is printed.
   */
  private drawOutsideCell(
    spot: BetSpot,
    label: string,
    fontSize: number,
    fill?: number,
  ): void {
    const topLeft = this.boardToLocal(spot.x - spot.hitWidth, spot.y - spot.hitHeight);
    const width = spot.hitWidth * 2 * this.cell;
    const height = spot.hitHeight * 2 * this.cell;

    const shape = this.grid.rect(topLeft.x, topLeft.y, width, height);
    if (fill !== undefined) shape.fill({ color: fill });
    shape.stroke({ width: this.lineWidth(), color: this.theme.feltLine });

    if (label) {
      this.addLabel(label, topLeft.x + width / 2, topLeft.y + height / 2, fontSize, FONT.UI);
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
