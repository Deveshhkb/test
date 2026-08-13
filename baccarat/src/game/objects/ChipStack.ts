import { BitmapText, Container, Graphics } from "pixi.js";

import { Fonts, Palette } from "../Constants";
import type { ObjectPool } from "../core/ObjectPool";
import type { GameContext } from "../GameContext";
import { Ease } from "../managers/AnimationManager";
import { Sfx } from "../managers/AudioManager";
import { formatCompact } from "../utils/Helpers";
import { type Chip } from "./Chip";

/**
 * The pile of chips sitting on one betting spot, plus its running total.
 *
 * Chips are decomposed into real denominations (a 260,000 stake shows as
 * 250K + 10K, not 26 anonymous discs) and scattered inside a small radius so a
 * stack looks hand-placed rather than gridded. Above a configurable count the
 * stack stops adding sprites and lets the total label do the talking — that cap
 * is what keeps a whale's bet from costing 400 sprites.
 */
export class ChipStack extends Container {
  private readonly ctx: GameContext;
  private readonly pool: ObjectPool<Chip>;
  private readonly chipLayer = new Container();
  private readonly badge: Graphics;
  private readonly totalText: BitmapText;

  private readonly chips: Chip[] = [];
  private total = 0;

  constructor(ctx: GameContext, pool: ObjectPool<Chip>) {
    super();
    this.ctx = ctx;
    this.pool = pool;

    this.addChild(this.chipLayer);

    this.badge = new Graphics();
    this.totalText = new BitmapText({
      text: "",
      style: { fontFamily: Fonts.Numeric, fontSize: 30 },
    });
    this.totalText.anchor.set(0.5);
    this.totalText.tint = Palette.goldBright;

    this.addChild(this.badge, this.totalText);
    this.setTotal(0, false);
  }

  get amount(): number {
    return this.total;
  }

  /** Shrinks the pile so it sits inside a short betting band. */
  setChipScale(scale: number): void {
    this.chipLayer.scale.set(scale);
  }

  /* ---------------------------------------------------------------- *
   * Placement
   * ---------------------------------------------------------------- */

  /**
   * Flies `amount` worth of chips in from `fromGlobal` and adds them to the
   * pile. Resolves once the last chip lands.
   */
  add(amount: number, fromGlobal: { x: number; y: number }): void {
    if (amount <= 0) return;
    this.setTotal(this.total + amount, true);

    const denominations = this.decompose(amount);
    const config = this.ctx.config.table;
    const local = this.chipLayer.toLocal(fromGlobal);

    denominations.forEach((value, index) => {
      if (this.chips.length >= config.maxVisibleChipsPerSpot) return;

      const chip = this.pool.acquire();
      chip.setValue(value);
      chip.position.set(local.x, local.y);
      this.chipLayer.addChild(chip);
      this.chips.push(chip);

      const target = this.slotFor(this.chips.length - 1);
      const delay = index * this.ctx.config.animation.chipSettleStagger;

      this.ctx.animation.to(chip, {
        x: target.x,
        y: target.y,
        rotation: target.rotation,
        duration: this.ctx.config.animation.chipFlyDuration,
        delay,
        ease: Ease.chip,
        onComplete: () => {
          this.ctx.audio.play(this.chips.length > 3 ? Sfx.ChipStack : Sfx.ChipPlace, {
            volume: 0.7,
          });
        },
      });
    });

    this.reorderBadge();
  }

