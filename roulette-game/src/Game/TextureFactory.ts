import { Container, Graphics, Rectangle, Renderer, Sprite, Text, Texture } from 'pixi.js';
import { ChipDenomination, PocketColor, Theme } from '../Types';
import { TAU } from '../Utilities/Math';
import { ASSET_ALIASES, AssetLoader } from './AssetLoader';
import { WHEEL_GEOMETRY } from './Constants';

/**
 * Procedural texture bakery.
 *
 * Everything the game draws - chips, the wheel head, the bowl, the ball, glows
 * and markers - is authored here as vector `Graphics`, rendered *once* into a
 * GPU texture, and thereafter used as a plain `Sprite`.
 *
 * Why bake instead of drawing `Graphics` directly:
 * - A `Graphics` object is re-tessellated whenever its geometry is dirtied. A
 *   37-pocket wheel with numbers is thousands of triangles; rotating a baked
 *   sprite is one quad.
 * - Baked textures are trivially poolable and tintable.
 * - It gives the same draw-call profile as a texture atlas without shipping
 *   one, and swapping in real atlas art later is a change to this file alone
 *   (see docs/ASSETS.md).
 *
 * Textures are cached by key and are the factory's property: `destroy()`
 * releases every GPU resource it created, which is what makes repeated
 * React mount/unmount cycles leak-free.
 */
export class TextureFactory {
  private readonly cache = new Map<string, Texture>();

  /** Chip art is baked at this pixel diameter and scaled down at use sites. */
  private static readonly CHIP_BAKE_SIZE = 128;
  /** Wheel art is baked at this pixel diameter. */
  private static readonly WHEEL_BAKE_SIZE = 1024;

  /**
   * Optional source of operator artwork.
   *
   * When set, art wins over the procedural bake for any piece it supplies.
   * This is the seam the whole class is built around: swapping the hand-drawn
   * wheel for photographic assets is a matter of dropping files into the
   * manifest, with no change to `Wheel`, `Ball` or the physics - they keep
   * asking for the same textures at the same proportions.
   */
  private assets?: AssetLoader;

  public constructor(
    private readonly renderer: Renderer,
    private theme: Theme,
  ) {}

  /**
   * Attach the loader.
   *
   * Must be called before any texture is requested, and deliberately does *not*
   * clear the cache: sprites built earlier in the boot (the loading spinner,
   * for one) hold references to cached textures, and destroying those out from
   * under them leaves a live sprite pointing at a released GPU resource.
   *
   * Attaching early costs nothing because `art()` is only consulted at bake
   * time - the loader can still be empty when this is called.
   */
  public setAssetLoader(assets: AssetLoader): void {
    this.assets = assets;
  }

  /** A loaded texture for `alias`, or `undefined` to fall back to drawing. */
  private art(alias: string): Texture | undefined {
    return this.assets?.getTexture(alias);
  }

  /**
   * Centre a sprite on the bake canvas at a given fraction of the wheel radius.
   * Aspect ratio is preserved from the source art.
   */
  private static placeCentred(
    parent: Container,
    texture: Texture,
    canvasSize: number,
    diameterFraction: number,
  ): Sprite {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);

    const target = canvasSize * diameterFraction;
    const scale = target / (texture.width || 1);
    sprite.scale.set(scale);
    sprite.position.set(canvasSize / 2, canvasSize / 2);

