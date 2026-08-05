import { BitmapText, Container, Graphics, Sprite } from "pixi.js";

import { Fonts, Palette, ROAD_BEAD_ROWS, ROAD_BIG_ROWS, ROAD_DERIVED_ROWS } from "../Constants";
import type { GameContext } from "../GameContext";
import { Ease } from "../managers/AnimationManager";
import {
  DerivedMark,
  RoundOutcome,
  type BigRoadCell,
  type DerivedCell,
  type RoadEntry,
  type RoadmapSnapshot,
} from "../types";

interface MarkSpec {
  readonly texture: string;
  readonly column: number;
  readonly row: number;
  /** Relative to cell size. */
  readonly scale?: number;
  readonly offsetX?: number;
  readonly offsetY?: number;
  readonly alpha?: number;
}

/**
 * One scrollable grid of marks (bead plate, big road, or a derived road).
 *
 * Sprites are recycled across renders: a roadmap update touches textures and
 * positions on existing sprites and never allocates, which matters because the
 * five roads together can hold several hundred marks and they all re-render on
 * every settled coup.
 */
class RoadPanel extends Container {
  private readonly ctx: GameContext;
  private readonly grid = new Graphics();
  private readonly markLayer = new Container();
  private readonly sprites: Sprite[] = [];
  private readonly title: BitmapText | null;

  private cell = 26;
  private rows: number;
  private columns = 12;
  private used = 0;

  constructor(ctx: GameContext, rows: number, title?: string) {
    super();
    this.ctx = ctx;
    this.rows = rows;

    this.addChild(this.grid, this.markLayer);

    if (title) {
      this.title = new BitmapText({
        text: title,
        style: { fontFamily: Fonts.Label, fontSize: 16 },
      });
      this.title.alpha = 0.5;
      this.title.position.set(2, -19);
      this.addChild(this.title);
    } else {
      this.title = null;
    }
  }

  get cellSize(): number {
    return this.cell;
  }

  get columnCount(): number {
    return this.columns;
  }

  /** Fits the grid to a pixel box, choosing the cell size from the row count. */
  resize(width: number, height: number): void {
    this.cell = Math.max(8, Math.floor(height / this.rows));
    this.columns = Math.max(1, Math.floor(width / this.cell));
    this.drawGrid();
    if (this.title) this.title.scale.set(Math.min(1, this.cell / 26));
  }

  private drawGrid(): void {
    const w = this.columns * this.cell;
    const h = this.rows * this.cell;

    this.grid
      .clear()
      .roundRect(0, 0, w, h, 4)
      .fill({ color: 0x000000, alpha: 0.34 });

    for (let c = 0; c <= this.columns; c++) {
      this.grid.moveTo(c * this.cell, 0).lineTo(c * this.cell, h);
    }
    for (let r = 0; r <= this.rows; r++) {
      this.grid.moveTo(0, r * this.cell).lineTo(w, r * this.cell);
    }
    this.grid.stroke({ width: 1, color: 0xffffff, alpha: 0.1 });
  }

  /** Replaces the panel's contents. Extra sprites are hidden, never destroyed. */
  render(marks: readonly MarkSpec[], animateLast: boolean): void {
    this.used = 0;

    for (const mark of marks) {
      const sprite = this.take();
      sprite.texture = this.ctx.assets.get(mark.texture);
      const scale = (mark.scale ?? 0.92) * (this.cell / sprite.texture.width);
      sprite.scale.set(scale);
      sprite.alpha = mark.alpha ?? 1;
      sprite.position.set(
        (mark.column + 0.5) * this.cell + (mark.offsetX ?? 0) * this.cell,
        (mark.row + 0.5) * this.cell + (mark.offsetY ?? 0) * this.cell,
      );
      sprite.visible = true;
    }

    for (let i = this.used; i < this.sprites.length; i++) this.sprites[i]!.visible = false;

    if (animateLast && this.used > 0) {
      const sprite = this.sprites[this.used - 1]!;
      this.ctx.animation.killTweensOf(sprite.scale);
      const target = sprite.scale.x;
      this.ctx.animation.fromTo(
        sprite.scale,
        { x: target * 2.2, y: target * 2.2 },
        { x: target, y: target, duration: 0.34, ease: Ease.uiIn },
      );
    }
  }

