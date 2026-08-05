import { Container, Graphics, Sprite } from "pixi.js";

import { CARD_HEIGHT, CARD_WIDTH, Palette } from "../Constants";
import type { GameContext } from "../GameContext";
import { Ease } from "../managers/AnimationManager";
import { Sfx } from "../managers/AudioManager";

/**
 * The shoe.
 *
 * Visually it is a short stack of card backs — enough to read as a physical
 * object without paying for 400 sprites. It is also the anchor every dealt card
 * flies from, so `originGlobal` is the one piece of geometry the card manager
 * needs from it.
 */
export class Deck extends Container {
  private readonly ctx: GameContext;
  private readonly stack: Sprite[] = [];
  private readonly shoeBody: Graphics;
  private readonly layerCount = 7;

  constructor(ctx: GameContext) {
    super();
    this.ctx = ctx;

    // Shoe housing, drawn behind the cards.
    this.shoeBody = new Graphics()
      .roundRect(-CARD_WIDTH * 0.62, -CARD_HEIGHT * 0.42, CARD_WIDTH * 1.24, CARD_HEIGHT * 0.92, 14)
      .fill({ color: 0x0d1a14, alpha: 0.92 })
      .roundRect(-CARD_WIDTH * 0.62, -CARD_HEIGHT * 0.42, CARD_WIDTH * 1.24, CARD_HEIGHT * 0.92, 14)
      .stroke({ width: 2, color: Palette.gold, alpha: 0.5 });
    this.addChild(this.shoeBody);

    const back = this.ctx.assets.get("card_back");
    for (let i = 0; i < this.layerCount; i++) {
      const sprite = new Sprite(back);
      sprite.anchor.set(0.5);
      // Each layer sits a pixel up and left — a cheap parallax stack.
      sprite.position.set(-i * 1.1, -i * 1.6);
      sprite.scale.set(0.82);
      this.stack.push(sprite);
      this.addChild(sprite);
    }
  }

  /** Re-resolves textures after an atlas rebuild. */
  refreshTextures(): void {
    const back = this.ctx.assets.get("card_back");
    for (const sprite of this.stack) sprite.texture = back;
  }

  /** Where a dealt card starts, in stage coordinates. */
  originGlobal(): { x: number; y: number } {
    const point = this.toGlobal({ x: 0, y: 0 });
    return { x: point.x, y: point.y };
  }

  /** Riffle-and-settle used at every shoe change. */
  shuffle(duration = this.ctx.config.animation.shuffleDuration): Promise<void> {
    this.ctx.audio.play(Sfx.Shuffle);

    return new Promise((resolve) => {
      const timeline = this.ctx.animation.timeline({ onComplete: resolve });
      const half = duration * 0.42;

      this.stack.forEach((sprite, index) => {
        const direction = index % 2 === 0 ? -1 : 1;
        const restX = -index * 1.1;
        const restY = -index * 1.6;

        timeline
          .to(
            sprite,
            {
              x: restX + direction * (26 + index * 3),
              rotation: direction * 0.14,
              duration: half * 0.5,
              ease: "power2.out",
            },
            index * 0.03,
          )
          .to(
            sprite,
            {
              x: restX,
              y: restY,
              rotation: 0,
              duration: half * 0.7,
              ease: "back.out(1.6)",
            },
            half * 0.6 + index * 0.03,
          );
      });

      timeline.to(this.shoeBody, { alpha: 0.75, duration: half * 0.4 }, 0);
      timeline.to(this.shoeBody, { alpha: 1, duration: half * 0.5 }, half);
    });
  }

  /**
   * Burn card: one card slides out of the shoe and into the discard tray at the
   * start of every shoe, exactly as a live dealer does it.
   */
  burn(toX: number, toY: number, count = 1): Promise<void> {
    const cards: Sprite[] = [];
    const back = this.ctx.assets.get("card_back");

    return new Promise((resolve) => {
      const timeline = this.ctx.animation.timeline({
        onComplete: () => {
          for (const sprite of cards) sprite.destroy();
          resolve();
        },
      });

      for (let i = 0; i < Math.min(count, 6); i++) {
        const sprite = new Sprite(back);
        sprite.anchor.set(0.5);
        sprite.scale.set(0.82);
        sprite.position.set(0, 0);
        this.addChild(sprite);
        cards.push(sprite);

        timeline
          .to(
            sprite,
            {
              x: toX,
              y: toY,
              rotation: 0.42 + i * 0.05,
              duration: 0.42,
              ease: Ease.deal,
              onStart: () => this.ctx.audio.play(Sfx.CardSlide, { volume: 0.6 }),
            },
            i * 0.16,
          )
          .to(sprite, { alpha: 0, duration: 0.2, ease: Ease.uiOut }, i * 0.16 + 0.42);
      }
    });
  }

  /** Subtle idle breathing so the table never looks frozen between rounds. */
  startIdle(): void {
    this.ctx.animation.to(this.stack[this.stack.length - 1] as Sprite, {
      y: `-=2`,
      duration: 1.8,
      ease: Ease.glow,
      yoyo: true,
      repeat: -1,
    });
  }

  override destroy(): void {
    for (const sprite of this.stack) this.ctx.animation.killTweensOf(sprite);
    this.ctx.animation.killTweensOf(this.shoeBody);
    this.stack.length = 0;
    super.destroy({ children: true });
  }
}
