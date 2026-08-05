import { BlurFilter, Container, Sprite } from 'pixi.js';
import { TextureFactory } from '../Game/TextureFactory';
import { WHEEL_GEOMETRY } from '../Game/Constants';
import { Pocket, PocketColor, Theme, WheelType } from '../Types';
import { TAU } from '../Utilities/Math';

/**
 * The roulette wheel as a display object.
 *
 * Composition mirrors the real thing: a **static bowl** (rim, ball track,
 * deflectors) and a **rotating head** (pockets, frets, turret). Only the head
 * carries a rotation, so a spin is a single sprite transform - not a re-tesselated
 * 37-wedge `Graphics` per frame.
 *
 * The object is passive: it renders whatever angle it is told to. All physics
 * live in {@link WheelManager}, which keeps the "how it looks" and "how it
 * moves" concerns separable and independently testable.
 */
export class Wheel extends Container {
  private readonly bowl: Sprite;
  private readonly head: Sprite;
  private readonly pocketGlow: Sprite;
  private readonly rimGlow: Sprite;
  /** Blur applied to the head to fake motion blur at speed. */
  private readonly motionBlur: BlurFilter;

  /** Wheel radius in screen pixels. */
  private radius = 200;

  public constructor(
    textures: TextureFactory,
    private readonly pockets: readonly Pocket[],
    private readonly wheelType: WheelType,
    theme: Theme,
  ) {
    super();

    // A glow underneath the whole wheel gives it presence against the felt.
    this.rimGlow = new Sprite(textures.getGlowTexture());
    this.rimGlow.anchor.set(0.5);
    this.rimGlow.tint = theme.gold;
    this.rimGlow.alpha = 0.16;
    this.addChild(this.rimGlow);

    this.bowl = new Sprite(
      textures.getWheelBowlTexture({
        bowlOuter: WHEEL_GEOMETRY.BOWL_OUTER,
        bowlInner: WHEEL_GEOMETRY.BOWL_INNER,
        ballTrack: WHEEL_GEOMETRY.BALL_TRACK,
        deflector: WHEEL_GEOMETRY.DEFLECTOR,
        deflectorCount: WHEEL_GEOMETRY.DEFLECTOR_COUNT,
      }),
    );
    this.bowl.anchor.set(0.5);
    this.addChild(this.bowl);

    this.head = new Sprite(
      textures.getWheelHeadTexture(
        pockets.map((pocket) => pocket.value),
        (value) => this.pockets.find((p) => p.value === value)?.color ?? PocketColor.GREEN,
        {
          headOuter: WHEEL_GEOMETRY.HEAD_OUTER,
          pocket: WHEEL_GEOMETRY.POCKET,
          pocketInner: WHEEL_GEOMETRY.POCKET_INNER,
          coneOuter: WHEEL_GEOMETRY.CONE_OUTER,
          coneInner: WHEEL_GEOMETRY.CONE_INNER,
        },
      ),
    );
    this.head.anchor.set(0.5);
    this.addChild(this.head);

    this.motionBlur = new BlurFilter({ strength: 0, quality: 2 });
    // Filters are only attached while actually blurring - an active filter costs
    // a render-target switch every frame even at strength 0.
    this.head.filters = [];

    // Highlight that sits over the winning pocket once the ball settles.
    this.pocketGlow = new Sprite(textures.getGlowTexture());
    this.pocketGlow.anchor.set(0.5);
    this.pocketGlow.alpha = 0;
    this.pocketGlow.blendMode = 'add';
    this.addChild(this.pocketGlow);
  }

  public getWheelType(): WheelType {
    return this.wheelType;
  }

  /* --------------------------------------------------------------------- */
  /* Layout                                                                */
  /* --------------------------------------------------------------------- */

  /** Resize to a target radius in screen pixels. */
  public setRadius(radius: number): void {
    this.radius = radius;
    const diameter = radius * 2;

    this.scaleSpriteTo(this.bowl, diameter);
    this.scaleSpriteTo(this.head, diameter);
    this.rimGlow.width = diameter * 1.55;
    this.rimGlow.height = diameter * 1.55;
    this.pocketGlow.width = diameter * 0.42;
    this.pocketGlow.height = diameter * 0.42;
  }

  public getRadius(): number {
    return this.radius;
  }

  private scaleSpriteTo(sprite: Sprite, diameter: number): void {
    const source = sprite.texture.width || 1;
    sprite.scale.set(diameter / source);
  }

  /* --------------------------------------------------------------------- */
  /* Motion                                                                */
  /* --------------------------------------------------------------------- */

  /**
   * Set the head's rotation.
   *
   * `angle` is measured clockwise from 12 o'clock, which is also Pixi's
   * rotation convention once the texture is baked with pocket 0 at the top.
   */
  public setRotation(angle: number): void {
    this.head.rotation = angle;
  }

  public getRotation(): number {
    return this.head.rotation;
  }

  /**
   * Fake motion blur proportional to angular speed.
   *
   * The filter is attached and detached rather than left at strength 0, and the
   * strength is quantised to whole pixels so a slowly-changing speed does not
   * invalidate the filter's cache every single frame.
   */
  public setMotionBlur(revolutionsPerSecond: number): void {
    const strength = Math.min(6, Math.max(0, (Math.abs(revolutionsPerSecond) - 0.4) * 5));
    const quantised = Math.round(strength);

    if (quantised <= 0) {
      if (this.head.filters.length > 0) this.head.filters = [];
      return;
    }
    if (this.head.filters.length === 0) this.head.filters = [this.motionBlur];
    if (this.motionBlur.strength !== quantised) this.motionBlur.strength = quantised;
  }

  /* --------------------------------------------------------------------- */
  /* Winning pocket highlight                                              */
  /* --------------------------------------------------------------------- */

  /**
   * Park the glow over a pocket. The glow is a child of the wheel container
   * (not the head), so it is repositioned each frame by the manager as the head
   * turns underneath it - that keeps it perfectly registered without inheriting
   * the head's rotation, which would spin the glow's own texture.
   */
  public positionPocketGlow(screenAngle: number): void {
    const distance = this.radius * WHEEL_GEOMETRY.POCKET;
    this.pocketGlow.position.set(
      Math.sin(screenAngle) * distance,
      -Math.cos(screenAngle) * distance,
    );
  }

  public setPocketGlow(alpha: number, tint: number): void {
    this.pocketGlow.alpha = alpha;
    this.pocketGlow.tint = tint;
  }

  public getPocketGlow(): Sprite {
    return this.pocketGlow;
  }

  public getRimGlow(): Sprite {
    return this.rimGlow;
  }

  /* --------------------------------------------------------------------- */
  /* Pocket geometry                                                       */
  /* --------------------------------------------------------------------- */

  public getPockets(): readonly Pocket[] {
    return this.pockets;
  }

  /** Angular width of one pocket. */
  public getPocketStep(): number {
    return TAU / this.pockets.length;
  }

  public findPocket(value: number | '00'): Pocket | undefined {
    return this.pockets.find((pocket) => pocket.value === value);
  }

  public override destroy(): void {
    this.head.filters = [];
    this.motionBlur.destroy();
    // Textures belong to the factory, so `texture: false` here is deliberate -
    // destroying them would break every other object sharing the same bake.
    super.destroy({ children: true, texture: false });
  }
}
