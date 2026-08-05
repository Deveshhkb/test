import { Container, Sprite, type Texture } from "pixi.js";

import type { GameContext } from "../GameContext";
import { CARD_HEIGHT, CARD_WIDTH } from "../Constants";
import type { Poolable } from "../core/ObjectPool";
import { Ease } from "../managers/AnimationManager";
import { Sfx } from "../managers/AudioManager";
import { cardKey, type CardData } from "../types";

/**
 * A single playing card.
 *
 * Pooled, so the same dozen instances serve an entire shoe. Everything that
 * changes between rounds — texture, rotation, tint, tweens — is reset in
 * `onRelease`, which is the contract that makes recycling safe.
 *
 * The flip is a real two-half animation (squash to zero width, swap face,
 * expand) rather than a cross-fade, because that is what reads as a card
 * turning over rather than a picture changing.
 */
export class Card extends Container implements Poolable {
  private readonly ctx: GameContext;
  private readonly back: Sprite;
  private readonly face: Sprite;
  private readonly highlight: Sprite;

  private data: CardData | null = null;
  private faceUp = false;
  private flipping = false;

  constructor(ctx: GameContext) {
    super();
    this.ctx = ctx;

    this.back = new Sprite(ctx.assets.get("card_back"));
    this.back.anchor.set(0.5);

    this.face = new Sprite(ctx.assets.get("card_back"));
    this.face.anchor.set(0.5);
    this.face.visible = false;

    this.highlight = new Sprite(ctx.assets.get("card_highlight"));
    this.highlight.anchor.set(0.5);
    this.highlight.visible = false;
    this.highlight.alpha = 0;

    this.addChild(this.back, this.face, this.highlight);
    this.pivot.set(0, 0);
    this.applyScale();
  }

  /* ---------------------------------------------------------------- *
   * State
   * ---------------------------------------------------------------- */

  get cardData(): CardData | null {
    return this.data;
  }

  get isFaceUp(): boolean {
    return this.faceUp;
  }

  static get width(): number {
    return CARD_WIDTH;
  }

  static get height(): number {
    return CARD_HEIGHT;
  }

  /** Assigns the card without revealing it. */
  setCard(data: CardData): void {
    this.data = data;
    this.face.texture = this.textureFor(data);
  }

  private textureFor(data: CardData): Texture {
    return this.ctx.assets.get(cardKey(data));
  }

  /** Re-resolves textures after the atlas is rebuilt by a config change. */
  refreshTextures(): void {
    this.back.texture = this.ctx.assets.get("card_back");
    this.highlight.texture = this.ctx.assets.get("card_highlight");
    this.face.texture = this.data
      ? this.textureFor(this.data)
      : this.ctx.assets.get("card_back");
  }

  private applyScale(): void {
    const scale = this.ctx.config.table.cardScale;
    this.scale.set(scale);
  }

  /** Snaps to a side with no animation — used when rebuilding after a resync. */
  setFaceUp(faceUp: boolean): void {
    this.faceUp = faceUp;
    this.face.visible = faceUp;
    this.back.visible = !faceUp;
    this.scale.x = Math.abs(this.scale.x);
  }

  /* ---------------------------------------------------------------- *
   * Animation
   * ---------------------------------------------------------------- */

  /**
   * Turns the card over. Resolves when the reveal is complete so the dealing
   * sequence can await it.
   */
  flip(duration = this.ctx.config.animation.flipDuration): Promise<void> {
    if (this.faceUp || this.flipping) return Promise.resolve();
    this.flipping = true;

    const baseScale = this.ctx.config.table.cardScale;
    return new Promise((resolve) => {
      const timeline = this.ctx.animation.timeline({
        onComplete: () => {
          this.flipping = false;
          resolve();
        },
      });

      timeline
        .to(this.scale, {
          x: 0.02 * baseScale,
          duration: duration * 0.5,
          ease: Ease.flipOut,
        })
        // Lift the card slightly through the turn so it reads as 3D.
        .to(this, { y: this.y - 10, duration: duration * 0.5, ease: Ease.flipOut }, 0)
        .add(() => {
          this.faceUp = true;
          this.face.visible = true;
          this.back.visible = false;
          this.ctx.audio.play(Sfx.CardFlip);
        })
        .to(this.scale, { x: baseScale, duration: duration * 0.5, ease: Ease.flipIn })
        .to(this, { y: this.y, duration: duration * 0.5, ease: Ease.flipIn }, "<");
    });
  }

  /**
   * The "squeeze": the card is peeled up a corner at a time before the reveal.
   * Baccarat's signature piece of theatre, used for the decisive third card.
   */
  squeeze(duration = this.ctx.config.animation.squeezeDuration): Promise<void> {
    if (this.faceUp) return Promise.resolve();

    return new Promise((resolve) => {
      const timeline = this.ctx.animation.timeline({ onComplete: resolve });
      const baseScale = this.ctx.config.table.cardScale;
      const startRotation = this.rotation;

      timeline
        .to(this, { rotation: startRotation - 0.18, duration: duration * 0.28, ease: "power2.out" })
        .to(this.scale, { y: baseScale * 1.06, duration: duration * 0.28, ease: "power2.out" }, "<")
        .to(this, { rotation: startRotation + 0.05, duration: duration * 0.22, ease: "power1.inOut" })
        .to(this, { rotation: startRotation, duration: duration * 0.2, ease: "power2.inOut" })
        .to(this.scale, { y: baseScale, duration: duration * 0.2, ease: "power2.inOut" }, "<")
        .add(() => void this.flip(duration * 0.4));
    });
  }

  /** Gold rim on the winning hand. */
  setHighlighted(on: boolean, duration = 0.3): void {
    if (on) {
      this.highlight.visible = true;
      this.ctx.animation.to(this.highlight, { alpha: 1, duration, ease: Ease.glow });
    } else {
      this.ctx.animation.to(this.highlight, {
        alpha: 0,
        duration,
        ease: Ease.glow,
        onComplete: () => {
          this.highlight.visible = false;
        },
      });
    }
  }

  /** Dims a losing hand without hiding it. */
  setDimmed(on: boolean, duration = this.ctx.config.animation.loseFadeDuration): void {
    this.ctx.animation.to(this, { alpha: on ? 0.42 : 1, duration, ease: Ease.uiOut });
  }

  /* ---------------------------------------------------------------- *
   * Pooling
   * ---------------------------------------------------------------- */

  onAcquire(): void {
    this.visible = true;
    this.alpha = 1;
    this.applyScale();
  }

  onRelease(): void {
    // A scene teardown can destroy pooled cards before the pool drains them;
    // touching Pixi internals afterwards throws, so bail out early.
    if (this.destroyed) return;

    // Kill anything still animating before the instance is reused, otherwise a
    // stale tween will move a card that now belongs to the next round.
    this.ctx.animation.killTweensOf(this);
    this.ctx.animation.killTweensOf(this.scale);
    this.ctx.animation.killTweensOf(this.highlight);

    this.removeFromParent();
    this.data = null;
    this.faceUp = false;
    this.flipping = false;
    this.face.visible = false;
    this.face.texture = this.ctx.assets.get("card_back");
    this.back.visible = true;
    this.highlight.visible = false;
    this.highlight.alpha = 0;
    this.position.set(0, 0);
    this.rotation = 0;
    this.alpha = 1;
    this.visible = false;
    this.applyScale();
  }

  override destroy(): void {
    this.ctx.animation.killTweensOf(this);
    super.destroy({ children: true });
  }
}
