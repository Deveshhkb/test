import { BitmapText, Container, Graphics, Sprite } from "pixi.js";

import { Fonts, POOL_SIZE_PARTICLES, Palette } from "../Constants";
import type { GameContext } from "../GameContext";
import { Ease } from "../managers/AnimationManager";
import { RoundOutcome, type RoundResult } from "../types";
import { formatAmount, shade } from "../utils/Helpers";

/**
 * The outcome announcement.
 *
 * Three layers of information in one beat: who won (colour and word), by what
 * (the two totals), and what it paid (a counting number). Losing rounds get the
 * same banner in a muted treatment rather than a different component, so the
 * rhythm of the round never changes.
 */
export class ResultBanner extends Container {
  private readonly ctx: GameContext;
  private readonly plate = new Graphics();
  private readonly headline: BitmapText;
  private readonly scoreLine: BitmapText;
  private readonly payout: BitmapText;
  private readonly particleLayer = new Container();
  private readonly particles: Sprite[] = [];

  private width_ = 620;
  private height_ = 240;
  private visibleNow = false;

  constructor(ctx: GameContext) {
    super();
    this.ctx = ctx;

    this.headline = new BitmapText({
      text: "",
      style: { fontFamily: Fonts.Label, fontSize: 64 },
    });
    this.headline.anchor.set(0.5);

    this.scoreLine = new BitmapText({
      text: "",
      style: { fontFamily: Fonts.Numeric, fontSize: 40 },
    });
    this.scoreLine.anchor.set(0.5);
    this.scoreLine.alpha = 0.9;

    this.payout = new BitmapText({
      text: "",
      style: { fontFamily: Fonts.Numeric, fontSize: 44 },
    });
    this.payout.anchor.set(0.5);
    this.payout.tint = Palette.goldBright;

    this.addChild(this.plate, this.headline, this.scoreLine, this.payout, this.particleLayer);
    this.visible = false;
    this.alpha = 0;
  }

  /** Re-resolves textures after an atlas rebuild. */
  refreshTextures(): void {
    const spark = this.ctx.assets.get("fx_spark");
    for (const particle of this.particles) particle.texture = spark;
  }

  resizeTo(width: number, height: number): void {
    this.width_ = width;
    this.height_ = height;
    // Scale from whichever axis is tighter: three stacked lines need vertical
    // room as much as horizontal, and a short banner must not overlap itself.
    const scale = Math.min(1, width / 620, height / 230);
    this.headline.scale.set(scale);
    this.scoreLine.scale.set(scale);
    this.payout.scale.set(scale);
    this.headline.position.set(0, -height * 0.24);
    this.scoreLine.position.set(0, height * 0.02);
    this.payout.position.set(0, height * 0.28);
  }

  /* ---------------------------------------------------------------- *
   * Presentation
   * ---------------------------------------------------------------- */

  show(result: RoundResult, netProfit: number, staked: number): void {
    const theme = this.ctx.config.theme;
    const color =
      result.outcome === RoundOutcome.Player
        ? theme.player
        : result.outcome === RoundOutcome.Banker
          ? theme.banker
          : theme.tie;

    this.headline.text =
      result.outcome === RoundOutcome.Tie
        ? "TIE"
        : `${result.outcome === RoundOutcome.Player ? "PLAYER" : "BANKER"} WINS`;
    this.headline.tint = shade(color, 0.75);

    const natural = result.natural ? "  NATURAL" : "";
    this.scoreLine.text = `${result.player.total} : ${result.banker.total}${natural}`;

    if (staked <= 0) {
      this.payout.text = "";
    } else if (netProfit > 0) {
      this.payout.text = `+${formatAmount(Math.round(netProfit), this.ctx.config.locale)}`;
      this.payout.tint = Palette.win;
    } else if (netProfit < 0) {
      this.payout.text = `-${formatAmount(Math.round(-netProfit), this.ctx.config.locale)}`;
      this.payout.tint = Palette.danger;
    } else {
      this.payout.text = "PUSH";
      this.payout.tint = Palette.white;
    }

    this.drawPlate(color);
    this.animateIn(netProfit > 0);
  }

  private drawPlate(color: number): void {
    const w = this.width_;
    const h = this.height_;
    this.plate
      .clear()
      .roundRect(-w / 2, -h / 2, w, h, 20)
      .fill({ color: 0x000000, alpha: 0.72 })
      .roundRect(-w / 2, -h / 2, w, h, 20)
      .stroke({ width: 3, color: shade(color, 0.35), alpha: 0.95 })
      // Colour wash behind the headline.
      .roundRect(-w / 2, -h / 2, w, h * 0.42, 20)
      .fill({ color, alpha: 0.22 });
  }

  private animateIn(celebrate: boolean): void {
    this.visibleNow = true;
    this.visible = true;
    this.ctx.animation.killTweensOf(this);
    this.ctx.animation.killTweensOf(this.scale);

    this.alpha = 0;
    this.scale.set(0.82);
    this.ctx.animation.to(this, { alpha: 1, duration: 0.24, ease: Ease.uiOut });
    this.ctx.animation.to(this.scale, { x: 1, y: 1, duration: 0.42, ease: Ease.uiIn });

    if (celebrate && this.ctx.config.features.particles) this.burst();
  }

  /** Coin-spray on a win. Sprites come from a fixed pool and are never allocated. */
  private burst(): void {
    const count = Math.min(POOL_SIZE_PARTICLES, 34);
    for (let i = 0; i < count; i++) {
      const particle = this.takeParticle();
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const distance = 120 + Math.random() * 220;

      particle.position.set(0, 0);
      particle.scale.set(0.4 + Math.random() * 0.5);
      particle.alpha = 1;
      particle.visible = true;

      this.ctx.animation.to(particle, {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance * 0.7 - 40,
        alpha: 0,
        duration: 0.8 + Math.random() * 0.5,
        ease: "power2.out",
        onComplete: () => {
          particle.visible = false;
        },
      });
      this.ctx.animation.to(particle.scale, {
        x: 0.1,
        y: 0.1,
        duration: 0.9,
        ease: "power2.in",
      });
    }
  }

  private takeParticle(): Sprite {
    let particle = this.particles.find((candidate) => !candidate.visible);
    if (!particle) {
      particle = new Sprite(this.ctx.assets.get("fx_spark"));
      particle.anchor.set(0.5);
      particle.blendMode = "add";
      particle.visible = false;
      this.particles.push(particle);
      this.particleLayer.addChild(particle);
    }
    return particle;
  }

  hide(): void {
    if (!this.visibleNow) return;
    this.visibleNow = false;
    this.ctx.animation.to(this, {
      alpha: 0,
      duration: 0.3,
      ease: Ease.uiOut,
      onComplete: () => {
        this.visible = false;
        for (const particle of this.particles) particle.visible = false;
      },
    });
    this.ctx.animation.to(this.scale, { x: 0.9, y: 0.9, duration: 0.3, ease: Ease.uiOut });
  }

  override destroy(): void {
    for (const particle of this.particles) {
      this.ctx.animation.killTweensOf(particle);
      this.ctx.animation.killTweensOf(particle.scale);
    }
    this.particles.length = 0;
    this.ctx.animation.killTweensOf(this);
    this.ctx.animation.killTweensOf(this.scale);
    super.destroy({ children: true });
  }
}
