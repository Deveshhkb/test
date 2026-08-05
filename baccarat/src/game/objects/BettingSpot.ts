import { BitmapText, Container, Graphics, Sprite } from "pixi.js";

import { Fonts, Palette } from "../Constants";
import type { ObjectPool } from "../core/ObjectPool";
import type { GameContext } from "../GameContext";
import { Ease } from "../managers/AnimationManager";
import { BetType } from "../types";
import { formatCompact, mixColor, shade } from "../utils/Helpers";
import type { Chip } from "./Chip";
import { ChipStack } from "./ChipStack";

export type SpotShape = "rect" | "left-trapezoid" | "right-trapezoid" | "hex";

export interface BettingSpotOptions {
  readonly betType: BetType;
  readonly label: string;
  readonly color: number;
  readonly shape?: SpotShape;
  /** Emphasis: main lines are drawn larger and brighter than side bets. */
  readonly primary?: boolean;
}

/**
 * One clickable wager area.
 *
 * Holds its own geometry, its own chip pile and its own visual state machine
 * (idle / hover / armed / winning / losing / locked). The table just tells it
 * how big to be; everything else it decides for itself, which is what makes
 * adding a new side bet a three-line change.
 */
export class BettingSpot extends Container {
  readonly betType: BetType;
  readonly stack: ChipStack;

  private readonly ctx: GameContext;
  private readonly options: BettingSpotOptions;
  private readonly body = new Graphics();
  private readonly glow: Sprite;
  private readonly title: BitmapText;
  private readonly payout: BitmapText;
  private readonly limits: BitmapText;

  private spotWidth = 200;
  private spotHeight = 120;
  private hovering = false;
  private locked = false;
  private detach: (() => void) | null = null;

  constructor(ctx: GameContext, options: BettingSpotOptions, chipPool: ObjectPool<Chip>) {
    super();
    this.ctx = ctx;
    this.options = options;
    this.betType = options.betType;

    this.glow = new Sprite(ctx.assets.get("fx_glow"));
    this.glow.anchor.set(0.5);
    this.glow.tint = options.color;
    this.glow.alpha = 0;
    this.glow.blendMode = "add";

    this.title = new BitmapText({
      text: options.label.toUpperCase(),
      style: { fontFamily: Fonts.Label, fontSize: options.primary ? 40 : 26 },
    });
    this.title.anchor.set(0.5);

    this.payout = new BitmapText({
      text: this.payoutLabel(),
      style: { fontFamily: Fonts.Label, fontSize: options.primary ? 26 : 20 },
    });
    this.payout.anchor.set(0.5);
    this.payout.alpha = 0.85;

    this.limits = new BitmapText({
      text: "",
      style: { fontFamily: Fonts.Numeric, fontSize: 18 },
    });
    this.limits.anchor.set(0.5);
    this.limits.alpha = 0.55;

    this.stack = new ChipStack(ctx, chipPool);

    this.addChild(this.glow, this.body, this.title, this.payout, this.limits, this.stack);
    this.bindInput();
  }

  /* ---------------------------------------------------------------- *
   * Geometry
   * ---------------------------------------------------------------- */

  /** Resizes and redraws. Called on every layout pass. */
  resizeTo(width: number, height: number): void {
    this.spotWidth = width;
    this.spotHeight = height;
    this.redraw();

    const primary = this.options.primary ?? false;
    // Labels occupy the top half; the chip pile and its total own the bottom,
    // so a staked spot never buries its own name.
    this.title.y = -height * 0.3;
    this.payout.y = -height * 0.08;
    this.limits.y = height * 0.34;
    this.glow.width = width * 1.5;
    this.glow.height = height * 1.9;
    this.stack.position.set(0, height * 0.12);
    this.stack.setBadgeOffset(height * 0.22);

    const scale = Math.min(1, width / (primary ? 260 : 170));
    this.title.scale.set(scale);
    this.payout.scale.set(scale);
    this.limits.scale.set(scale);
  }

  private redraw(): void {
    const w = this.spotWidth;
    const h = this.spotHeight;
    const color = this.options.color;
    const hasBet = this.stack.amount > 0;
    const shape = this.options.shape ?? "rect";

    const fillTop = mixColor(color, 0x000000, 0.55);
    const fillBottom = mixColor(color, 0x000000, 0.78);
    const borderColor = this.hovering || hasBet ? shade(color, 0.45) : shade(color, 0.05);
    const borderWidth = hasBet ? 4 : this.hovering ? 3.5 : 2.5;

    this.body.clear();
    this.drawShape(this.body, shape, w, h, 14);
    this.body.fill({ color: fillBottom, alpha: this.locked ? 0.55 : 0.82 });

    // Second, inset pass for the top-lit gradient band.
    this.drawShape(this.body, shape, w, h * 0.58, 14, -h * 0.21);
    this.body.fill({ color: fillTop, alpha: 0.55 });

    this.drawShape(this.body, shape, w, h, 14);
    this.body.stroke({ width: borderWidth, color: borderColor, alignment: 0.5, alpha: 0.95 });

    this.title.tint = this.locked ? 0x8b8b8b : shade(color, 0.75);
    this.payout.tint = this.locked ? 0x7a7a7a : Palette.goldBright;
  }