  private take(): Sprite {
    let sprite = this.sprites[this.used];
    if (!sprite) {
      sprite = new Sprite();
      sprite.anchor.set(0.5);
      this.sprites.push(sprite);
      this.markLayer.addChild(sprite);
    }
    this.used += 1;
    return sprite;
  }

  /**
   * Keeps the newest columns in view by shifting the mark layer left, the same
   * way a physical board scrolls when it fills up.
   */
  scrollToEnd(lastColumn: number): void {
    const overflow = lastColumn - (this.columns - 1);
    const targetX = overflow > 0 ? -overflow * this.cell : 0;
    if (Math.abs(this.markLayer.x - targetX) < 0.5) return;
    this.ctx.animation.to(this.markLayer, { x: targetX, duration: 0.3, ease: Ease.uiOut });
  }

  override destroy(): void {
    for (const sprite of this.sprites) this.ctx.animation.killTweensOf(sprite.scale);
    this.ctx.animation.killTweensOf(this.markLayer);
    this.sprites.length = 0;
    super.destroy({ children: true });
  }
}

/**
 * The full scoreboard cluster.
 *
 * Bead plate and Big Road on top, the three derived roads beneath — the
 * arrangement every live baccarat table uses, because the derived roads are
 * only meaningful next to the Big Road they are computed from.
 */
export class RoadMap extends Container {
  private readonly ctx: GameContext;
  private readonly bead: RoadPanel;
  private readonly big: RoadPanel;
  private readonly bigEye: RoadPanel;
  private readonly small: RoadPanel;
  private readonly cockroach: RoadPanel;
  private readonly frame = new Graphics();
  private readonly stats: BitmapText;

  private snapshot: RoadmapSnapshot | null = null;
  private boxWidth = 900;
  private boxHeight = 260;

  constructor(ctx: GameContext) {
    super();
    this.ctx = ctx;

    this.bead = new RoadPanel(ctx, ROAD_BEAD_ROWS, "BEAD PLATE");
    this.big = new RoadPanel(ctx, ROAD_BIG_ROWS, "BIG ROAD");
    this.bigEye = new RoadPanel(ctx, ROAD_DERIVED_ROWS, "BIG EYE BOY");
    this.small = new RoadPanel(ctx, ROAD_DERIVED_ROWS, "SMALL ROAD");
    this.cockroach = new RoadPanel(ctx, ROAD_DERIVED_ROWS, "COCKROACH");

    this.stats = new BitmapText({
      text: "",
      style: { fontFamily: Fonts.Label, fontSize: 18 },
    });
    this.stats.anchor.set(0, 1);
    this.stats.alpha = 0.8;

    this.addChild(this.frame, this.bead, this.big, this.bigEye, this.small, this.cockroach, this.stats);
  }

  /* ---------------------------------------------------------------- *
   * Layout
   * ---------------------------------------------------------------- */

  resizeTo(width: number, height: number, compact: boolean): void {
    this.boxWidth = width;
    this.boxHeight = height;

    const pad = 10;
    const gap = 8;
    const titleSpace = compact ? 0 : 20;
    const inner = width - pad * 2;

    // Top band: bead plate takes a third, big road the rest.
    const topHeight = (height - pad * 2 - gap - titleSpace * 2) * 0.58;
    const bottomHeight = height - pad * 2 - gap - topHeight - titleSpace * 2;

    const beadWidth = Math.floor(inner * 0.3);
    const bigWidth = inner - beadWidth - gap;

    this.bead.position.set(pad, pad + titleSpace);
    this.bead.resize(beadWidth, topHeight);

    this.big.position.set(pad + beadWidth + gap, pad + titleSpace);
    this.big.resize(bigWidth, topHeight);

    const derivedWidth = Math.floor((inner - gap * 2) / 3);
    const derivedY = pad + titleSpace * 2 + topHeight + gap;

    this.bigEye.position.set(pad, derivedY);
    this.bigEye.resize(derivedWidth, bottomHeight);

    this.small.position.set(pad + derivedWidth + gap, derivedY);
    this.small.resize(derivedWidth, bottomHeight);

    this.cockroach.position.set(pad + (derivedWidth + gap) * 2, derivedY);
    this.cockroach.resize(derivedWidth, bottomHeight);

    this.bead.visible = this.ctx.config.features.beadPlate && !compact;
    if (!this.bead.visible) {
      // Reclaim the bead plate's space for the big road on narrow layouts.
      this.big.position.set(pad, pad + titleSpace);
      this.big.resize(inner, topHeight);
    }

    this.stats.position.set(pad, height - 5);
    this.stats.scale.set(compact ? 0.8 : 1);

    this.frame
      .clear()
      .roundRect(0, 0, width, height, 12)
      .fill({ color: 0x040c08, alpha: 0.72 })
      .roundRect(0, 0, width, height, 12)
      .stroke({ width: 1.5, color: Palette.gold, alpha: 0.28 });

    if (this.snapshot) this.render(this.snapshot, false);
  }

