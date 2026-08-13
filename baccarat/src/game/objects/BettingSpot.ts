import { BitmapText, Container, Graphics, Sprite } from "pixi.js";

import { CHIP_SIZE, Fonts, Palette } from "../Constants";
import type { ObjectPool } from "../core/ObjectPool";
import type { GameContext } from "../GameContext";
import { Ease } from "../managers/AnimationManager";
import { BetType } from "../types";
import type { Chip } from "./Chip";
import { ChipStack } from "./ChipStack";

export type SpotShape = "arc" | "rect" | "hex";

export interface BettingSpotOptions {
  readonly betType: BetType;
  /** Resolved from `config.strings` by the scene, so the spot stays language-free. */
  readonly label: string;
  readonly color: number;
  readonly shape?: SpotShape;
  /** Emphasis: main lines are drawn larger and brighter than side bets. */
  readonly primary?: boolean;
}

/**
 * One clickable wager area.
 *
 * Drawn as a shallow arc band, the way the felt is printed on a real baccarat
 * layout: the zones are concentric arcs curving with the table edge rather than
 * plain rectangles. Each spot owns its geometry, its chip pile and its visual
 * state machine (idle / hover / armed / winning / losing / locked); the table
 * only tells it how big to be.
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

  private spotWidth = 320;
  private spotHeight = 96;
  private bow = 14;
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
      style: { fontFamily: Fonts.Label, fontSize: 44 },
    });
    this.title.anchor.set(0.5);

    this.payout = new BitmapText({
      text: this.payoutLabel(),
      style: { fontFamily: Fonts.Numeric, fontSize: 26 },
    });
    this.payout.anchor.set(0.5);
    this.payout.alpha = 0.9;

    this.stack = new ChipStack(ctx, chipPool);

    this.label = `spot-${options.betType}`;
    this.addChild(this.glow, this.body, this.title, this.payout, this.stack);
    this.bindInput();
  }

  /* ---------------------------------------------------------------- *
   * Geometry
   * ---------------------------------------------------------------- */

  /** Resizes and redraws. `bow` is how far the arc dips at its centre. */
  resizeTo(width: number, height: number, bow = height * 0.16): void {
    this.spotWidth = width;
    this.spotHeight = height;
    this.bow = bow;
    this.redraw();

    const scale = Math.min(1, width / 420, height / 100);
    this.title.scale.set(scale);
    this.payout.scale.set(scale);
    this.title.position.set(0, -height * 0.16);
    this.payout.position.set(0, height * 0.26);

    this.glow.width = width * 1.15;
    this.glow.height = height * 2.4;

    // The pile sits in the left third of the band so the printed name and odds
    // stay legible underneath a full stack.
    this.stack.position.set(-width * 0.31, height * 0.02);
    this.stack.setChipScale(Math.min(0.72, (height * 0.78) / CHIP_SIZE));
    this.stack.setBadgeOffset(-height * 0.46);
  }

  private redraw(): void {
    const hasBet = this.stack.amount > 0;
    const gold = this.ctx.config.theme.gold;

    // The reference layout is printed, not painted: a thin bright outline over
    // the felt, with colour appearing only once the spot is live.
    const border = this.locked
      ? 0x8a8a8a
      : hasBet
        ? Palette.goldBright
        : this.hovering
          ? gold
          : 0xd8d2d6;
    const borderWidth = hasBet ? 4 : this.hovering ? 3.5 : 2.5;
    const fillAlpha = hasBet ? 0.24 : this.hovering ? 0.16 : 0.09;

    this.body.clear();
    this.trace(this.body);
    this.body.fill({ color: hasBet ? this.options.color : 0x000000, alpha: fillAlpha });
    this.trace(this.body);
    this.body.stroke({
      width: borderWidth,
      color: border,
      alignment: 0.5,
      alpha: this.locked ? 0.5 : 0.95,
    });

    this.title.tint = this.locked ? 0x9a9a9a : 0xffffff;
    this.payout.tint = this.locked ? 0x8a8a8a : 0xe8e2e6;
  }

  /** Traces the band outline: bowed top and bottom edges, rounded corners. */
  private trace(g: Graphics): void {
    const shape = this.options.shape ?? "arc";
    const hw = this.spotWidth / 2;
    const hh = this.spotHeight / 2;

    if (shape === "rect") {
      g.roundRect(-hw, -hh, this.spotWidth, this.spotHeight, Math.min(18, hh));
      return;
    }

    if (shape === "hex") {
      const skew = Math.min(30, this.spotWidth * 0.11);
      g.moveTo(-hw + skew, -hh)
        .lineTo(hw - skew, -hh)
        .lineTo(hw, 0)
        .lineTo(hw - skew, hh)
        .lineTo(-hw + skew, hh)
        .lineTo(-hw, 0)
        .closePath();
      return;
    }

    const r = Math.min(20, hh * 0.6);
    const bow = this.bow;

    g.moveTo(-hw + r, -hh)
      .quadraticCurveTo(0, -hh + bow * 2, hw - r, -hh)
      .quadraticCurveTo(hw, -hh, hw, -hh + r)
      .lineTo(hw, hh - r)
      .quadraticCurveTo(hw, hh, hw - r, hh)
      .quadraticCurveTo(0, hh + bow * 2, -hw + r, hh)
      .quadraticCurveTo(-hw, hh, -hw, hh - r)
      .lineTo(-hw, -hh + r)
      .quadraticCurveTo(-hw, -hh, -hw + r, -hh)
      .closePath();
  }

  /** Where chips should fly to, in stage space. */
  chipTargetGlobal(): { x: number; y: number } {
    const point = this.stack.toGlobal({ x: 0, y: 0 });
    return { x: point.x, y: point.y };
  }

  /* ---------------------------------------------------------------- *
   * Labels
   * ---------------------------------------------------------------- */

  /**
   * Odds exactly as the felt prints them: `1:1`, `8:1`, `0.95:1`. When a table
   * takes commission separately rather than pricing it into the odds, that is
   * appended instead of being silently dropped.
   */
  private payoutLabel(): string {
    const { payouts, rules, features } = this.ctx.config;
    const odds = payouts[this.betType];
    const text = `${Number.isInteger(odds) ? odds : odds.toFixed(2)}:1`;

    if (this.betType === BetType.Banker && rules.bankerCommission > 0 && features.commissionDisplay) {
      return `${text}  -${Math.round(rules.bankerCommission * 100)}%`;
    }
    return text;
  }

  setLabel(label: string): void {
    this.title.text = label.toUpperCase();
  }

  refreshLabels(): void {
    this.glow.texture = this.ctx.assets.get("fx_glow");
    this.payout.text = this.payoutLabel();
    this.redraw();
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
        this.ctx.animation.to(this.scale, { x: 0.98, y: 0.98, duration: 0.08 });
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
      alpha: hovering ? 0.2 : 0,
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
        alpha: 0.65,
        duration: this.ctx.config.animation.winGlowDuration * 0.5,
        ease: Ease.glow,
        yoyo: true,
        repeat: 3,
      },
    );
    this.ctx.animation.fromTo(
      this.scale,
      { x: 1, y: 1 },
      { x: 1.04, y: 1.04, duration: 0.24, ease: Ease.uiIn, yoyo: true, repeat: 1 },
    );
  }

  playLose(): void {
    this.ctx.animation.to(this.body, {
      alpha: 0.4,
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
