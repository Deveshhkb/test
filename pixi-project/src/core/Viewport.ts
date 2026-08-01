import { Container, Sprite, type Texture } from "pixi.js";
import { ResponsiveContainer } from "./ResponsiveContainer";
import type { LayoutContext } from "./LayoutManager";
import { Rect, coverScale, fitScale } from "./geom";

/**
 * A fixed design-space world that is uniformly scaled into a target region.
 *
 * Children are authored once against `designWidth x designHeight` and never
 * need resize code of their own: the whole world is scaled by a single factor
 * (identical on X and Y), so graphics keep their aspect ratio on every device.
 */
export class Viewport extends ResponsiveContainer {
  /** Add game objects here, in design-space coordinates. */
  readonly world = new Container();

  private currentScale = 1;
  private region = new Rect();
  private center = { x: 0, y: 0 };

  constructor(
    readonly designWidth: number,
    readonly designHeight: number,
    private readonly regionFor: (ctx: LayoutContext) => Rect,
    /**
     * Where the fitted world sits inside its region, 0..1 on each axis.
     * Defaults to centred; portrait layouts pull it towards the top so the
     * board sits directly under the status bar instead of floating.
     */
    private readonly alignFor: (ctx: LayoutContext) => {
      x: number;
      y: number;
    } = () => ({ x: 0.5, y: 0.5 }),
  ) {
    super();
    this.layoutOrder = -10; // world settles before the UI that references it
    this.addChild(this.world);
    this.world.pivot.set(designWidth / 2, designHeight / 2);
  }

  /** Uniform scale currently applied to the world. */
  get worldScale(): number {
    return this.currentScale;
  }

  /** The region the world is fitted into, in stage pixels. */
  get bounds(): Rect {
    return this.region;
  }

  /** Convert design-space coordinates into stage coordinates. */
  toStage(x: number, y: number): { x: number; y: number } {
    return {
      x: this.center.x + (x - this.designWidth / 2) * this.currentScale,
      y: this.center.y + (y - this.designHeight / 2) * this.currentScale,
    };
  }

  protected onLayout(ctx: LayoutContext): void {
    const region = this.regionFor(ctx);
    this.region = region;

    // `fit` (never `fill`) is what guarantees no stretching and no cropping of
    // gameplay content; the background layer behind it covers any spare space
    // so the fit never shows up as a black border.
    const scale = fitScale(
      this.designWidth,
      this.designHeight,
      region.width,
      region.height,
    );
    this.currentScale = scale;
    this.world.scale.set(scale);

    // Position the world's centre so the fitted box lands at the requested
    // alignment inside the region; the pivot is already the world's centre.
    const align = this.alignFor(ctx);
    const half = {
      x: (this.designWidth * scale) / 2,
      y: (this.designHeight * scale) / 2,
    };
    this.center = {
      x: region.x + half.x + (region.width - half.x * 2) * align.x,
      y: region.y + half.y + (region.height - half.y * 2) * align.y,
    };
    this.world.position.set(this.center.x, this.center.y);
  }
}

/**
 * Full-bleed background. Scaled with `cover` and centred, so it always fills
 * the window edge to edge — no letterbox bars — while keeping its aspect ratio.
 */
export class ResponsiveBackground extends ResponsiveContainer {
  private readonly sprite: Sprite;

  constructor(texture: Texture) {
    super();
    this.layoutOrder = -100;
    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.addChild(this.sprite);
  }

  protected onLayout(ctx: LayoutContext): void {
    const { width, height } = this.sprite.texture;
    const scale = coverScale(width, height, ctx.width, ctx.height);
    this.sprite.scale.set(scale);
    this.sprite.position.set(ctx.width / 2, ctx.height / 2);
  }
}
