import { Container, Sprite } from "pixi.js";

import { CHIP_SIZE } from "../Constants";
import type { Poolable } from "../core/ObjectPool";
import type { GameContext } from "../GameContext";
import { Ease } from "../managers/AnimationManager";

/**
 * A single betting chip.
 *
 * Pooled like cards. A whole table of stacked bets is a few dozen of these, all
 * drawing from one chip atlas page, so a busy layout costs one draw call.
 */
export class Chip extends Container implements Poolable {
  private readonly ctx: GameContext;
  private readonly disc: Sprite;
  private readonly shadow: Sprite;
  private value = 0;

  constructor(ctx: GameContext) {
    super();
    this.ctx = ctx;

    this.shadow = new Sprite(ctx.assets.get("fx_glow"));
    this.shadow.anchor.set(0.5);
    this.shadow.tint = 0x000000;
    this.shadow.alpha = 0.32;
    this.shadow.width = CHIP_SIZE * 1.05;
    this.shadow.height = CHIP_SIZE * 0.5;
    this.shadow.y = CHIP_SIZE * 0.18;

    this.disc = new Sprite(ctx.assets.get(`chip_${ctx.config.chips[0]?.value ?? 100}`));
    this.disc.anchor.set(0.5);

    this.addChild(this.shadow, this.disc);
  }

  get chipValue(): number {
    return this.value;
  }

  static get size(): number {
    return CHIP_SIZE;
  }

  /**
   * Assigns a denomination. Falls back to the largest chip that is not larger
   * than the requested value, so an odd stake still renders with real chips.
   */
  setValue(value: number): void {
    this.value = value;
    const chips = this.ctx.config.chips;
    let chosen = chips[0]?.value ?? value;
    for (const chip of chips) {
      if (chip.value <= value) chosen = chip.value;
    }
    const texture = this.ctx.assets.find(`chip_${value}`) ?? this.ctx.assets.get(`chip_${chosen}`);
    this.disc.texture = texture;
  }

  /** Re-resolves textures after an atlas rebuild. */
  refreshTextures(): void {
    this.shadow.texture = this.ctx.assets.get("fx_glow");
    if (this.value > 0) this.setValue(this.value);
  }

  /** Bounce used when a chip lands on a spot. */
  land(delay = 0): void {
    this.scale.set(0.6);
    this.alpha = 0;
    this.ctx.animation.to(this, {
      alpha: 1,
      duration: 0.12,
      delay,
      ease: Ease.linear,
    });
    this.ctx.animation.to(this.scale, {
      x: 1,
      y: 1,
      duration: 0.32,
      delay,
      ease: Ease.chip,
    });
  }

  /** Pulses on a win, before the payout counter runs. */
  pulse(delay = 0): void {
    this.ctx.animation.to(this.scale, {
      x: 1.18,
      y: 1.18,
      duration: 0.18,
      delay,
      ease: Ease.glow,
      yoyo: true,
      repeat: 1,
    });
  }

  onAcquire(): void {
    this.visible = true;
    this.alpha = 1;
    this.scale.set(1);
    this.rotation = 0;
  }

  onRelease(): void {
    // See `Card.onRelease` — the owning scene may already have destroyed this.
    if (this.destroyed) return;

    this.ctx.animation.killTweensOf(this);
    this.ctx.animation.killTweensOf(this.scale);
    this.removeFromParent();
    this.position.set(0, 0);
    this.rotation = 0;
    this.alpha = 1;
    this.scale.set(1);
    this.visible = false;
    this.value = 0;
  }

  override destroy(): void {
    this.ctx.animation.killTweensOf(this);
    this.ctx.animation.killTweensOf(this.scale);
    super.destroy({ children: true });
  }
}
