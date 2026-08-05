import { Container, Sprite, Texture } from 'pixi.js';

/**
 * A single chip sprite.
 *
 * Chips are the highest-count object on the table (a busy layout carries 100+
 * across 30 stacks), so the implementation is deliberately thin: one `Sprite`
 * over a *shared, pre-baked* texture per denomination. No `Graphics`, no text
 * object, nothing re-rendered per frame.
 *
 * Instances are never constructed during play - {@link ChipManager} pools them.
 * `reset()` returns an instance to a known state so a recycled chip cannot
 * inherit a half-finished tween's alpha or rotation from its previous life.
 */
export class Chip extends Container {
  private readonly sprite: Sprite;

  /** Denomination this chip currently represents. */
  public value = 0;
  /** Spot the chip is resting on, or `undefined` while it is in flight. */
  public spotId?: string;
  /** Index within its stack - drives the vertical offset. */
  public stackIndex = 0;

  public constructor(texture: Texture) {
    super();
    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.addChild(this.sprite);
  }

  /** Re-arm a pooled chip for use. */
  public configure(texture: Texture, value: number, size: number): void {
    this.sprite.texture = texture;
    this.value = value;
    this.setDiameter(size);
  }

  /**
   * Scale to a target on-screen diameter.
   *
   * The texture is baked at a fixed high resolution and scaled down here, so
   * the same texture serves a 4K desktop and a phone without a re-bake on every
   * resize - and stays crisp because it is only ever minified.
   */
  public setDiameter(diameter: number): void {
    const source = this.sprite.texture.width || 1;
    const scale = diameter / source;
    this.sprite.scale.set(scale);
  }

  /** Clean state for the pool. */
  public reset(): void {
    this.value = 0;
    this.spotId = undefined;
    this.stackIndex = 0;
    this.position.set(0, 0);
    this.scale.set(1);
    this.alpha = 1;
    this.rotation = 0;
    this.visible = true;
    this.sprite.tint = 0xffffff;
  }

  /** Dim a chip that is about to be swept as a loser. */
  public setTint(tint: number): void {
    this.sprite.tint = tint;
  }
}
