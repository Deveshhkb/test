import { Container, Graphics, Sprite, Text } from "pixi.js";

import { Palette } from "../Constants";
import { Ease } from "../managers/AnimationManager";
import type { ViewportMetrics } from "../types";
import { clamp } from "../utils/MathUtils";
import { Scene } from "./Scene";

/**
 * Progress screen.
 *
 * Shows a real determinate bar driven by `assets:progress` plus a looping
 * card-fan flourish, so the wait reads as the game preparing itself rather than
 * as a spinner that might mean anything.
 */
export class LoadingScene extends Scene {
  private readonly backdrop = new Graphics();
  private readonly barTrack = new Graphics();
  private readonly barFill = new Graphics();
  private readonly caption: Text;
  private readonly percent: Text;
  private readonly fan = new Container();
  private readonly fanCards: Sprite[] = [];

  private progress = 0;
  private displayed = 0;
  private barWidth = 620;

  constructor(...args: ConstructorParameters<typeof Scene>) {
    super(...args);

    const font = this.ctx.config.theme.fontFamily;

    this.caption = new Text({
      text: "Loading",
      style: { fontFamily: font, fontSize: 26, fill: 0xffffff, letterSpacing: 2 },
    });
    this.caption.anchor.set(0.5);
    this.caption.alpha = 0.8;

    this.percent = new Text({
      text: "0%",
      style: { fontFamily: font, fontSize: 34, fontWeight: "700", fill: Palette.goldBright },
    });
    this.percent.anchor.set(0.5);

    this.addChild(this.backdrop, this.fan, this.barTrack, this.barFill, this.caption, this.percent);
  }

  protected override onEnter(): void {
    this.buildFan();

    this.track(
      this.ctx.bus.on("assets:progress", ({ progress, label }) => {
        this.progress = clamp(progress, 0, 1);
        this.caption.text = label;
      }),
    );
    this.track(
      this.ctx.bus.on("assets:complete", () => {
        this.progress = 1;
      }),
    );
  }

  /**
   * The fan is built from whatever card art already exists. Early in the load
   * that is the procedural back only, which is exactly the point — it proves
   * the atlas is live.
   */
  private buildFan(): void {
    const back = this.ctx.assets.find("card_back");
    if (!back) return;

    for (let i = 0; i < 5; i++) {
      const card = new Sprite(back);
      card.anchor.set(0.5, 1);
      card.scale.set(0.7);
      card.rotation = (i - 2) * 0.16;
      card.x = (i - 2) * 34;
      this.fanCards.push(card);
      this.fan.addChild(card);

      this.ctx.animation.to(card, {
        y: -14,
        duration: 0.9,
        delay: i * 0.09,
        ease: Ease.glow,
        yoyo: true,
        repeat: -1,
      });
    }

    this.track(() => {
      for (const card of this.fanCards) this.ctx.animation.killTweensOf(card);
    });
  }

  override update(deltaSeconds: number): void {
    // Ease the displayed value toward the real one so a burst of loaded assets
    // does not make the bar jump.
    const speed = 4;
    this.displayed += (this.progress - this.displayed) * Math.min(1, deltaSeconds * speed);
    if (Math.abs(this.progress - this.displayed) < 0.001) this.displayed = this.progress;

    this.percent.text = `${Math.round(this.displayed * 100)}%`;
    this.drawBar();
  }

  private drawBar(): void {
    const h = 12;
    this.barFill
      .clear()
      .roundRect(-this.barWidth / 2, -h / 2, Math.max(h, this.barWidth * this.displayed), h, h / 2)
      .fill(Palette.gold);
  }

  layout(metrics: ViewportMetrics): void {
    const { designWidth, designHeight } = metrics;
    this.barWidth = Math.min(620, designWidth * 0.6);

    this.backdrop
      .clear()
      .rect(0, 0, designWidth, designHeight)
      .fill(this.ctx.config.theme.feltDeep);

    const cx = designWidth / 2;
    const cy = designHeight / 2;

    this.fan.position.set(cx, cy - 40);
    this.fan.scale.set(Math.min(1, designWidth / 900));

    this.barTrack
      .clear()
      .roundRect(-this.barWidth / 2, -6, this.barWidth, 12, 6)
      .fill({ color: 0xffffff, alpha: 0.14 });
    this.barTrack.position.set(cx, cy + 110);
    this.barFill.position.set(cx, cy + 110);

    this.caption.position.set(cx, cy + 150);
    this.percent.position.set(cx, cy + 62);

    this.drawBar();
    this.scale.set(metrics.scale);
  }

  /** Fades out and resolves — the game scene is already faded in behind it. */
  protected override onExit(): Promise<void> {
    return new Promise((resolve) => {
      this.ctx.animation.to(this, { alpha: 0, duration: 0.25, onComplete: resolve });
    });
  }

  override destroy(): void {
    for (const card of this.fanCards) this.ctx.animation.killTweensOf(card);
    this.fanCards.length = 0;
    super.destroy();
  }
}
