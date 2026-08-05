import { BitmapText, Container, Graphics, Sprite } from 'pixi.js';
import { TextureFactory } from '../Game/TextureFactory';
import { AnimationManager } from '../Managers/AnimationManager';
import { FONT } from '../Game/Fonts';
import { PocketColor, RouletteNumber, Theme } from '../Types';
import { getNumberColor } from '../Game/Constants';

/**
 * The two pieces of result feedback: the **dolly** that a croupier stands on
 * the winning number, and the **banner** that announces it.
 *
 * Both are built once and reused every round - showing a result is a matter of
 * retargeting and replaying a timeline, never of constructing display objects
 * mid-round.
 *
 * They live in *different coordinate spaces*, which is why the banner is not a
 * child of this container: the dolly marks a cell and therefore belongs on the
 * felt (inheriting its scale, and its quarter-turn in portrait), while the
 * banner is screen furniture that must stay upright and centred whatever the
 * felt is doing. The scene parents `getBannerLayer()` into the HUD layer.
 */
export class WinningMarker extends Container {
  private readonly dolly: Sprite;
  private readonly banner: Container;
  private readonly bannerBackground: Graphics;
  private readonly bannerGlow: Sprite;
  private readonly numberText: BitmapText;
  private readonly colorText: BitmapText;

  private currentNumber: RouletteNumber = 0;
  private scaleUnit = 1;

  public constructor(
    textures: TextureFactory,
    private readonly animations: AnimationManager,
    private theme: Theme,
  ) {
    super();

    /* ----- Dolly ----- */
    this.dolly = new Sprite(textures.getMarkerTexture());
    this.dolly.anchor.set(0.5, 0.9);
    this.dolly.visible = false;
    this.addChild(this.dolly);

    /* ----- Banner ----- */
    this.banner = new Container();
    this.banner.visible = false;
    this.banner.alpha = 0;

    this.bannerGlow = new Sprite(textures.getGlowTexture());
    this.bannerGlow.anchor.set(0.5);
    this.bannerGlow.blendMode = 'add';
    this.bannerGlow.alpha = 0.55;

    this.bannerBackground = new Graphics();

    this.numberText = new BitmapText({
      text: '0',
      style: { fontFamily: FONT.DISPLAY, fontSize: 96, fill: 0xffffff },
    });
    this.numberText.anchor.set(0.5);

    this.colorText = new BitmapText({
      text: '',
      style: { fontFamily: FONT.UI, fontSize: 28, fill: 0xffffff },
    });
    this.colorText.anchor.set(0.5);

    this.banner.addChild(this.bannerGlow, this.bannerBackground, this.numberText, this.colorText);
    // Deliberately NOT added to `this` - see the class comment.
  }

  /**
   * The banner's display object, for the scene to parent into a screen-space
   * layer. Its lifetime is still owned here.
   */
  public getBannerLayer(): Container {
    return this.banner;
  }

  public setTheme(theme: Theme): void {
    this.theme = theme;
    this.drawBanner();
  }

  /**
   * Scale both elements to the current layout.
   * @param unit reference size in pixels - typically the board's cell size.
   */
  public setScale(unit: number): void {
    this.scaleUnit = unit;

    // A real dolly is about as tall as a number cell is wide; much bigger and
    // it stops reading as a marker and starts hiding the result it marks.
    const dollyHeight = unit * 1.15;
    const source = this.dolly.texture.height || 1;
    this.dolly.scale.set(dollyHeight / source);

    this.numberText.style.fontSize = unit * 2.05;
    this.colorText.style.fontSize = unit * 0.55;
    this.drawBanner();
  }

  /* --------------------------------------------------------------------- */
  /* Dolly                                                                 */
  /* --------------------------------------------------------------------- */

  /**
   * Drop the dolly onto the winning cell.
   *
   * It falls in from above with a slight overshoot - the same gesture a dealer
   * makes, and far more legible than a fade.
   */
  public showDolly(x: number, y: number, number: RouletteNumber): void {
    this.currentNumber = number;
    this.dolly.tint = this.tintFor(number);
    this.dolly.position.set(x, y + this.scaleUnit * 0.22);
    this.dolly.visible = true;
    this.dolly.alpha = 1;

    const timeline = this.animations.timeline();
    timeline.fromTo(
      this.dolly,
      { y: y - this.scaleUnit * 3.2, alpha: 0 },
      {
        y: y + this.scaleUnit * 0.22,
        alpha: 1,
        duration: 0.42,
        ease: 'bounce.out',
      },
    );
    timeline.fromTo(
      this.dolly.scale,
      { x: this.dolly.scale.x * 1.35, y: this.dolly.scale.y * 0.7 },
      {
        x: this.dolly.scale.x,
        y: this.dolly.scale.y,
        duration: 0.34,
        ease: 'elastic.out(1, 0.6)',
      },
      0.2,
    );
  }

