import { BitmapText, Container, Graphics, Sprite } from "pixi.js";

import { Fonts, Palette } from "../Constants";
import type { GameContext } from "../GameContext";
import { Ease } from "../managers/AnimationManager";
import { HandSide } from "../types";
import { shade } from "../utils/Helpers";

/**
 * The score plate that sits above each hand.
 *
 * Shows the side, its running total, and any pair — and, when the coup
 * settles, whether it won. The total animates on change rather than snapping,
 * because a baccarat total updating from 3 to 9 on the third card is the single
 * most dramatic number in the game.
 */
export interface ScorePlateOptions {
  /**
   * Plain plates show only their name until cards are on the table, matching a
   * printed felt; the badge fades in with the hand.
   */
  readonly plain?: boolean;
  readonly titleColor?: number;
  readonly label?: string;
}

export class ScorePlate extends Container {
  private readonly ctx: GameContext;
  private readonly side: HandSide;
  private readonly options: ScorePlateOptions;
  private hasHand = false;
  private readonly plate = new Graphics();
  private readonly glow: Sprite;
  private readonly title: BitmapText;
  private readonly total: BitmapText;
  private readonly pairBadge: BitmapText;
  private readonly pairPlate = new Graphics();

  private width_ = 220;
  private height_ = 96;
  private value = 0;

  constructor(ctx: GameContext, side: HandSide, options: ScorePlateOptions = {}) {
    super();
    this.ctx = ctx;
    this.side = side;
    this.options = options;

    const color = side === HandSide.Player ? ctx.config.theme.player : ctx.config.theme.banker;

    this.glow = new Sprite(ctx.assets.get("fx_glow"));
    this.glow.anchor.set(0.5);
    this.glow.tint = color;
    this.glow.alpha = 0;
    this.glow.blendMode = "add";

    this.title = new BitmapText({
      text: (options.label ?? (side === HandSide.Player ? "PLAYER" : "BANKER")).toUpperCase(),
      style: { fontFamily: Fonts.Label, fontSize: 40 },
    });
    this.title.anchor.set(0.5);
    this.title.tint = options.titleColor ?? shade(color, 0.7);

    this.total = new BitmapText({
      text: "0",
      style: { fontFamily: Fonts.Score, fontSize: 62 },
    });
    this.total.anchor.set(0.5);

    this.pairBadge = new BitmapText({
      text: "PAIR",
      style: { fontFamily: Fonts.Label, fontSize: 18 },
    });
    this.pairBadge.anchor.set(0.5);
    this.pairBadge.visible = false;
    this.pairPlate.visible = false;

    this.addChild(this.glow, this.plate, this.title, this.total, this.pairPlate, this.pairBadge);
    this.redraw();
  }

  /** Re-resolves textures after an atlas rebuild. */
  refreshTextures(): void {
    this.glow.texture = this.ctx.assets.get("fx_glow");
    this.redraw();
  }

  resizeTo(width: number, height: number): void {
    this.width_ = width;
    this.height_ = height;
    this.redraw();
  }

  private redraw(): void {
    const color = this.side === HandSide.Player ? this.ctx.config.theme.player : this.ctx.config.theme.banker;
    const w = this.width_;
    const h = this.height_;
    const plain = this.options.plain ?? false;
    const showPlate = !plain || this.hasHand;

    this.plate.clear();
    if (showPlate) {
      this.plate
        .roundRect(-w / 2, -h / 2, w, h, 14)
        .fill({ color: shade(color, -0.7), alpha: plain ? 0.72 : 0.85 })
        .roundRect(-w / 2, -h / 2, w, h, 14)
        .stroke({ width: 2, color: shade(color, 0.2), alpha: 0.9 });
    }
    this.total.visible = showPlate;

    const scale = Math.min(1, w / 220);
    this.title.position.set(0, showPlate ? -h * 0.27 : 0);
    this.title.scale.set(scale);
    this.total.position.set(0, h * 0.16);
    this.total.scale.set(scale);

    this.glow.width = w * 1.8;
    this.glow.height = h * 2.4;

    this.pairPlate
      .clear()
      .roundRect(-38, -13, 76, 26, 13)
      .fill({ color: this.ctx.config.theme.pair, alpha: 0.9 });
    this.pairPlate.position.set(w * 0.36, -h * 0.42);
    this.pairBadge.position.set(w * 0.36, -h * 0.42);
  }

  /** Reveals the badge; a plain plate is just its name until this is set. */
  setHandPresent(present: boolean): void {
    if (this.hasHand === present) return;
    this.hasHand = present;
    this.redraw();
  }

  /** Animates the total to a new value. */
  setTotal(value: number, animate = true): void {
    if (value === this.value && animate) return;
    this.value = value;
    this.total.text = String(value);

    if (!animate) return;
    this.ctx.animation.killTweensOf(this.total.scale);
    const base = Math.min(1, this.width_ / 220);
    this.ctx.animation.fromTo(
      this.total.scale,
      { x: base * 1.5, y: base * 1.5 },
      { x: base, y: base, duration: 0.34, ease: Ease.uiIn },
    );
  }

  setPair(hasPair: boolean): void {
    this.pairBadge.visible = hasPair;
    this.pairPlate.visible = hasPair;
    if (!hasPair) return;
    this.ctx.animation.fromTo(
      this.pairPlate.scale,
      { x: 0.4, y: 0.4 },
      { x: 1, y: 1, duration: 0.32, ease: Ease.uiIn },
    );
  }

  playWin(): void {
    this.ctx.animation.killTweensOf(this.glow);
    this.glow.tint = Palette.win;
    this.ctx.animation.fromTo(
      this.glow,
      { alpha: 0.15 },
      {
        alpha: 0.8,
        duration: this.ctx.config.animation.winGlowDuration * 0.5,
        ease: Ease.glow,
        yoyo: true,
        repeat: 3,
      },
    );
    this.ctx.animation.fromTo(
      this.scale,
      { x: 1, y: 1 },
      { x: 1.08, y: 1.08, duration: 0.3, ease: Ease.uiIn, yoyo: true, repeat: 1 },
    );
  }

  playLose(): void {
    this.ctx.animation.to(this, {
      alpha: 0.5,
      duration: this.ctx.config.animation.loseFadeDuration,
    });
  }

  reset(): void {
    this.ctx.animation.killTweensOf(this.glow);
    this.ctx.animation.killTweensOf(this);
    this.glow.alpha = 0;
    this.glow.tint =
      this.side === HandSide.Player ? this.ctx.config.theme.player : this.ctx.config.theme.banker;
    this.alpha = 1;
    this.scale.set(1);
    this.value = 0;
    this.total.text = "0";
    this.hasHand = false;
    this.setPair(false);
    this.redraw();
  }

  override destroy(): void {
    this.ctx.animation.killTweensOf(this.glow);
    this.ctx.animation.killTweensOf(this);
    this.ctx.animation.killTweensOf(this.scale);
    this.ctx.animation.killTweensOf(this.total.scale);
    super.destroy({ children: true });
  }
}
