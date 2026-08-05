import { Container, Graphics, Text } from "pixi.js";

import { Palette } from "../Constants";
import { Ease } from "../managers/AnimationManager";
import type { ViewportMetrics } from "../types";
import { Scene } from "./Scene";

/**
 * First frame on screen.
 *
 * Runs before any asset exists — including the bitmap fonts — so it uses plain
 * `Text` and vector art only. Its job is to put something branded on screen
 * within one frame of `init()` so the mount never flashes black.
 */
export class BootScene extends Scene {
  private readonly backdrop = new Graphics();
  private readonly emblem = new Container();
  private readonly title: Text;
  private readonly ring = new Graphics();

  constructor(...args: ConstructorParameters<typeof Scene>) {
    super(...args);

    this.title = new Text({
      text: this.ctx.config.tableName,
      style: {
        fontFamily: this.ctx.config.theme.fontFamily,
        fontSize: 46,
        fontWeight: "700",
        fill: Palette.goldBright,
        letterSpacing: 4,
      },
    });
    this.title.anchor.set(0.5);

    this.ring
      .circle(0, 0, 62)
      .stroke({ width: 3, color: Palette.gold, alpha: 0.5 })
      .arc(0, 0, 62, -Math.PI / 2, Math.PI * 0.35)
      .stroke({ width: 5, color: Palette.goldBright, cap: "round" });

    this.emblem.addChild(this.ring);
    this.addChild(this.backdrop, this.emblem, this.title);
  }

  protected override onEnter(): void {
    this.ctx.animation.to(this.ring, {
      rotation: Math.PI * 2,
      duration: 1.1,
      ease: Ease.linear,
      repeat: -1,
    });
    this.ctx.animation.fromTo(
      this.title,
      { alpha: 0, y: this.title.y + 18 },
      { alpha: 1, y: this.title.y, duration: 0.6, ease: Ease.uiOut },
    );
    this.track(() => {
      this.ctx.animation.killTweensOf(this.ring);
      this.ctx.animation.killTweensOf(this.title);
    });
  }

  layout(metrics: ViewportMetrics): void {
    const { designWidth, designHeight } = metrics;

    this.backdrop
      .clear()
      .rect(0, 0, designWidth, designHeight)
      .fill(this.ctx.config.theme.feltDeep);

    this.emblem.position.set(designWidth / 2, designHeight / 2 - 30);
    this.title.position.set(designWidth / 2, designHeight / 2 + 90);
    this.scale.set(metrics.scale);
  }
}