  public hideDolly(): void {
    if (!this.dolly.visible) return;
    this.animations.to(this.dolly, {
      alpha: 0,
      duration: 0.28,
      onComplete: () => {
        this.dolly.visible = false;
      },
    });
  }

  /* --------------------------------------------------------------------- */
  /* Banner                                                                */
  /* --------------------------------------------------------------------- */

  /** Announce the number at a position, holding until `hideBanner()`. */
  public showBanner(x: number, y: number, number: RouletteNumber, colorLabel: string): void {
    this.currentNumber = number;
    this.numberText.text = String(number);
    this.colorText.text = colorLabel.toUpperCase();
    this.drawBanner();

    this.banner.position.set(x, y);
    this.banner.visible = true;

    const timeline = this.animations.timeline();
    timeline.fromTo(
      this.banner,
      { alpha: 0 },
      { alpha: 1, duration: 0.26, ease: AnimationManager.EASE_UI_IN },
    );
    timeline.fromTo(
      this.banner.scale,
      { x: 0.55, y: 0.55 },
      { x: 1, y: 1, duration: 0.5, ease: 'back.out(2)' },
      0,
    );
    // The glow keeps breathing for as long as the banner is up.
    timeline.to(
      this.bannerGlow.scale,
      { x: 1.18, y: 1.18, duration: 0.9, repeat: -1, yoyo: true, ease: 'sine.inOut' },
      0.3,
    );
  }

  public hideBanner(): void {
    if (!this.banner.visible) return;
    this.animations.killTweensOf(this.bannerGlow.scale);

    this.animations.to(this.banner, {
      alpha: 0,
      duration: 0.3,
      ease: AnimationManager.EASE_UI_OUT,
      onComplete: () => {
        this.banner.visible = false;
        this.bannerGlow.scale.set(1);
      },
    });
  }

  private drawBanner(): void {
    const unit = this.scaleUnit;
    const width = unit * 5.6;
    const height = unit * 3.6;

    this.bannerBackground.clear();
    this.bannerBackground
      .roundRect(-width / 2, -height / 2, width, height, unit * 0.4)
      .fill({ color: this.theme.panel, alpha: 0.94 })
      .stroke({ width: Math.max(2, unit * 0.09), color: this.tintFor(this.currentNumber) });

    this.bannerGlow.width = width * 1.7;
    this.bannerGlow.height = height * 2.1;
    this.bannerGlow.tint = this.tintFor(this.currentNumber);

    this.numberText.position.set(0, -unit * 0.32);
    this.numberText.tint = this.theme.text;
    this.colorText.position.set(0, unit * 1.24);
    this.colorText.tint = this.tintFor(this.currentNumber);
  }

  private tintFor(number: RouletteNumber): number {
    const color = getNumberColor(number);
    if (color === PocketColor.RED) return this.theme.red;
    if (color === PocketColor.GREEN) return this.theme.green;
    // Pure black would vanish against the panel - use the gold furniture colour
    // so a black result still reads as a deliberate highlight.
    return this.theme.gold;
  }

  /** Stop every tween this object owns. Safe on already-destroyed children. */
  private killTweens(): void {
    this.animations.killTweensOf(this.dolly);
    this.animations.killTweensOf(this.dolly.scale);
    this.animations.killTweensOf(this.banner);
    this.animations.killTweensOf(this.banner.scale);
    this.animations.killTweensOf(this.bannerGlow.scale);
  }

  /** Clear both elements ready for the next round. */
  public reset(): void {
    this.killTweens();
    if (this.destroyed) return;

    this.dolly.visible = false;

    // The banner lives under a different parent, so it can already have been
    // torn down by the time this runs - teardown order between the felt and the
    // HUD layer is not something this object gets to dictate.
    if (this.banner.destroyed) return;
    this.banner.visible = false;
    this.banner.alpha = 0;
    this.banner.scale.set(1);
    this.bannerGlow.scale.set(1);
  }

  public override destroy(): void {
    this.killTweens();
    // Destroy the banner only if its own parent has not already done so.
    if (!this.banner.destroyed) this.banner.destroy({ children: true, texture: false });
    super.destroy({ children: true, texture: false });
  }
}
