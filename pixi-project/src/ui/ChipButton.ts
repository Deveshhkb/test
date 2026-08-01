import { Graphics, Sprite, Text, TextStyle, type Texture } from "pixi.js";
import {
  ResponsiveContainer,
  syncTextResolution,
} from "../core/ResponsiveContainer";
import type { LayoutContext } from "../core/LayoutManager";
import { Rect } from "../core/geom";
import { THEME } from "../config/LayoutConfig";
import type { Chip } from "../state/GameState";

/**
 * A betting chip. Sized from the slot the panel gives it, so the same chip is
 * a 34px token on a 320px phone and a 90px token on a 1440p desktop without
 * any per-breakpoint code.
 */
/** Extra scale applied to the selected chip; slots reserve room for it. */
export const CHIP_SELECTED_SCALE = 1.1;

export class ChipButton extends ResponsiveContainer {
  private readonly ring = new Graphics();
  private readonly sprite: Sprite;
  private readonly valueLabel: Text;
  private size = 64;
  private pitch = Infinity;
  private selected = false;

  constructor(
    readonly chip: Chip,
    texture: Texture,
    onPress: (chip: Chip) => void,
  ) {
    super();

    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.addChild(this.sprite);

    // Above the artwork: the selection ring hugs the chip's rim, which keeps
    // it inside the slot the panel reserved instead of bleeding outwards.
    this.addChild(this.ring);

    this.valueLabel = new Text({
      text: chip.label,
      style: new TextStyle({
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: 20,
        fontWeight: "bold",
        fill: THEME.text,
        stroke: { color: 0x000000, width: 4 },
      }),
    });
    this.valueLabel.anchor.set(0.5);
    this.addChild(this.valueLabel);

    this.eventMode = "static";
    this.cursor = "pointer";
    this.accessible = true;
    this.accessibleTitle = `Chip ${chip.label}`;
    this.label = `probe:chip.${chip.label}`;
    this.on("pointertap", () => onPress(chip));
  }

  get isSelected(): boolean {
    return this.selected;
  }

  setSelected(value: boolean): void {
    if (this.selected === value) return;
    this.selected = value;
    this.redraw();
  }

  /**
   * Slot assigned by the owning panel. `pitch` is the distance to the next
   * slot; the hit area is capped by it so adjacent chips never steal taps.
   */
  setRect(rect: Rect, ctx: LayoutContext, pitch = Infinity): void {
    this.position.set(rect.centerX, rect.centerY);
    this.size = Math.min(rect.width, rect.height);
    this.pitch = pitch;
    this.applyMetrics(ctx);
  }

  protected onLayout(ctx: LayoutContext): void {
    this.applyMetrics(ctx);
  }

  private applyMetrics(ctx: LayoutContext): void {
    const texture = this.sprite.texture;
    this.sprite.scale.set(this.size / Math.max(texture.width, texture.height));
    this.valueLabel.style.fontSize = Math.max(9, this.size * 0.26);
    this.valueLabel.style.stroke = {
      color: 0x000000,
      width: Math.max(2, this.size * 0.045),
    };
    syncTextResolution(this.valueLabel, ctx);
    this.setHitArea(this.size, this.size, ctx, {
      maxWidth: this.pitch,
      maxHeight: this.pitch,
    });
    this.redraw();
  }

  private redraw(): void {
    this.ring.clear();
    this.scale.set(this.selected ? CHIP_SELECTED_SCALE : 1);
    if (!this.selected) return;
    // Drawn inside the token: the selected chip is already scaled up, so an
    // outset ring would push it into the neighbouring slot.
    this.ring.circle(0, 0, this.size * 0.46).stroke({
      width: Math.max(2, this.size * 0.055),
      color: THEME.accent,
      alpha: 0.95,
    });
  }
}