    parent.addChild(sprite);
    return sprite;
  }

  /**
   * Swap the palette. Every cached texture is released because they all carry
   * baked-in colour; the next request re-bakes against the new theme.
   */
  public setTheme(theme: Theme): void {
    this.theme = theme;
    this.clear();
  }

  public destroy(): void {
    this.clear();
  }

  private clear(): void {
    for (const texture of this.cache.values()) texture.destroy(true);
    this.cache.clear();
  }

  /**
   * Memoised bake.
   *
   * `size` pins the output to an exact square frame. Without it,
   * `generateTexture` crops to the drawn content's bounding box - so the wheel
   * head, whose art only reaches 68% of the authoring canvas, would bake to a
   * smaller texture than the bowl. Call sites scale by `texture.width`, so two
   * textures that are meant to be concentric would then be scaled by different
   * factors and the pocket ring would swell over the ball track.
   *
   * Pinning the frame keeps every wheel texture in one shared coordinate space,
   * which is what makes `WHEEL_GEOMETRY`'s radius fractions mean the same thing
   * in the bake as they do in the physics.
   */
  private bake(key: string, build: () => Container, size?: number, resolution = 1): Texture {
    const cached = this.cache.get(key);
    if (cached) return cached;

    const source = build();
    const texture = this.renderer.generateTexture({
      target: source,
      resolution,
      antialias: true,
      ...(size === undefined ? {} : { frame: new Rectangle(0, 0, size, size) }),
    });
    // The authoring container has served its purpose; its geometry would
    // otherwise sit in memory for the lifetime of the game.
    source.destroy({ children: true });

    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Stroke a standalone arc.
   *
   * `Graphics.arc()` continues the current path, so an arc issued after any
   * other drawing is joined to it by a straight line - which renders as a stray
   * streak shooting off across (and outside) the texture. Every specular
   * highlight in this file is an arc drawn after a stack of fills, so they all
   * need an explicit `moveTo` onto the arc's own start point first.
   */
  private static strokeArc(
    g: Graphics,
    cx: number,
    cy: number,
    radius: number,
    from: number,
    to: number,
    style: { width: number; color: number; alpha: number },
  ): void {
    g.moveTo(cx + Math.cos(from) * radius, cy + Math.sin(from) * radius)
      .arc(cx, cy, radius, from, to)
      .stroke({ ...style, cap: 'round' });
  }

  /* --------------------------------------------------------------------- */
  /* Chips                                                                 */
  /* --------------------------------------------------------------------- */

  /**
   * A casino chip: coloured body, six inset edge spots, a pale inner disc and
   * the denomination label.
   */
  public getChipTexture(denomination: ChipDenomination): Texture {
    return this.bake(`chip:${denomination.value}`, () => {
      const size = TextureFactory.CHIP_BAKE_SIZE;
      const radius = size / 2;
      const container = new Container();
      const body = new Graphics();

      // Drop shadow, offset down so stacked chips read as physical objects.
      body.circle(radius, radius + 3, radius - 3).fill({ color: 0x000000, alpha: 0.35 });

      // Main body with a darker rim.
      body.circle(radius, radius, radius - 3).fill({ color: denomination.color });
      body
        .circle(radius, radius, radius - 3)
        .stroke({ width: 3, color: denomination.accent, alignment: 0.5 });

      // Six edge spots - the detail that makes a disc read as a casino chip.
      const spotCount = 6;
      const spotRadius = radius * 0.17;
      const spotOrbit = radius * 0.78;
      for (let i = 0; i < spotCount; i += 1) {
        const angle = (i / spotCount) * TAU;
        body
          .circle(
            radius + Math.cos(angle) * spotOrbit,
            radius + Math.sin(angle) * spotOrbit,
            spotRadius,
          )
          .fill({ color: 0xffffff, alpha: 0.92 });
      }

      // Inner disc where the value is printed.
      body.circle(radius, radius, radius * 0.6).fill({ color: denomination.accent, alpha: 0.55 });
      body.circle(radius, radius, radius * 0.56).fill({ color: denomination.color });
      body
        .circle(radius, radius, radius * 0.56)
        .stroke({ width: 2, color: 0xffffff, alpha: 0.45 });

      // Specular sweep across the top-left, sold as a clipped arc.
      TextureFactory.strokeArc(body, radius, radius, radius * 0.82, Math.PI * 1.05, Math.PI * 1.55, {
        width: radius * 0.14,
        color: 0xffffff,
        alpha: 0.14,
      });

      container.addChild(body);

      const label = new Text({
        text: denomination.label,
        style: {
          fontFamily: 'Arial, sans-serif',
          fontSize: denomination.label.length > 3 ? 26 : 32,
          fontWeight: '900',
          fill: 0xffffff,
          stroke: { color: 0x000000, width: 3, join: 'round' },
        },
      });
      label.anchor.set(0.5);
      label.position.set(radius, radius);
      container.addChild(label);

      return container;
    }, TextureFactory.CHIP_BAKE_SIZE);
  }

  /* --------------------------------------------------------------------- */
  /* Wheel                                                                 */
  /* --------------------------------------------------------------------- */

  /**
   * The static bowl: outer wood rim, the polished ball track and the eight
   * deflector diamonds. This never rotates, so it is a separate texture from
   * the head - rotating only the head is both correct and cheaper.
   */
  public getWheelBowlTexture(geometry: {
    bowlOuter: number;
    bowlInner: number;
    ballTrack: number;
    deflector: number;
    deflectorCount: number;
  }): Texture {
    return this.bake('wheel:bowl', () => {
      const size = TextureFactory.WHEEL_BAKE_SIZE;
      const r = size / 2;

      // Artwork path: the rim sprite already carries the wood, the ball track
      // and the deflectors, so it is simply centred at full diameter.
      const rim = this.art(ASSET_ALIASES.WHEEL_RIM);
      if (rim) {
        const container = new Container();
        TextureFactory.placeCentred(container, rim, size, geometry.bowlOuter);
        return container;
      }

      const g = new Graphics();

      // Wooden outer rim, built from concentric rings so it reads as turned wood.
      g.circle(r, r, r * geometry.bowlOuter).fill({ color: this.theme.woodDark });
      g.circle(r, r, r * geometry.bowlOuter * 0.985).fill({ color: this.theme.wood });
      g.circle(r, r, r * geometry.bowlOuter * 0.94).fill({ color: this.theme.woodDark });
      g.circle(r, r, r * geometry.bowlInner).fill({ color: this.theme.wood });

      // Gold trim between wood and track.
      g.circle(r, r, r * geometry.bowlInner)
        .stroke({ width: size * 0.006, color: this.theme.gold, alpha: 0.85 });

      // The ball track: a darker, polished basin.
      g.circle(r, r, r * geometry.ballTrack).fill({ color: 0x1a120c });
      g.circle(r, r, r * geometry.ballTrack)
        .stroke({ width: size * 0.004, color: this.theme.goldDark, alpha: 0.7 });

      // Inner apron sloping down to the deflectors.
      g.circle(r, r, r * geometry.deflector).fill({ color: 0x241811 });

      // Highlight arc on the track - a single specular sweep is enough to sell
      // the polish without a real lighting model.
      TextureFactory.strokeArc(
        g,
        r,
        r,
        r * (geometry.ballTrack + geometry.deflector) * 0.5,
        Math.PI * 1.1,
        Math.PI * 1.7,
        { width: size * 0.02, color: 0xffffff, alpha: 0.06 },
      );

      // Deflector diamonds, alternating orientation like a real bowl.
      const diamond = r * 0.045;
      for (let i = 0; i < geometry.deflectorCount; i += 1) {
        const angle = (i / geometry.deflectorCount) * TAU;
        const cx = r + Math.cos(angle) * r * geometry.deflector * 1.02;
        const cy = r + Math.sin(angle) * r * geometry.deflector * 1.02;
        const stretch = i % 2 === 0 ? 1.5 : 1;

        g.moveTo(cx, cy - diamond * stretch)
          .lineTo(cx + diamond, cy)
          .lineTo(cx, cy + diamond * stretch)
          .lineTo(cx - diamond, cy)
          .closePath()
          .fill({ color: this.theme.metal })
          .stroke({ width: 2, color: 0x000000, alpha: 0.4 });
      }

      return g;
    }, TextureFactory.WHEEL_BAKE_SIZE);
  }

  /**
   * The rotating wheel head: the pocket ring with every number, the frets
   * between pockets, and the central turret.
   *
   * `order` is the physical pocket sequence; index 0 sits at 12 o'clock and the
   * sequence runs clockwise, matching {@link WheelManager}'s angle maths.
   */
  public getWheelHeadTexture(
    order: readonly (number | '00')[],
    colorOf: (value: number | '00') => PocketColor,
    geometry: {
      headOuter: number;
      pocket: number;
      pocketInner: number;
      coneOuter: number;
      coneInner: number;
    },
  ): Texture {
    return this.bake(`wheel:head:${order.length}`, () => {
      const size = TextureFactory.WHEEL_BAKE_SIZE;
      const r = size / 2;

      // Artwork path: the pocket ring is printed with its numbers already in
      // the physical wheel order, zero at twelve o'clock running clockwise -
      // the same convention `WheelManager` resolves pocket angles in, so the
      // ball lands dead centre of the printed pocket with no offset fudge.
      const pockets = this.art(ASSET_ALIASES.WHEEL_POCKETS);
      if (pockets) {
        const composite = new Container();
        TextureFactory.placeCentred(composite, pockets, size, geometry.headOuter);

        const cone = this.art(ASSET_ALIASES.WHEEL_CONE);
        if (cone) TextureFactory.placeCentred(composite, cone, size, WHEEL_GEOMETRY.CONE_OUTER);

        const spindle = this.art(ASSET_ALIASES.WHEEL_SPINDLE);
        if (spindle) {
          TextureFactory.placeCentred(composite, spindle, size, WHEEL_GEOMETRY.SPINDLE);
        }
        return composite;
      }

      const container = new Container();
      const g = new Graphics();
      const count = order.length;
      const step = TAU / count;

      // Outer ring of the head.
      g.circle(r, r, r * geometry.headOuter).fill({ color: 0x2a1c12 });
      g.circle(r, r, r * geometry.headOuter)
        .stroke({ width: size * 0.005, color: this.theme.gold, alpha: 0.8 });

      // Pocket wedges. Angles are offset by half a step so pocket *centres*
      // land on multiples of `step` - the same convention WheelManager uses to
      // resolve a winning index, so the ball always stops mid-pocket.
      for (let i = 0; i < count; i += 1) {
        const value = order[i];
        const color = colorOf(value);
        const fill =
          color === PocketColor.RED
            ? this.theme.red
            : color === PocketColor.BLACK
              ? this.theme.black
              : this.theme.green;

        // -PI/2 puts index 0 at 12 o'clock; Pixi's 0 radians is 3 o'clock.
        const start = i * step - step / 2 - Math.PI / 2;
        const end = start + step;

        g.moveTo(
          r + Math.cos(start) * r * geometry.pocketInner,
          r + Math.sin(start) * r * geometry.pocketInner,
        )
          .arc(r, r, r * geometry.pocketInner, start, end)
          .lineTo(
            r + Math.cos(end) * r * geometry.headOuter,
            r + Math.sin(end) * r * geometry.headOuter,
          )
          .arc(r, r, r * geometry.headOuter, end, start, true)
          .closePath()
          .fill({ color: fill });

        // Fret (the metal divider) on the leading edge of each pocket.
        g.moveTo(
          r + Math.cos(start) * r * geometry.pocketInner,
          r + Math.sin(start) * r * geometry.pocketInner,
        )
          .lineTo(
            r + Math.cos(start) * r * geometry.headOuter,
            r + Math.sin(start) * r * geometry.headOuter,
          )
          .stroke({ width: size * 0.004, color: this.theme.metal, alpha: 0.75 });
      }

      // Turret / cone in the middle.
      g.circle(r, r, r * geometry.coneOuter).fill({ color: 0x33220f });
      g.circle(r, r, r * geometry.coneOuter)
        .stroke({ width: size * 0.004, color: this.theme.gold, alpha: 0.7 });
      g.circle(r, r, r * geometry.coneOuter * 0.72).fill({ color: this.theme.wood });
      g.circle(r, r, r * geometry.coneOuter * 0.44).fill({ color: this.theme.goldDark });
      g.circle(r, r, r * geometry.coneInner).fill({ color: this.theme.gold });

      // Cone highlight.
      TextureFactory.strokeArc(
        g,
        r,
        r,
        r * geometry.coneOuter * 0.58,
        Math.PI * 1.15,
        Math.PI * 1.65,
        { width: size * 0.018, color: 0xffffff, alpha: 0.1 },
      );

      container.addChild(g);

      // Pocket numbers, each rotated to face outward.
      const textRadius = r * (geometry.pocket + geometry.headOuter) * 0.5;
      for (let i = 0; i < count; i += 1) {
        const angle = i * step - Math.PI / 2;
        const label = new Text({
          text: String(order[i]),
          style: {
            fontFamily: 'Arial, sans-serif',
            fontSize: size * 0.028,
            fontWeight: 'bold',
            fill: 0xffffff,
          },
        });
        label.anchor.set(0.5);
        label.position.set(r + Math.cos(angle) * textRadius, r + Math.sin(angle) * textRadius);
        // +PI/2 turns the glyph so its baseline is tangential, reading from the
        // rim inward exactly as it does on a real wheel.
        label.rotation = angle + Math.PI / 2;
        container.addChild(label);
      }

      return container;
    }, TextureFactory.WHEEL_BAKE_SIZE);
  }

  /** The ivory ball, with a specular dot. */
  public getBallTexture(): Texture {
    const art = this.art(ASSET_ALIASES.BALL);
    if (art) return art;

    return this.bake('ball', () => {
      const size = 64;
      const r = size / 2;
      const g = new Graphics();

      g.circle(r, r, r - 2).fill({ color: 0x000000, alpha: 0.3 });
      g.circle(r, r, r - 3).fill({ color: 0xf6f2e8 });
      g.circle(r * 0.72, r * 0.68, r * 0.28).fill({ color: 0xffffff, alpha: 0.85 });
      g.circle(r * 1.25, r * 1.3, r * 0.35).fill({ color: 0xbdb6a6, alpha: 0.5 });

      return g;
    }, 64);
  }

  /* --------------------------------------------------------------------- */
  /* Effects                                                               */
  /* --------------------------------------------------------------------- */

  /**
   * Radial glow used behind the winning number, the dolly and win banners.
   *
   * Built from concentric alpha rings rather than a blur filter: a filter costs
   * a render-target switch every frame it is active, while this is a static
   * texture that only ever gets tinted and scaled.
   */
  public getGlowTexture(): Texture {
    return this.bake('fx:glow', () => {
      const size = 256;
      const r = size / 2;
      const g = new Graphics();
      const rings = 32;

      for (let i = rings; i > 0; i -= 1) {
        const t = i / rings;
        // Quadratic falloff approximates a gaussian closely enough at this size.
        g.circle(r, r, r * t).fill({ color: 0xffffff, alpha: (1 - t) * (1 - t) * 0.28 });
      }
      return g;
    }, 256);
  }

  /** Soft-edged particle for payout sparkles and chip trails. */
  public getParticleTexture(): Texture {
    return this.bake('fx:particle', () => {
      const size = 32;
      const r = size / 2;
      const g = new Graphics();
      for (let i = 8; i > 0; i -= 1) {
        const t = i / 8;
        g.circle(r, r, r * t).fill({ color: 0xffffff, alpha: (1 - t) * 0.4 + 0.05 });
      }
      return g;
    }, 32);
  }

  /**
   * The dolly - the marker a croupier stands on the winning number.
   * Baked white so it can be tinted to the winning pocket's colour.
   */
  public getMarkerTexture(): Texture {
    return this.bake('fx:marker', () => {
      const size = 96;
      const r = size / 2;
      const g = new Graphics();

      g.ellipse(r, size * 0.86, r * 0.5, r * 0.16).fill({ color: 0x000000, alpha: 0.35 });
      // Tapered stack of discs - a dolly in silhouette.
      g.moveTo(r - size * 0.3, size * 0.82)
        .lineTo(r + size * 0.3, size * 0.82)
        .lineTo(r + size * 0.17, size * 0.2)
        .lineTo(r - size * 0.17, size * 0.2)
        .closePath()
        .fill({ color: 0xffffff });
      g.ellipse(r, size * 0.2, size * 0.17, size * 0.06).fill({ color: 0xffffff });
      g.circle(r, size * 0.12, size * 0.1).fill({ color: 0xffffff });
      g.moveTo(r - size * 0.3, size * 0.82)
        .lineTo(r + size * 0.3, size * 0.82)
        .lineTo(r + size * 0.17, size * 0.2)
        .lineTo(r - size * 0.17, size * 0.2)
        .closePath()
        .stroke({ width: 3, color: 0x000000, alpha: 0.25 });

      return g;
    }, 96);
  }

  /** Felt texture for the table surface, when the operator supplies one. */
  public getFeltTexture(): Texture | undefined {
    return this.art(ASSET_ALIASES.FELT);
  }

  /** 1x1 white pixel - the cheapest possible fill for tinted, scaled rectangles. */
  public getWhiteTexture(): Texture {
    return this.bake('fx:white', () => new Graphics().rect(0, 0, 8, 8).fill({ color: 0xffffff }));
  }
}
