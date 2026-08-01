import { Container, Graphics, Rectangle, Text, TextStyle } from "pixi.js";
import {
  ResponsiveContainer,
  syncTextResolution,
} from "../core/ResponsiveContainer";
import type { LayoutContext } from "../core/LayoutManager";
import { Rect, clamp } from "../core/geom";
import { THEME } from "../config/LayoutConfig";
import { UIButton } from "./UIButton";
import type { GameState, RoundResult } from "../state/GameState";

const BADGE_STYLE: Record<RoundResult, { color: number; letter: string }> = {
  dragon: { color: THEME.dragon, letter: "D" },
  tie: { color: THEME.tie, letter: "T" },
  tiger: { color: THEME.tiger, letter: "G" },
};

/**
 * Round history.
 *
 * Docked as a left column when there is horizontal room. On phones and portrait
 * tablets it collapses: it shows a compact "peek" strip in the space the 16:9
 * board cannot use, and tapping it (or the top bar button) expands the full
 * list as a dismissible drawer with a scrim.
 */
export class HistoryPanel extends ResponsiveContainer {
  private readonly scrim = new Graphics();
  private readonly bg = new Graphics();
  private readonly title: Text;
  private readonly badgeLayer = new Container();
  private readonly closeButton: UIButton;
  private open = false;
  private collapsible = false;

  constructor(private readonly state: GameState) {
    super();
    this.layoutOrder = 20;

    this.scrim.eventMode = "static";
    this.scrim.on("pointertap", () => this.setOpen(false));
    this.bg.on("pointertap", () => this.setOpen(true));
    this.addChild(this.scrim, this.bg, this.badgeLayer);

    this.title = new Text({
      text: "History",
      style: new TextStyle({
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: 18,
        fontWeight: "bold",
        fill: THEME.textDim,
      }),
    });
    this.title.anchor.set(0, 0.5);
    this.addChild(this.title);

    this.closeButton = new UIButton({
      label: "✕",
      onPress: () => this.setOpen(false),
    });
    this.addChild(this.closeButton);

    state.subscribe(() => this.refreshLayout());
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(): void {
    this.setOpen(!this.open);
  }

  setOpen(value: boolean): void {
    if (this.open === value) return;
    this.open = value;
    this.refreshLayout();
  }

  protected onLayout(ctx: LayoutContext): void {
    this.collapsible = ctx.regions.historyCollapsible;
    const peek = ctx.regions.historyPeek;

    // Three states:
    //   docked   - wide layouts, always visible in its own column
    //   peek     - portrait, collapsed into the strip left over by the board
    //   expanded - drawer overlay with a scrim, on top of everything
    const expanded = this.collapsible && this.open;
    const showPeek = this.collapsible && !this.open && peek !== null;
    const region = expanded || !this.collapsible ? ctx.regions.history : peek!;

    const shown = !this.collapsible || expanded || showPeek;
    this.visible = shown;
    this.eventMode = shown ? "auto" : "none";
    if (!shown) return;

    // Drawer mode gets a scrim so taps outside close it and the board behind
    // it cannot be bet on by accident.
    this.scrim.clear();
    this.scrim.visible = expanded;
    this.scrim.eventMode = expanded ? "static" : "none";
    if (expanded) {
      this.scrim
        .rect(0, 0, ctx.width, ctx.height)
        .fill({ color: 0x000000, alpha: 0.55 });
    }

    // Collapsed, it is one big tap target that expands the full list.
    this.bg.eventMode = showPeek ? "static" : "none";
    this.bg.cursor = showPeek ? "pointer" : "default";
    this.bg.hitArea = showPeek
      ? new Rectangle(region.x, region.y, region.width, region.height)
      : null;

    this.bg
      .clear()
      .roundRect(region.x, region.y, region.width, region.height, THEME.radius)
      .fill({ color: THEME.panelFill, alpha: showPeek ? 0.75 : 0.95 })
      .stroke({ width: 1.5, color: THEME.panelStroke, alpha: 0.85 });

    const pad = Math.max(6, ctx.regions.gutter);
    const inner = region.inset(pad);
    const headerHeight = clamp(ctx.px(26), 22, 46);
    const header = inner.carveTop(headerHeight);

    this.title.style.fontSize = ctx.font(16, 11, 24);
    this.title.position.set(header.x, header.centerY);
    syncTextResolution(this.title, ctx);

    this.title.text = showPeek ? "Recent" : "History";

    this.closeButton.visible = expanded;
    if (expanded) {
      const size = Math.max(ctx.minTouch, headerHeight);
      this.closeButton.setRect(
        new Rect(header.right - size, header.centerY - size / 2, size, size),
        ctx,
      );
    }

    inner.carveTop(pad / 2);
    this.drawBadges(inner, ctx);
  }

  private drawBadges(area: Rect, ctx: LayoutContext): void {
    this.badgeLayer
      .removeChildren()
      .forEach((child) => child.destroy({ children: true }));
    if (area.width <= 0 || area.height <= 0) return;

    const target = clamp(ctx.px(34), 22, 54);
    let gap = Math.max(3, target * 0.14);
    let cols = Math.max(1, Math.floor((area.width + gap) / (target + gap)));
    let cell = (area.width - gap * (cols - 1)) / cols;
    const rows = Math.max(1, Math.floor((area.height + gap) / (cell + gap)));
    const capacity = cols * rows;

    const items = this.state.history.slice(0, capacity);

    // Fewer results than the area can hold (the portrait peek dock, mostly):
    // spread them out at a larger size instead of leaving the panel half empty.
    if (items.length > 0 && items.length < capacity) {
      const spread = bestFit(items.length, area.width, area.height, target * 2);
      cols = spread.cols;
      cell = spread.cell;
      gap = Math.max(3, cell * 0.14);
    }

    const usedRows = Math.ceil(items.length / cols);
    const blockHeight = usedRows * cell + (usedRows - 1) * gap;
    const originY = area.y + Math.max(0, (area.height - blockHeight) / 2);
    const fontSize = Math.max(9, cell * 0.46);

    items.forEach((result, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const cx = area.x + col * (cell + gap) + cell / 2;
      const cy = originY + row * (cell + gap) + cell / 2;
      const meta = BADGE_STYLE[result];

      const badge = new Graphics()
        .circle(cx, cy, cell * 0.45)
        .fill({ color: meta.color, alpha: 0.95 })
        .stroke({ width: 1, color: 0x000000, alpha: 0.35 });
      this.badgeLayer.addChild(badge);

      const letter = new Text({
        text: meta.letter,
        style: new TextStyle({
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize,
          fontWeight: "bold",
          fill: 0xffffff,
        }),
      });
      letter.anchor.set(0.5);
      letter.position.set(cx, cy);
      letter.resolution = Math.min(4, ctx.resolution);
      this.badgeLayer.addChild(letter);
    });
  }
}

/**
 * Largest square cell that fits `count` items in a `w x h` box, capped so a
 * short history never turns into a handful of enormous discs.
 */
function bestFit(
  count: number,
  w: number,
  h: number,
  maxCell: number,
): { cols: number; cell: number } {
  let best = { cols: count, cell: 0 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const gap = 0.14;
    const cell = Math.min(
      w / (cols + (cols - 1) * gap),
      h / (rows + (rows - 1) * gap),
    );
    if (cell > best.cell) best = { cols, cell };
  }
  return { cols: best.cols, cell: Math.min(best.cell, maxCell) };
}
