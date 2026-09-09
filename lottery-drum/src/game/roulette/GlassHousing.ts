import { BlurFilter, Container, Graphics, Sprite } from 'pixi.js';
import { COLOR_GLASS, FRAME_INNER_RADIUS, GLASS_RADIUS } from '../GameConfig';
import { glowTexture } from '../utils/TextureFactory';

/**
 * The transparent dome over the playfield.
 *
 * Split in two: `back` sits behind the balls and carries the far wall of the
 * dome, `front` sits over everything and carries the near wall, its specular
 * sweeps and the edge fresnel. Rendering both halves is what makes the balls
 * read as being inside a vessel rather than painted on top of one.
 */
export class GlassHousing {
  readonly back = new Container();
  readonly front = new Container();

  private readonly sheen: Sprite;
  private sheenPhase = 0;

  constructor() {
    this.back.addChild(this.buildFarWall(), this.buildInteriorLight());

    this.sheen = new Sprite(glowTexture(0xdff2ff));
    this.sheen.anchor.set(0.5);
    this.sheen.width = GLASS_RADIUS * 1.5;
    this.sheen.height = GLASS_RADIUS * 0.85;
    this.sheen.alpha = 0.1;
    this.sheen.blendMode = 'add';
    this.sheen.rotation = -0.5;
    this.sheen.position.set(-GLASS_RADIUS * 0.22, -GLASS_RADIUS * 0.3);

    this.front.addChild(this.sheen, this.buildNearWall());
  }

  /** Slow drift on the sheen keeps the glass from looking like a decal. */
  update(dt: number): void {
    this.sheenPhase += dt * 0.35;
    this.sheen.x = -GLASS_RADIUS * 0.22 + Math.sin(this.sheenPhase) * 12;
    this.sheen.alpha = 0.055 + Math.sin(this.sheenPhase * 0.7) * 0.02;
  }

  /**
   * Ambient inside the vessel. Light entering the dome scatters off the far
   * wall and the balls, so the interior sits brighter than the room behind it -
   * without this the drum reads as a hole cut in the set.
   */
  private buildInteriorLight(): Sprite {
    const light = new Sprite(glowTexture(0x4e9ccc));
    light.anchor.set(0.5);
    light.width = GLASS_RADIUS * 2.1;
    light.height = GLASS_RADIUS * 2.1;
    light.position.set(-GLASS_RADIUS * 0.12, -GLASS_RADIUS * 0.16);
    light.alpha = 0.2;
    light.blendMode = 'add';
    return light;
  }

  private buildFarWall(): Graphics {
    const g = new Graphics();
    // Tinted interior, brighter where the far wall curves away from the light.
    g.circle(0, 0, GLASS_RADIUS).fill({ color: 0x0d2036, alpha: 0.4 });
    g.arc(0, 0, GLASS_RADIUS - 8, Math.PI * 0.15, Math.PI * 0.85).stroke({
      width: 16,
      color: COLOR_GLASS,
      alpha: 0.06,
      cap: 'round',
    });
    return g;
  }

  private buildNearWall(): Container {
    const container = new Container();
    const g = new Graphics();

    // Refraction band just inside the rim: the glass thickens toward the edge.
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      g.circle(0, 0, GLASS_RADIUS - i * 3).stroke({
        width: 3,
        color: COLOR_GLASS,
        alpha: 0.05 + t * 0.12,
      });
    }

    // Bright containment lip against the chassis.
    g.circle(0, 0, GLASS_RADIUS).stroke({ width: 2.5, color: 0xe8f6ff, alpha: 0.7 });
    g.circle(0, 0, GLASS_RADIUS - 3).stroke({ width: 1, color: 0xffffff, alpha: 0.35 });
    g.circle(0, 0, FRAME_INNER_RADIUS - 2).stroke({ width: 2, color: 0xffffff, alpha: 0.2 });

    // Two specular sweeps: a long one upper-left, a short kicker lower-right.
    g.arc(0, 0, GLASS_RADIUS - 16, Math.PI * 1.04, Math.PI * 1.46).stroke({
      width: 22,
      color: 0xd6ecff,
      alpha: 0.16,
      cap: 'round',
    });
    g.arc(0, 0, GLASS_RADIUS - 15, Math.PI * 1.07, Math.PI * 1.42).stroke({
      width: 9,
      color: 0xffffff,
      alpha: 0.4,
      cap: 'round',
    });
    g.arc(0, 0, GLASS_RADIUS - 15, Math.PI * 1.1, Math.PI * 1.35).stroke({
      width: 3,
      color: 0xffffff,
      alpha: 0.9,
      cap: 'round',
    });
    // Short kicker where the room light wraps the far side.
    g.arc(0, 0, GLASS_RADIUS - 13, Math.PI * 0.08, Math.PI * 0.3).stroke({
      width: 7,
      color: 0xbfe4ff,
      alpha: 0.24,
      cap: 'round',
    });
    g.arc(0, 0, GLASS_RADIUS - 13, Math.PI * 0.12, Math.PI * 0.26).stroke({
      width: 2,
      color: 0xffffff,
      alpha: 0.5,
      cap: 'round',
    });

    // Vertical edge highlights so the dome reads as a cylinder, not a disc.
    for (const side of [-1, 1]) {
      g.ellipse(side * (GLASS_RADIUS - 8), 0, 8, GLASS_RADIUS * 0.86).fill({
        color: 0xcfe6ff,
        alpha: 0.085,
      });
    }

    // Hood over the loader at the top of the dome.
    g.moveTo(-GLASS_RADIUS * 0.6, -GLASS_RADIUS * 0.8)
      .arc(0, 0, GLASS_RADIUS + 10, Math.PI * 1.24, Math.PI * 1.76)
      .lineTo(GLASS_RADIUS * 0.6, -GLASS_RADIUS * 0.8)
      .arc(0, 0, GLASS_RADIUS - 4, Math.PI * 1.76, Math.PI * 1.24, true)
      .closePath()
      .fill({ color: COLOR_GLASS, alpha: 0.12 });

    container.addChild(g);

    // A soft blur on a duplicate outline gives the rim a scattered-light halo.
    const halo = new Graphics()
      .circle(0, 0, GLASS_RADIUS - 4)
      .stroke({ width: 8, color: COLOR_GLASS, alpha: 0.2 });
    halo.filters = [new BlurFilter({ strength: 12, quality: 2 })];
    container.addChildAt(halo, 0);

    return container;
  }
}
