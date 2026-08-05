import { Container, Graphics, Sprite } from "pixi.js";

import { CHIP_SIZE, Palette } from "../Constants";
import type { GameContext } from "../GameContext";
import { Ease } from "../managers/AnimationManager";
import { Sfx } from "../managers/AudioManager";

interface TrayChip {
  readonly root: Container;
  readonly sprite: Sprite;
  readonly ring: Graphics;
  readonly value: number;
  detach: (() => void) | null;
}

/**
 * The denomination selector.
 *
 * The selected chip lifts out of the tray and keeps a gold ring, so the answer
 * to "what am I about to bet?" is readable at a glance and from across the
 * room — which is exactly how it works on a real layout.
 */
export class ChipTray extends Container {
  private readonly ctx: GameContext;
  private readonly backdrop = new Graphics();
  private readonly chips: TrayChip[] = [];
  private selected = 0;
  private chipScale = 1;

  constructor(ctx: GameContext) {
    super();
    this.ctx = ctx;
    this.addChild(this.backdrop);
    this.build();
  }

  private build(): void {
    for (const chip of this.chips) {
      chip.detach?.();
      chip.root.destroy({ children: true });
    }
    this.chips.length = 0;

    this.ctx.config.chips.forEach((definition, index) => {
      const root = new Container();

      const ring = new Graphics()
        .circle(0, 0, CHIP_SIZE / 2 + 5)
        .stroke({ width: 3, color: Palette.goldBright });
      ring.alpha = 0;

      const sprite = new Sprite(this.ctx.assets.get(`chip_${definition.value}`));
      sprite.anchor.set(0.5);

      root.addChild(ring, sprite);
      this.addChild(root);

      const entry: TrayChip = { root, sprite, ring, value: definition.value, detach: null };
      entry.detach = this.ctx.input.makeInteractive(root, {
        sound: false,
        onTap: () => {
          this.ctx.bets.selectChip(index);
          this.ctx.audio.play(Sfx.ChipPlace, { volume: 0.5 });
        },
        onHover: (hovering) => {
          if (index === this.selected) return;
          this.ctx.animation.to(root, {
            y: hovering ? this.restY - 8 : this.restY,
            duration: 0.18,
            ease: Ease.uiOut,
          });
        },
      });

      this.chips.push(entry);
    });

    this.applySelection(this.selected, false);
  }

  private get restY(): number {
    return 0;
  }

  /** Fits the tray into a width, shrinking chips before it wraps. */
  resizeTo(width: number, height: number): void {
    const count = this.chips.length;
    if (count === 0) return;

    const gap = 10;
    const available = width - gap * (count + 1);
    this.chipScale = Math.min(1, Math.max(0.42, available / (count * CHIP_SIZE)));

    const size = CHIP_SIZE * this.chipScale;
    const step = size + gap;
    const totalWidth = step * count - gap;
    const startX = -totalWidth / 2 + size / 2;

    this.chips.forEach((chip, index) => {
      chip.root.scale.set(this.chipScale);
      chip.root.position.set(startX + index * step, index === this.selected ? -10 : 0);
    });

    this.backdrop
      .clear()
      .roundRect(-width / 2, -height / 2, width, height, height / 2)
      .fill({ color: 0x04120c, alpha: 0.66 })
      .roundRect(-width / 2, -height / 2, width, height, height / 2)
      .stroke({ width: 1.5, color: Palette.gold, alpha: 0.3 });
  }

  /** Reflects the manager's selection (which may change from a shortcut key). */
  setSelected(index: number): void {
    if (index === this.selected) return;
    this.applySelection(index, true);
  }

  private applySelection(index: number, animate: boolean): void {
    const clamped = Math.max(0, Math.min(index, this.chips.length - 1));
    this.selected = clamped;

    this.chips.forEach((chip, i) => {
      const isSelected = i === clamped;
      const targetY = isSelected ? -10 : 0;
      const targetScale = this.chipScale * (isSelected ? 1.12 : 1);

      if (animate) {
        this.ctx.animation.to(chip.root, { y: targetY, duration: 0.22, ease: Ease.uiIn });
        this.ctx.animation.to(chip.root.scale, {
          x: targetScale,
          y: targetScale,
          duration: 0.22,
          ease: Ease.uiIn,
        });
        this.ctx.animation.to(chip.ring, { alpha: isSelected ? 1 : 0, duration: 0.2 });
      } else {
        chip.root.y = targetY;
        chip.root.scale.set(targetScale);
        chip.ring.alpha = isSelected ? 1 : 0;
      }
    });
  }

  /** Stage-space origin for a chip flying to the layout. */
  originGlobal(): { x: number; y: number } {
    const chip = this.chips[this.selected];
    const point = (chip?.root ?? this).toGlobal({ x: 0, y: 0 });
    return { x: point.x, y: point.y };
  }

  /** Rebuilds after the chip ladder changes in config. */
  refresh(): void {
    this.build();
  }

  setEnabled(enabled: boolean): void {
    this.alpha = enabled ? 1 : 0.55;
    for (const chip of this.chips) chip.root.eventMode = enabled ? "static" : "none";
  }

  override destroy(): void {
    for (const chip of this.chips) {
      chip.detach?.();
      this.ctx.animation.killTweensOf(chip.root);
      this.ctx.animation.killTweensOf(chip.root.scale);
    }
    this.chips.length = 0;
    super.destroy({ children: true });
  }
}