  get size(): { width: number; height: number } {
    return { width: this.boxWidth, height: this.boxHeight };
  }

  /* ---------------------------------------------------------------- *
   * Rendering
   * ---------------------------------------------------------------- */

  render(snapshot: RoadmapSnapshot, animate = true): void {
    this.snapshot = snapshot;

    this.bead.render(this.beadMarks(snapshot.beadPlate), animate);
    this.big.render(this.bigMarks(snapshot.bigRoad), animate);
    this.bigEye.render(this.derivedMarks(snapshot.bigEyeBoy, "ring"), animate);
    this.small.render(this.derivedMarks(snapshot.smallRoad, "dot"), animate);
    this.cockroach.render(this.derivedMarks(snapshot.cockroachPig, "slash"), animate);

    this.big.scrollToEnd(snapshot.bigRoad.at(-1)?.column ?? 0);
    this.bigEye.scrollToEnd(snapshot.bigEyeBoy.at(-1)?.column ?? 0);
    this.small.scrollToEnd(snapshot.smallRoad.at(-1)?.column ?? 0);
    this.cockroach.scrollToEnd(snapshot.cockroachPig.at(-1)?.column ?? 0);

    const { player, banker, tie, total } = snapshot.stats;
    this.stats.text = `P ${player}   B ${banker}   T ${tie}   /   ${total}`;
  }

  /** Bead plate fills column-major, six per column, oldest first. */
  private beadMarks(entries: readonly RoadEntry[]): MarkSpec[] {
    const marks: MarkSpec[] = [];
    entries.forEach((entry, index) => {
      const column = Math.floor(index / ROAD_BEAD_ROWS);
      const row = index % ROAD_BEAD_ROWS;
      const texture =
        entry.outcome === RoundOutcome.Player
          ? "road_dot_player"
          : entry.outcome === RoundOutcome.Banker
            ? "road_dot_banker"
            : "road_dot_tie";
      marks.push({ texture, column, row });
      if (entry.playerPair) {
        marks.push({ texture: "road_dot_player", column, row, scale: 0.3, offsetX: -0.3, offsetY: -0.3 });
      }
      if (entry.bankerPair) {
        marks.push({ texture: "road_dot_banker", column, row, scale: 0.3, offsetX: 0.3, offsetY: 0.3 });
      }
    });
    return marks;
  }

  /** Big road: hollow rings, tie slashes stacked on the cell they interrupted. */
  private bigMarks(cells: readonly BigRoadCell[]): MarkSpec[] {
    const marks: MarkSpec[] = [];
    for (const cell of cells) {
      marks.push({
        texture:
          cell.outcome === RoundOutcome.Player ? "road_ring_player" : "road_ring_banker",
        column: cell.column,
        row: cell.row,
      });
      if (cell.tieCount > 0) {
        marks.push({
          texture: "road_tie_slash",
          column: cell.column,
          row: cell.row,
          scale: 0.8,
        });
      }
      if (cell.playerPair) {
        marks.push({
          texture: "road_dot_player",
          column: cell.column,
          row: cell.row,
          scale: 0.3,
          offsetX: -0.28,
          offsetY: -0.28,
        });
      }
      if (cell.bankerPair) {
        marks.push({
          texture: "road_dot_banker",
          column: cell.column,
          row: cell.row,
          scale: 0.3,
          offsetX: 0.28,
          offsetY: 0.28,
        });
      }
    }
    return marks;
  }

  private derivedMarks(
    cells: readonly DerivedCell[],
    style: "ring" | "dot" | "slash",
  ): MarkSpec[] {
    return cells.map((cell) => ({
      texture: `road_${style === "ring" ? "ring" : style === "dot" ? "small" : "slash"}_${
        cell.mark === DerivedMark.Red ? "banker" : "player"
      }`,
      column: cell.column,
      row: cell.row,
      scale: style === "ring" ? 0.8 : 0.85,
    }));
  }

  override destroy(): void {
    this.snapshot = null;
    super.destroy({ children: true });
  }
}