  /** Position of the n-th chip in the pile, in local space. */
  private slotFor(index: number): { x: number; y: number; rotation: number } {
    const { chipScatterRadius, chipStackOffsetY } = this.ctx.config.table;
    // Deterministic pseudo-scatter: same index always lands in the same spot,
    // so re-laying out on resize does not reshuffle the pile.
    const angle = index * 2.399963; // golden angle keeps the spread even
    const radius = chipScatterRadius * Math.sqrt((index % 5) / 5);
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.42 + index * chipStackOffsetY,
      rotation: (index % 3) * 0.06 - 0.06,
    };
  }

  /** Greedy denomination split, largest chips first. */
  private decompose(amount: number): number[] {
    const values = this.ctx.config.chips.map((chip) => chip.value).sort((a, b) => b - a);
    const out: number[] = [];
    let remaining = amount;
    for (const value of values) {
      while (remaining >= value && out.length < this.ctx.config.table.maxVisibleChipsPerSpot) {
        out.push(value);
        remaining -= value;
      }
    }
    if (out.length === 0 && amount > 0) out.push(values.at(-1) ?? amount);
    return out;
  }

  /* ---------------------------------------------------------------- *
   * Total badge
   * ---------------------------------------------------------------- */

  setTotal(amount: number, animate: boolean): void {
    this.total = Math.max(0, amount);
    this.totalText.text = this.total > 0 ? formatCompact(this.total) : "";
    this.totalText.visible = this.total > 0;

    this.badge.clear();
    if (this.total > 0) {
      const width = this.totalText.width + 26;
      this.badge
        .roundRect(-width / 2, -17, width, 34, 17)
        .fill({ color: 0x000000, alpha: 0.62 })
        .roundRect(-width / 2, -17, width, 34, 17)
        .stroke({ width: 1.5, color: Palette.gold, alpha: 0.8 });
    }

    if (animate && this.total > 0) {
      this.ctx.animation.killTweensOf(this.totalText.scale);
      this.ctx.animation.fromTo(
        this.totalText.scale,
        { x: 1.35, y: 1.35 },
        { x: 1, y: 1, duration: 0.28, ease: Ease.uiIn },
      );
    }
  }

  private reorderBadge(): void {
    // The badge must stay readable above the pile.
    this.setChildIndex(this.badge, this.children.length - 2);
    this.setChildIndex(this.totalText, this.children.length - 1);
  }

  /** Lifts the badge above the chips by a fixed offset in local space. */
  setBadgeOffset(y: number): void {
    this.badge.y = y;
    this.totalText.y = y;
  }

  /* ---------------------------------------------------------------- *
   * Resolution
   * ---------------------------------------------------------------- */

  /** Winning stack: chips flash, then fly back to the player. */
  collect(toGlobal: { x: number; y: number }, onDone?: () => void): void {
    const local = this.chipLayer.toLocal(toGlobal);
    const chips = this.chips.splice(0);

    if (chips.length === 0) {
      this.setTotal(0, false);
      onDone?.();
      return;
    }

    this.ctx.audio.play(Sfx.ChipCollect);
    chips.forEach((chip, index) => {
      chip.pulse(index * 0.02);
      this.ctx.animation.to(chip, {
        x: local.x,
        y: local.y,
        alpha: 0,
        duration: 0.42,
        delay: 0.24 + index * 0.03,
        ease: "power2.in",
        onComplete: () => this.pool.release(chip),
      });
    });

    this.ctx.animation.to(this.totalText, {
      alpha: 0,
      duration: 0.3,
      delay: 0.3,
      onComplete: () => {
        this.setTotal(0, false);
        this.totalText.alpha = 1;
        this.badge.clear();
        onDone?.();
      },
    });
  }

  /** Losing stack: chips slide off toward the house and fade. */
  sweep(toGlobal: { x: number; y: number }, onDone?: () => void): void {
    const local = this.chipLayer.toLocal(toGlobal);
    const chips = this.chips.splice(0);

    if (chips.length === 0) {
      this.setTotal(0, false);
      onDone?.();
      return;
    }

    this.ctx.audio.play(Sfx.ChipClear, { volume: 0.7 });
    chips.forEach((chip, index) => {
      this.ctx.animation.to(chip, {
        x: local.x,
        y: local.y,
        rotation: chip.rotation + 0.6,
        alpha: 0,
        duration: this.ctx.config.animation.clearDuration,
        delay: index * 0.025,
        ease: "power2.in",
        onComplete: () => this.pool.release(chip),
      });
    });

    this.ctx.animation.to(this.totalText, {
      alpha: 0,
      duration: 0.24,
      onComplete: () => {
        this.setTotal(0, false);
        this.totalText.alpha = 1;
      },
    });
  }

  /** Instant removal — used by clear-bets and teardown. */
  clear(animate = true): void {
    const chips = this.chips.splice(0);
    for (const chip of chips) {
      if (animate) {
        this.ctx.animation.to(chip, {
          alpha: 0,
          duration: 0.2,
          onComplete: () => this.pool.release(chip),
        });
      } else {
        this.pool.release(chip);
      }
    }
    this.setTotal(0, false);
  }

  override destroy(): void {
    this.clear(false);
    this.ctx.animation.killTweensOf(this.totalText);
    super.destroy({ children: true });
  }
}