  private drawShape(
    g: Graphics,
    shape: SpotShape,
    w: number,
    h: number,
    radius: number,
    offsetY = 0,
  ): void {
    const hw = w / 2;
    const hh = h / 2;
    const y = offsetY;
    // The angled main-bet shapes are what give a baccarat layout its silhouette.
    const skew = Math.min(30, w * 0.11);

    switch (shape) {
      case "left-trapezoid":
        g.moveTo(-hw + skew, -hh + y)
          .lineTo(hw, -hh + y)
          .lineTo(hw, hh + y)
          .lineTo(-hw, hh + y)
          .closePath();
        break;
      case "right-trapezoid":
        g.moveTo(-hw, -hh + y)
          .lineTo(hw - skew, -hh + y)
          .lineTo(hw, hh + y)
          .lineTo(-hw, hh + y)
          .closePath();
        break;
      case "hex":
        g.moveTo(-hw + skew, -hh + y)
          .lineTo(hw - skew, -hh + y)
          .lineTo(hw, y)
          .lineTo(hw - skew, hh + y)
          .lineTo(-hw + skew, hh + y)
          .lineTo(-hw, y)
          .closePath();
        break;
      default:
        g.roundRect(-hw, -hh + y, w, h, radius);
    }
  }

  /** Where chips should fly to, in stage space. */
  chipTargetGlobal(): { x: number; y: number } {
    const point = this.stack.toGlobal({ x: 0, y: 0 });
    return { x: point.x, y: point.y };
  }

  /* ---------------------------------------------------------------- *
   * Labels
   * ---------------------------------------------------------------- */

  private payoutLabel(): string {
    const odds = this.ctx.config.payouts[this.betType];
    if (this.betType === BetType.Banker && !this.ctx.config.rules.noCommission) {
      const pct = Math.round(this.ctx.config.rules.bankerCommission * 100);
      return this.ctx.config.features.commissionDisplay ? `1 : 1  -${pct}%` : "1 : 1";
    }
    return `${odds} : 1`;
  }

  refreshLabels(): void {
    this.glow.texture = this.ctx.assets.get("fx_glow");
    this.payout.text = this.payoutLabel();
    const limit = this.ctx.config.limits[this.betType];
    this.limits.text = `${formatCompact(limit.min)} - ${formatCompact(limit.max)}`;
    this.redraw();
  }

  /** The table limits give way to the running total once a bet is placed. */
  private syncLimitsVisibility(): void {
    this.limits.visible = this.stack.amount === 0;
  }

  /* ---------------------------------------------------------------- *
   * Input & visual state
   * ---------------------------------------------------------------- */

  private bindInput(): void {
    this.detach = this.ctx.input.makeInteractive(this, {
      sound: false,
      onTap: () => {
        if (this.locked) {
          this.shake();
          return;
        }
        this.ctx.bets.place(this.betType);
      },
      onPressStart: () => {
        this.ctx.animation.to(this.scale, { x: 0.97, y: 0.97, duration: 0.08 });
      },
      onPressEnd: () => {
        this.ctx.animation.to(this.scale, { x: 1, y: 1, duration: 0.18, ease: Ease.uiIn });
      },
      onHover: (hovering) => this.setHovering(hovering),
    });
  }

  setHovering(hovering: boolean): void {
    if (this.hovering === hovering || this.locked) return;
    this.hovering = hovering;
    this.redraw();
    this.ctx.animation.to(this.glow, {
      alpha: hovering ? 0.24 : 0,
      duration: 0.2,
      ease: Ease.glow,
    });
  }

  /** Locks the spot when betting closes. */
  setLocked(locked: boolean): void {
    if (this.locked === locked) return;
    this.locked = locked;
    if (locked) this.hovering = false;
    this.cursor = locked ? "default" : "pointer";
    this.redraw();
    this.ctx.animation.to(this.glow, { alpha: 0, duration: 0.2 });
  }

  /** Reflects the current stake; called whenever `bet:changed` fires. */
  setAmount(amount: number, fromGlobal?: { x: number; y: number }): void {
    const delta = amount - this.stack.amount;
    if (delta > 0 && fromGlobal) {
      this.stack.add(delta, fromGlobal);
    } else {
      this.stack.setTotal(amount, delta !== 0);
      if (amount === 0) this.stack.clear(true);
    }
    this.syncLimitsVisibility();
    this.redraw();
  }

  /* ---------------------------------------------------------------- *
   * Result presentation
   * ---------------------------------------------------------------- */

  playWin(): void {
    this.ctx.animation.killTweensOf(this.glow);
    this.glow.tint = Palette.win;
    this.ctx.animation.fromTo(
      this.glow,
      { alpha: 0.1 },
      {
        alpha: 0.7,
        duration: this.ctx.config.animation.winGlowDuration * 0.5,
        ease: Ease.glow,
        yoyo: true,
        repeat: 3,
      },
    );
    this.ctx.animation.fromTo(
      this.scale,
      { x: 1, y: 1 },
      { x: 1.05, y: 1.05, duration: 0.24, ease: Ease.uiIn, yoyo: true, repeat: 1 },
    );
  }

  playLose(): void {
    this.ctx.animation.to(this.body, {
      alpha: 0.45,
      duration: this.ctx.config.animation.loseFadeDuration,
      ease: Ease.uiOut,
    });
  }

  resetPresentation(): void {
    this.ctx.animation.killTweensOf(this.glow);
    this.glow.tint = this.options.color;
    this.glow.alpha = 0;
    this.body.alpha = 1;
    this.scale.set(1);
    this.redraw();
  }

  private shake(): void {
    this.ctx.animation.killTweensOf(this);
    this.ctx.animation.fromTo(
      this,
      { x: this.x - 6 },
      { x: this.x, duration: 0.4, ease: "elastic.out(1.6, 0.35)" },
    );
  }

  override destroy(): void {
    this.detach?.();
    this.detach = null;
    this.ctx.animation.killTweensOf(this);
    this.ctx.animation.killTweensOf(this.glow);
    this.ctx.animation.killTweensOf(this.scale);
    super.destroy({ children: true });
  }
}
