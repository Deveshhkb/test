import { Graphics, type Texture } from "pixi.js";
import { ResponsiveContainer } from "../core/ResponsiveContainer";
import type { LayoutContext } from "../core/LayoutManager";
import { Rect, clamp } from "../core/geom";
import { THEME } from "../config/LayoutConfig";
import { CHIP_SELECTED_SCALE, ChipButton } from "./ChipButton";
import { UIButton } from "./UIButton";
import { CHIPS, type Chip, type GameState } from "../state/GameState";

/**
 * Chip selector plus round actions.
 *
 * The panel has no fixed orientation: it reads the rectangle the LayoutManager
 * assigned to it and picks the arrangement that maximises control size, so the
 * exact same component works docked to the right on desktop and stretched
 * across the bottom in mobile portrait.
 */
export class BetPanel extends ResponsiveContainer {
  private readonly bg = new Graphics();
  private readonly chips: ChipButton[] = [];
  private readonly actions: UIButton[] = [];

  constructor(
    private readonly state: GameState,
    textures: Record<string, Texture>,
  ) {
    super();
    this.layoutOrder = 10;
    this.addChild(this.bg);

    for (const chip of CHIPS) {
      const button = new ChipButton(chip, textures[chip.texture], (c) =>
        this.selectChip(c),
      );
      this.chips.push(button);
      this.addChild(button);
    }

    this.actions.push(
      new UIButton({
        id: "action.clear",
        label: "Clear",
        onPress: () => state.clearBets(),
        fill: 0x3a2030,
      }),
      new UIButton({
        id: "action.x2",
        label: "x2",
        onPress: () => state.doubleBets(),
        fill: 0x1f3350,
      }),
      new UIButton({
        id: "action.repeat",
        label: "Repeat",
        onPress: () => state.repeatBets(),
        fill: 0x1f3350,
      }),
    );
    this.addChild(...this.actions);

    state.subscribe(() => this.syncSelection());
    this.syncSelection();
  }

  protected onLayout(ctx: LayoutContext): void {
    const region = ctx.regions.bet;
    const pad = Math.max(6, ctx.regions.gutter);

    this.bg
      .clear()
      .roundRect(region.x, region.y, region.width, region.height, THEME.radius)
      .fill({ color: THEME.panelFill, alpha: 0.9 })
      .stroke({ width: 1.5, color: THEME.panelStroke, alpha: 0.85 });

    const inner = region.inset(pad);

    // Decide the action arrangement first, then reserve exactly the height it
    // needs. Reserving a fixed fraction instead is what lets buttons pile on
    // top of each other when a narrow panel forces them into a column.
    const plan = planActions(this.actions.length, inner, ctx, pad);
    const actionRect = inner.carveBottom(plan.height + pad);
    actionRect.carveTop(pad);

    this.layoutChips(inner, ctx);
    this.layoutActions(actionRect, ctx, pad, plan);
  }

  private layoutChips(area: Rect, ctx: LayoutContext): void {
    const grid = bestGrid(this.chips.length, area.width, area.height);
    const cellW = area.width / grid.cols;
    const cellH = area.height / grid.rows;
    // Chips are round, so keep the slot square; the divisor leaves room for the
    // selected chip to scale up without touching its neighbours.
    const slot = (Math.min(cellW, cellH) * 0.92) / CHIP_SELECTED_SCALE;
    const pitch = Math.min(cellW, cellH);

    const originX = area.centerX - (grid.cols * cellW) / 2;
    const originY = area.centerY - (grid.rows * cellH) / 2;

    this.chips.forEach((chipButton, index) => {
      const row = Math.floor(index / grid.cols);
      const col = index % grid.cols;
      // Centre the final, possibly shorter, row.
      const itemsInRow = Math.min(
        grid.cols,
        this.chips.length - row * grid.cols,
      );
      const rowOffset = ((grid.cols - itemsInRow) * cellW) / 2;
      const cx = originX + rowOffset + col * cellW + cellW / 2;
      const cy = originY + row * cellH + cellH / 2;
      chipButton.setRect(
        new Rect(cx - slot / 2, cy - slot / 2, slot, slot),
        ctx,
        pitch,
      );
    });
  }

  private layoutActions(
    area: Rect,
    ctx: LayoutContext,
    pad: number,
    plan: ActionPlan,
  ): void {
    const cellW = (area.width - pad * (plan.perRow - 1)) / plan.perRow;

    this.actions.forEach((button, index) => {
      const row = Math.floor(index / plan.perRow);
      const col = index % plan.perRow;
      const itemsInRow = Math.min(
        plan.perRow,
        this.actions.length - row * plan.perRow,
      );
      const rowOffset = ((plan.perRow - itemsInRow) * (cellW + pad)) / 2;
      button.setRect(
        new Rect(
          area.x + rowOffset + col * (cellW + pad),
          area.y + row * (plan.buttonHeight + pad),
          cellW,
          plan.buttonHeight,
        ),
        ctx,
      );
    });
  }

  private selectChip(chip: Chip): void {
    this.state.selectChip(chip);
  }

  private syncSelection(): void {
    for (const button of this.chips) {
      button.setSelected(button.chip.value === this.state.selectedChip.value);
    }
    this.actions[0].setEnabled(this.state.totalBet > 0);
    this.actions[1].setEnabled(
      this.state.totalBet > 0 && this.state.totalBet <= this.state.balance,
    );
  }
}

interface ActionPlan {
  perRow: number;
  rows: number;
  buttonHeight: number;
  /** Total height the action strip needs, including inter-row padding. */
  height: number;
}

/**
 * Work out how many action buttons fit per row at a comfortable touch size,
 * and how much vertical space that arrangement actually needs.
 */
function planActions(
  count: number,
  area: Rect,
  ctx: LayoutContext,
  pad: number,
): ActionPlan {
  const minWidth = Math.max(ctx.minTouch, 54);
  const perRow = clamp(
    Math.floor((area.width + pad) / (minWidth + pad)),
    1,
    count,
  );
  const rows = Math.ceil(count / perRow);
  // Never let the strip eat more than half the panel: chips need room too.
  const budget = (area.height - pad * (rows - 1)) / rows;
  const buttonHeight = clamp(
    Math.min(area.height * 0.16, 56),
    Math.min(ctx.minTouch, budget),
    Math.max(ctx.minTouch, Math.min(budget, area.height / 2)),
  );
  return {
    perRow,
    rows,
    buttonHeight,
    height: rows * buttonHeight + (rows - 1) * pad,
  };
}

/**
 * Choose the row/column split that yields the largest square cell for `count`
 * items inside a `w x h` box. Replaces hardcoded per-breakpoint arrangements.
 */
export function bestGrid(
  count: number,
  w: number,
  h: number,
): { cols: number; rows: number; size: number } {
  let best = { cols: count, rows: 1, size: 0 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const size = Math.min(w / cols, h / rows);
    if (size > best.size) best = { cols, rows, size };
  }
  return best;
}
