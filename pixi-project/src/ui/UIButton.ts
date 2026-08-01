import { Graphics, Text, TextStyle } from "pixi.js";
import {
  ResponsiveContainer,
  syncTextResolution,
} from "../core/ResponsiveContainer";
import type { LayoutContext } from "../core/LayoutManager";
import { Rect, clamp } from "../core/geom";
import { THEME } from "../config/LayoutConfig";

export interface UIButtonOptions {
  label: string;
  /** Stable identifier, exposed to the automated layout test sweep. */
  id?: string;
  /** Optional self-positioning rule. Omit to let a parent panel place it. */
  region?: (ctx: LayoutContext) => Rect;
  fill?: number;
  labelColor?: number;
  fontSize?: number;
  onPress?: () => void;
  toggle?: boolean;
}

/**
 * Pointer/touch/keyboard friendly button.
 *
 * The visual box is redrawn from the rect assigned during layout, and the hit
 * area is regenerated with it — so input never drifts from the artwork after a
 * resize or rotation, and stays at least `minTouch` px on touch devices.
 */
export class UIButton extends ResponsiveContainer {
  private readonly bg = new Graphics();
  private readonly labelText: Text;
  private rect = new Rect(0, 0, 100, 40);
  private pressed = false;
  private hovered = false;
  private selected = false;
  private enabled = true;

  constructor(private readonly options: UIButtonOptions) {
    super();
    this.addChild(this.bg);

    this.labelText = new Text({
      text: options.label,
      style: new TextStyle({
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: 20,
        fontWeight: "bold",
        fill: options.labelColor ?? THEME.text,
        align: "center",
      }),
    });
    this.labelText.anchor.set(0.5);
    this.addChild(this.labelText);

    this.eventMode = "static";
    this.cursor = "pointer";
    this.accessible = true;
    this.accessibleTitle = options.label;
    if (options.id) this.label = `probe:${options.id}`;

    this.on("pointerdown", this.handleDown, this);
    this.on("pointerup", this.handleUp, this);
    this.on("pointerupoutside", this.handleCancel, this);
    this.on("pointerover", () => this.setHover(true));
    this.on("pointerout", () => this.setHover(false));
  }

  get isSelected(): boolean {
    return this.selected;
  }

  setLabel(value: string): void {
    if (this.labelText.text !== value) this.labelText.text = value;
  }

  setSelected(value: boolean): void {
    if (this.selected === value) return;
    this.selected = value;
    this.redraw();
  }

  setEnabled(value: boolean): void {
    if (this.enabled === value) return;
    this.enabled = value;
    this.eventMode = value ? "static" : "none";
    this.cursor = value ? "pointer" : "default";
    this.alpha = value ? 1 : 0.45;
    this.redraw();
  }

  /** Called by a parent panel that owns this button's slot. */
  setRect(rect: Rect, ctx: LayoutContext): void {
    this.rect = rect;
    this.position.set(rect.centerX, rect.centerY);
    this.applyMetrics(ctx);
  }

  protected onLayout(ctx: LayoutContext): void {
    if (this.options.region) {
      this.setRect(this.options.region(ctx), ctx);
    } else {
      this.applyMetrics(ctx);
    }
  }

  private applyMetrics(ctx: LayoutContext): void {
    const size = this.options.fontSize ?? 18;
    // Shrink the label rather than let it spill out of a narrow button.
    const maxByWidth =
      (this.rect.width * 0.9) / Math.max(1, this.labelText.text.length * 0.58);
    this.labelText.style.fontSize = clamp(
      Math.min(ctx.font(size, 11, 34), maxByWidth, this.rect.height * 0.5),
      10,
      36,
    );
    syncTextResolution(this.labelText, ctx);
    this.setHitArea(this.rect.width, this.rect.height, ctx);
    this.redraw();
  }

  private redraw(): void {
    const { width, height } = this.rect;
    const radius = Math.min(THEME.radius, height / 2);
    const base = this.options.fill ?? THEME.panelFillAlt;
    const tint = this.selected ? THEME.accent : base;
    const brightness = this.pressed ? 0.82 : this.hovered ? 1.12 : 1;

    this.bg
      .clear()
      .roundRect(-width / 2, -height / 2, width, height, radius)
      .fill({ color: shade(tint, brightness) })
      .stroke({
        width: this.selected ? 3 : 1.5,
        color: this.selected ? THEME.accent : THEME.panelStroke,
        alpha: 0.9,
      });

    this.labelText.style.fill = this.selected
      ? 0x1b1405
      : (this.options.labelColor ?? THEME.text);
  }

  private setHover(value: boolean): void {
    if (this.hovered === value) return;
    this.hovered = value;
    this.redraw();
  }

  private handleDown(): void {
    this.pressed = true;
    this.redraw();
  }

  private handleUp(): void {
    if (!this.pressed) return;
    this.pressed = false;
    if (this.options.toggle) this.setSelected(!this.selected);
    this.redraw();
    this.options.onPress?.();
  }

  private handleCancel(): void {
    this.pressed = false;
    this.redraw();
  }
}

function shade(color: number, factor: number): number {
  if (factor === 1) return color;
  const r = clamp(Math.round(((color >> 16) & 0xff) * factor), 0, 255);
  const g = clamp(Math.round(((color >> 8) & 0xff) * factor), 0, 255);
  const b = clamp(Math.round((color & 0xff) * factor), 0, 255);
  return (r << 16) | (g << 8) | b;
}
