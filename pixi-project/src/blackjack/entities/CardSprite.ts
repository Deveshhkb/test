import { Container, Sprite } from "pixi.js";
import gsap from "gsap";
import { CARD_LAYOUT, TIMING } from "../config/gameConfig";
import { Card } from "../game/Card";
import { TextureFactory } from "../utils/textures";

/**
 * A single playing card: a face, a back and a soft drop shadow.
 *
 * Instances are pooled, so `reset` returns the sprite to a pristine state
 * rather than the object being thrown away between rounds.
 */
export class CardSprite extends Container {
  private readonly shadow: Sprite;
  private readonly face: Sprite;
  private readonly back: Sprite;
  private card: Card | null = null;
  private faceUp = false;
  private activeTween: gsap.core.Timeline | gsap.core.Tween | null = null;

  constructor(private readonly textures: TextureFactory) {
    super();

    const { width, height } = CARD_LAYOUT;

    this.shadow = new Sprite(this.textures.softShadow(96, 96));
    this.shadow.anchor.set(0.5);
    this.shadow.width = width * 1.35;
    this.shadow.height = height * 1.25;
    this.shadow.y = 10;
    this.shadow.alpha = 0.5;

    this.back = new Sprite(this.textures.cardBack());
    this.back.anchor.set(0.5);
    this.back.setSize(width, height);

    this.face = new Sprite();
    this.face.anchor.set(0.5);
    this.face.setSize(width, height);
    this.face.visible = false;

    this.addChild(this.shadow, this.back, this.face);
  }

  get isFaceUp(): boolean {
    return this.faceUp;
  }

  get cardData(): Card | null {
    return this.card;
  }

  /** Assigns the card and whether it starts face up. */
  setCard(card: Card, faceUp: boolean): void {
    this.card = card;
    this.face.texture = this.textures.cardFace(card);
    this.face.setSize(CARD_LAYOUT.width, CARD_LAYOUT.height);
    this.setFaceUp(faceUp);
  }

  setFaceUp(faceUp: boolean): void {
    this.faceUp = faceUp;
    this.face.visible = faceUp;
    this.back.visible = !faceUp;
  }

  /** Three-dimensional-looking flip driven by a horizontal squash. */
  flip(duration = TIMING.cardFlip): gsap.core.Timeline {
    this.killTween();
    const timeline = gsap.timeline();
    const targetFaceUp = !this.faceUp;

    timeline
      .to(this.scale, {
        x: 0,
        duration: duration / 2,
        ease: "power2.in",
        onComplete: () => this.setFaceUp(targetFaceUp),
      })
      .to(
        this,
        { y: this.y - 14, duration: duration / 2, ease: "power2.out" },
        0,
      )
      .to(this.scale, { x: 1, duration: duration / 2, ease: "power2.out" })
      .to(this, { y: this.y, duration: duration / 2, ease: "power2.in" }, "<");

    this.activeTween = timeline;
    return timeline;
  }

  /** Stops any running tween so pooling or a resize cannot leave it mid-flight. */
  killTween(): void {
    this.activeTween?.kill();
    this.activeTween = null;
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.scale);
  }

  trackTween(tween: gsap.core.Timeline | gsap.core.Tween): void {
    this.activeTween = tween;
  }

  reset(): void {
    this.killTween();
    this.card = null;
    this.faceUp = false;
    this.face.visible = false;
    this.back.visible = true;
    this.position.set(0, 0);
    this.scale.set(1);
    this.rotation = 0;
    this.alpha = 1;
    this.visible = true;
    this.shadow.alpha = 0.5;
  }
}
