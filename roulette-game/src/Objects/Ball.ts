import { Container, Sprite } from 'pixi.js';
import { TextureFactory } from '../Game/TextureFactory';
import { WHEEL_GEOMETRY } from '../Game/Constants';

/**
 * The ivory ball.
 *
 * Position is expressed in **polar** coordinates relative to the wheel centre -
 * an angle measured clockwise from 12 o'clock and a radius as a fraction of the
 * wheel radius. That is the natural coordinate system for the physics, and it
 * means the ball needs no re-derivation when the wheel is resized.
 *
 * A short motion trail is drawn as a handful of pooled, fading sprites. It is
 * the cheapest convincing way to communicate speed on the rim; a shader-based
 * trail would cost a render target for an effect visible for four seconds a
 * round.
 */
export class Ball extends Container {
  private readonly sprite: Sprite;
  private readonly trail: Sprite[] = [];
  /** Ring buffer of past positions feeding the trail. */
  private readonly history: Array<{ x: number; y: number }> = [];
  private historyIndex = 0;

  private static readonly TRAIL_LENGTH = 6;
  /** Frames between trail samples - every frame is far too dense at 60fps. */
  private static readonly TRAIL_STRIDE = 2;
  private frameCounter = 0;

  /** Wheel radius in screen pixels, used to convert polar to cartesian. */
  private wheelRadius = 200;
  /** Named `polarAngle` rather than `angle`: `Container.angle` already means
   *  rotation in degrees, and shadowing it would be a trap for every caller. */
  private polarAngle = 0;
  private radiusFraction: number = WHEEL_GEOMETRY.BALL_TRACK;
  private trailEnabled = false;

  public constructor(textures: TextureFactory) {
    super();

    // Trail first so it renders underneath the ball itself.
    for (let i = 0; i < Ball.TRAIL_LENGTH; i += 1) {
      const segment = new Sprite(textures.getBallTexture());
      segment.anchor.set(0.5);
      segment.alpha = 0;
      segment.blendMode = 'add';
      this.trail.push(segment);
      this.addChild(segment);
      this.history.push({ x: 0, y: 0 });
    }

    this.sprite = new Sprite(textures.getBallTexture());
    this.sprite.anchor.set(0.5);
    this.addChild(this.sprite);
  }

  /* --------------------------------------------------------------------- */
  /* Layout                                                                */
  /* --------------------------------------------------------------------- */

  public setWheelRadius(radius: number): void {
    this.wheelRadius = radius;
    const diameter = radius * WHEEL_GEOMETRY.BALL * 2;
    const source = this.sprite.texture.width || 1;
    const scale = diameter / source;

    this.sprite.scale.set(scale);
    // Trail segments taper toward the tail.
    this.trail.forEach((segment, index) => {
      const taper = 1 - (index / Ball.TRAIL_LENGTH) * 0.55;
      segment.scale.set(scale * taper);
    });
    this.applyPosition();
  }

  /* --------------------------------------------------------------------- */
  /* Motion                                                                */
  /* --------------------------------------------------------------------- */

  /**
   * Place the ball. `angle` is clockwise from 12 o'clock; `radiusFraction` is
   * a fraction of the wheel radius (`BALL_TRACK` on the rim, `POCKET` at rest).
   */
  public setPolar(angle: number, radiusFraction: number): void {
    this.polarAngle = angle;
    this.radiusFraction = radiusFraction;
    this.applyPosition();
  }

  public getAngle(): number {
    return this.polarAngle;
  }

  public getRadiusFraction(): number {
    return this.radiusFraction;
  }

  /**
   * Spin the ball about its own centre.
   *
   * A roulette ball rolls, it does not slide, and the artwork carries a
   * specular highlight - so rotating the sprite is what turns a dot sliding
   * round a circle into a ball travelling round a track. Cheap, and it is the
   * single detail that most improves how the rim phase reads.
   */
  public setRoll(rotation: number): void {
    this.sprite.rotation = rotation;
  }

  private applyPosition(): void {
    const distance = this.wheelRadius * this.radiusFraction;
    // Screen space: +x right, +y down. Angle 0 must point up.
    this.sprite.position.set(
      Math.sin(this.polarAngle) * distance,
      -Math.cos(this.polarAngle) * distance,
    );
  }

  /* --------------------------------------------------------------------- */
  /* Trail                                                                 */
  /* --------------------------------------------------------------------- */

  public setTrailEnabled(enabled: boolean): void {
    this.trailEnabled = enabled;
    if (enabled) return;

    for (const segment of this.trail) segment.alpha = 0;
    this.historyIndex = 0;
    this.frameCounter = 0;
  }

  /**
   * Advance the trail. Called once per frame from the manager's ticker
   * callback; allocates nothing.
   */
  public updateTrail(intensity: number): void {
    if (!this.trailEnabled || intensity <= 0.02) {
      if (this.trail[0]?.alpha > 0) for (const segment of this.trail) segment.alpha *= 0.85;
      return;
    }

    this.frameCounter += 1;
    if (this.frameCounter % Ball.TRAIL_STRIDE === 0) {
      const slot = this.history[this.historyIndex];
      slot.x = this.sprite.position.x;
      slot.y = this.sprite.position.y;
      this.historyIndex = (this.historyIndex + 1) % Ball.TRAIL_LENGTH;
    }

    // Walk the ring buffer backwards so segment 0 is the most recent sample.
    for (let i = 0; i < Ball.TRAIL_LENGTH; i += 1) {
      const sampleIndex = (this.historyIndex - 1 - i + Ball.TRAIL_LENGTH * 2) % Ball.TRAIL_LENGTH;
      const sample = this.history[sampleIndex];
      const segment = this.trail[i];
      segment.position.set(sample.x, sample.y);
      segment.alpha = (1 - i / Ball.TRAIL_LENGTH) * 0.32 * intensity;
    }
  }

  /* --------------------------------------------------------------------- */
  /* Visibility                                                            */
  /* --------------------------------------------------------------------- */

  public show(): void {
    this.visible = true;
    this.sprite.alpha = 1;
  }

  public hide(): void {
    this.visible = false;
    this.setTrailEnabled(false);
  }

  public getSprite(): Sprite {
    return this.sprite;
  }

  public override destroy(): void {
    super.destroy({ children: true, texture: false });
  }
}
