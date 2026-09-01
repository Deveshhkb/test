import { BitmapText, Container, Graphics } from "pixi.js";

import { Fonts, Palette } from "../Constants";
import type { GameContext } from "../GameContext";
import { Ease } from "../managers/AnimationManager";
import { RoundOutcome, type RoadEntry } from "../types";
import { shade } from "../utils/Helpers";
import { ActionButton } from "./ActionButton";

interface Row {
  readonly index: BitmapText;
  readonly value: BitmapText;
  readonly pairMark: Graphics;
}

/**
 * The numbered results list from the reference table: two columns of ten,
 * newest at the bottom, with a close button.
 *
 * Deliberately not a bead plate — this is the compact "last twenty coups"
 * readout the single-player tables use. It reads the same `RoadEntry` history
 * the full roadmaps do, so a table can show either or both.
 */
export class ResultsPanel extends Container {
  private readonly ctx: GameContext;
  private readonly frame = new Graphics();
  private readonly grid = new Graphics();
  private readonly rows: Row[] = [];
  private readonly discs = new Graphics();
  private readonly closeButton: ActionButton;

  private readonly capacity: number;
  private readonly columns = 2;
  private readonly rowsPerColumn: number;

  private discRadius = 11;
  private boxWidth = 240;
  private boxHeight = 420;
  private open = true;

  constructor(ctx: GameContext, rowsPerColumn = 10) {
    super();
    this.ctx = ctx;
    this.rowsPerColumn = rowsPerColumn;
    this.capacity = rowsPerColumn * this.columns;

    this.addChild(this.frame, this.grid, this.discs);

    for (let i = 0; i < this.capacity; i++) {
      const index = new BitmapText({
        text: String(i + 1),
        style: { fontFamily: Fonts.Numeric, fontSize: 20 },
      });
      index.anchor.set(0.5);
      index.tint = 0x8f8676;

      const value = new BitmapText({
        text: "",
        style: { fontFamily: Fonts.Label, fontSize: 22 },
      });
      value.anchor.set(0.5);

      const pairMark = new Graphics();

      this.rows.push({ index, value, pairMark });
      this.addChild(index, value, pairMark);
    }

    this.closeButton = new ActionButton(ctx, {
      icon: "close",
      highlight: true,
      onTap: () => this.toggle(),
    });
    this.addChild(this.closeButton);
  }

  get isOpen(): boolean {
    return this.open;
  }

  /* ---------------------------------------------------------------- *
   * Layout
   * ---------------------------------------------------------------- */

  resizeTo(width: number, height: number): void {
    this.boxWidth = width;
    this.boxHeight = height;

    const pad = 6;
    const innerW = width - pad * 2;
    const innerH = height - pad * 2;
    const colWidth = innerW / this.columns;
    const rowHeight = innerH / this.rowsPerColumn;
    // Narrow numbered gutter on the left of each column, like the reference.
    const gutter = colWidth * 0.34;

    this.frame
      .clear()
      .roundRect(0, 0, width, height, 8)
      .fill({ color: 0x060a10, alpha: 0.94 })
      .roundRect(2, 2, width - 4, height - 4, 6)
      .stroke({ width: 1.5, color: 0xffffff, alpha: 0.08 })
      .roundRect(0, 0, width, height, 8)
      .stroke({ width: 2.5, color: Palette.gold, alpha: 0.95 });

    this.grid.clear();
    for (let c = 0; c < this.columns; c++) {
      const x = pad + c * colWidth;
      this.grid.rect(x, pad, gutter, innerH).fill({ color: 0xffffff, alpha: 0.05 });
      for (let r = 0; r <= this.rowsPerColumn; r++) {
        this.grid.moveTo(x, pad + r * rowHeight).lineTo(x + colWidth, pad + r * rowHeight);
      }
      this.grid.moveTo(x, pad).lineTo(x, pad + innerH);
      this.grid.moveTo(x + gutter, pad).lineTo(x + gutter, pad + innerH);
      this.grid.moveTo(x + colWidth, pad).lineTo(x + colWidth, pad + innerH);
    }
    this.grid.stroke({ width: 1, color: Palette.gold, alpha: 0.28 });

    const scale = Math.min(1, rowHeight / 26);
    this.discRadius = Math.min(rowHeight, colWidth - gutter) * 0.36;
    this.rows.forEach((row, i) => {
      const column = Math.floor(i / this.rowsPerColumn);
      const rowIndex = i % this.rowsPerColumn;
      const x = pad + column * colWidth;
      const y = pad + rowIndex * rowHeight + rowHeight / 2;

      row.index.position.set(x + gutter / 2, y);
      row.index.scale.set(scale);
      row.value.position.set(x + gutter + (colWidth - gutter) / 2, y);
      row.value.scale.set(scale);
      row.pairMark.position.set(x + colWidth - gutter * 0.35, y - rowHeight * 0.28);
    });

    this.closeButton.setRadius(Math.max(12, Math.min(18, width * 0.09)));
    this.closeButton.position.set(width - 4, -6);
  }

  get size(): { width: number; height: number } {
    return { width: this.boxWidth, height: this.boxHeight };
  }

  /* ---------------------------------------------------------------- *
   * Content
   * ---------------------------------------------------------------- */

  /** Renders the most recent `capacity` coups, oldest first. */
  render(entries: readonly RoadEntry[], animate = true): void {
    const visible = entries.slice(-this.capacity);
    const strings = this.ctx.config.strings;
    const theme = this.ctx.config.theme;

    this.discs.clear();

    this.rows.forEach((row, i) => {
      const entry = visible[i];
      if (!entry) {
        row.value.text = "";
        row.pairMark.clear();
        return;
      }

      const isPlayer = entry.outcome === RoundOutcome.Player;
      const isBanker = entry.outcome === RoundOutcome.Banker;
      const color = isPlayer ? theme.player : isBanker ? theme.banker : theme.tie;

      // A filled disc with the initial inside — the bead-plate convention, and
      // far easier to scan than a column of bare letters.
      this.discs
        .circle(row.value.x, row.value.y, this.discRadius)
        .fill({ color, alpha: 0.95 })
        .circle(row.value.x, row.value.y, this.discRadius)
        .stroke({ width: 1.5, color: shade(color, 0.45), alpha: 0.9 });

      row.value.text = (isPlayer ? strings.player : isBanker ? strings.banker : strings.tie)
        .slice(0, 1)
        .toUpperCase();
      row.value.tint = 0xffffff;

      row.pairMark.clear();
      if (entry.playerPair) row.pairMark.circle(-4, 0, 3.5).fill(theme.player);
      if (entry.bankerPair) row.pairMark.circle(4, 0, 3.5).fill(theme.banker);
    });

    if (!animate) return;
    const latest = this.rows[Math.min(visible.length, this.capacity) - 1];
    if (!latest) return;
    this.ctx.animation.killTweensOf(latest.value.scale);
    const base = latest.value.scale.x;
    this.ctx.animation.fromTo(
      latest.value.scale,
      { x: base * 2, y: base * 2 },
      { x: base, y: base, duration: 0.32, ease: Ease.uiIn },
    );
  }

  /* ---------------------------------------------------------------- *
   * Visibility
   * ---------------------------------------------------------------- */

  toggle(): boolean {
    this.setOpen(!this.open);
    return this.open;
  }

  setOpen(open: boolean): void {
    if (this.open === open) return;
    this.open = open;
    this.ctx.animation.killTweensOf(this);
    this.ctx.animation.killTweensOf(this.scale);

    if (open) {
      this.visible = true;
      this.ctx.animation.to(this, { alpha: 1, duration: 0.2 });
      this.ctx.animation.fromTo(
        this.scale,
        { x: 0.9, y: 0.9 },
        { x: 1, y: 1, duration: 0.3, ease: Ease.uiIn },
      );
    } else {
      this.ctx.animation.to(this, {
        alpha: 0,
        duration: 0.2,
        onComplete: () => {
          this.visible = false;
        },
      });
    }
  }

  override destroy(): void {
    this.ctx.animation.killTweensOf(this);
    this.ctx.animation.killTweensOf(this.scale);
    for (const row of this.rows) this.ctx.animation.killTweensOf(row.value.scale);
    this.rows.length = 0;
    super.destroy({ children: true });
  }
}
