import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import {
  COLOR_CHASSIS,
  COLOR_GLASS,
  COLOR_STEEL,
  COLOR_STEEL_DARK,
  FRAME_INNER_RADIUS,
  FRAME_OUTER_RADIUS,
  INNER_RING_RADIUS,
  INNER_RING_THICKNESS,
  OUTER_RING_RADIUS,
  OUTER_RING_THICKNESS,
  POCKET_BAND_INNER,
  POCKET_BAND_OUTER,
  POCKET_COUNT,
  POCKET_SEAT_RADIUS,
} from '../GameConfig';
import { TAU } from '../utils/math';
import { metalRingTexture, occlusionRingTexture } from '../utils/TextureFactory';

/**
 * The wheel body, built as separate concentric layers so each can be
 * transformed on its own:
 *
 *   outerFrame  - cast chassis ring, fixed to the stand
 *   collar      - brushed metal band between frame and glass
 *   wheelSurface- recessed playfield floor
 *   pocketBand  - numbered pockets, rotates with the drum
 *   outerRing   - metal cap over the pocket band, rotates
 *   innerRing   - metal boundary of the open playfield, rotates
 *
 * Only the rotating group turns; the chassis never does.
 */
export class RouletteWheel {
  /** Everything that stays put with the machine body. */
  readonly staticLayer = new Container();
  /** Everything that turns with the drum. */
  readonly rotatingLayer = new Container();

  /** Pocket centre angles in wheel-local space. */
  readonly pocketAngles: number[] = [];
  readonly pocketRadius = POCKET_SEAT_RADIUS;

  constructor(labelStyle: TextStyle) {
    for (let i = 0; i < POCKET_COUNT; i++) {
      this.pocketAngles.push((i / POCKET_COUNT) * TAU);
    }

    this.staticLayer.addChild(
      this.buildOuterFrame(),
      this.buildCollar(),
      this.buildWheelSurface(),
      this.buildOcclusion(),
    );
    this.rotatingLayer.addChild(
      this.buildPocketBand(labelStyle),
      this.buildRing(OUTER_RING_RADIUS, OUTER_RING_THICKNESS, 0x46525f),
      this.buildRing(INNER_RING_RADIUS, INNER_RING_THICKNESS, 0x6d7a89),
    );
  }

  setRotation(angle: number): void {
    this.rotatingLayer.rotation = angle;
  }

  /**
   * Contact shading where the chassis meets the playfield. Parts that touch
   * darken toward each other; without it every ring looks pasted on rather
   * than seated in the casting.
   */
  private buildOcclusion(): Sprite {
    const ao = new Sprite(occlusionRingTexture(0.3, 0.8));
    ao.anchor.set(0.5);
    ao.width = FRAME_INNER_RADIUS * 2.02;
    ao.height = FRAME_INNER_RADIUS * 2.02;
    return ao;
  }

  /** Cast chassis ring, with mounting bosses at the four compass points. */
  private buildOuterFrame(): Container {
    const container = new Container();
    const g = new Graphics();

    g.circle(0, 0, FRAME_OUTER_RADIUS + 6).fill({ color: 0x05080f, alpha: 0.85 });
    g.circle(0, 0, FRAME_OUTER_RADIUS)
      .fill({ color: COLOR_CHASSIS })
      .circle(0, 0, FRAME_INNER_RADIUS)
      .cut();
    g.circle(0, 0, FRAME_OUTER_RADIUS).stroke({ width: 2, color: COLOR_STEEL, alpha: 0.34 });
    g.circle(0, 0, FRAME_INNER_RADIUS).stroke({ width: 2, color: COLOR_STEEL, alpha: 0.28 });

    // Key light catches the top of the casting.
    g.arc(0, 0, (FRAME_OUTER_RADIUS + FRAME_INNER_RADIUS) / 2, Math.PI * 1.12, Math.PI * 1.72).stroke(
      { width: FRAME_OUTER_RADIUS - FRAME_INNER_RADIUS - 4, color: 0xffffff, alpha: 0.09, cap: 'butt' },
    );

    const bossRadius = (FRAME_OUTER_RADIUS + FRAME_INNER_RADIUS) / 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * TAU + Math.PI / 8;
      const bx = Math.cos(angle) * bossRadius;
      const by = Math.sin(angle) * bossRadius;
      g.circle(bx, by, 6).fill({ color: COLOR_STEEL_DARK });
      g.circle(bx - 1, by - 1, 3).fill({ color: COLOR_STEEL, alpha: 0.8 });
    }

    container.addChild(g);
    return container;
  }

  /** Brushed collar, rendered from a generated conic-gradient metal texture. */
  private buildCollar(): Sprite {
    const texture = metalRingTexture(FRAME_INNER_RADIUS, FRAME_INNER_RADIUS - OUTER_RING_RADIUS, 0x2b3644);
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.width = FRAME_INNER_RADIUS * 2;
    sprite.height = FRAME_INNER_RADIUS * 2;
    sprite.alpha = 0.3;
    return sprite;
  }

  /** Recessed floor of the playfield, darkening toward the rim. */
  private buildWheelSurface(): Graphics {
    const g = new Graphics();

    g.circle(0, 0, POCKET_BAND_OUTER).fill({ color: 0x0a1b2c, alpha: 0.7 });
    // Concentric falloff bands stand in for a dished surface.
    for (let i = 8; i > 0; i--) {
      const t = i / 8;
      g.circle(0, 0, POCKET_BAND_OUTER * t).fill({ color: 0x0a1a2c, alpha: 0.14 });
    }
    g.circle(0, 0, POCKET_BAND_INNER).fill({ color: 0x040a12, alpha: 0.72 });

    // Machined guide grooves on the floor.
    for (let i = 1; i <= 3; i++) {
      g.circle(0, 0, POCKET_BAND_INNER - i * 22).stroke({
        width: 1,
        color: COLOR_STEEL,
        alpha: 0.09,
      });
    }
    return g;
  }

  /**
   * The pocket band: a separator fin between every pocket, a moulded cup floor,
   * and an engraved number. Pockets alternate dark and darker so the band reads
   * as segmented even when no ball is seated.
   */
  private buildPocketBand(labelStyle: TextStyle): Container {
    const container = new Container();
    const step = TAU / POCKET_COUNT;
    const g = new Graphics();

    for (let i = 0; i < POCKET_COUNT; i++) {
      const start = i * step - step / 2;
      const end = start + step;
      const shade = i % 2 === 0 ? 0x0b1727 : 0x07111d;

      g.moveTo(Math.cos(start) * POCKET_BAND_INNER, Math.sin(start) * POCKET_BAND_INNER)
        .arc(0, 0, POCKET_BAND_INNER, start, end)
        .lineTo(Math.cos(end) * POCKET_BAND_OUTER, Math.sin(end) * POCKET_BAND_OUTER)
        .arc(0, 0, POCKET_BAND_OUTER, end, start, true)
        .closePath()
        .fill({ color: shade });

      // Separator fin, lit on one face and shadowed on the other.
      const cos = Math.cos(start);
      const sin = Math.sin(start);
      g.moveTo(cos * POCKET_BAND_INNER, sin * POCKET_BAND_INNER)
        .lineTo(cos * POCKET_BAND_OUTER, sin * POCKET_BAND_OUTER)
        .stroke({ width: 4, color: 0x6e7d90, alpha: 0.55 });
      g.moveTo(cos * POCKET_BAND_INNER, sin * POCKET_BAND_INNER)
        .lineTo(cos * POCKET_BAND_OUTER, sin * POCKET_BAND_OUTER)
        .stroke({ width: 1.4, color: 0xdbe6f2, alpha: 0.5 });
    }

    // Moulded cup in each pocket, where a ball comes to rest.
    for (let i = 0; i < POCKET_COUNT; i++) {
      const angle = i * step;
      const cup = new Graphics();
      cup.roundRect(-30, -15, 60, 30, 7).fill({ color: 0x0a1524, alpha: 0.95 });
      cup.roundRect(-30, -15, 60, 30, 7).stroke({ width: 1.5, color: COLOR_GLASS, alpha: 0.3 });
      cup.roundRect(-26, 2, 52, 11, 4).fill({ color: 0x000000, alpha: 0.55 });
      cup.roundRect(-26, -12, 52, 6, 3).fill({ color: 0xdff0ff, alpha: 0.13 });
      cup.position.set(Math.cos(angle) * POCKET_SEAT_RADIUS, Math.sin(angle) * POCKET_SEAT_RADIUS);
      cup.rotation = angle + Math.PI / 2;
      container.addChild(cup);
    }

    container.addChildAt(g, 0);

    // Engraved pocket numbers on the inner lip of the band.
    for (let i = 0; i < POCKET_COUNT; i++) {
      const angle = i * step;
      const label = new Text({ text: String(i + 1), style: labelStyle });
      label.anchor.set(0.5);
      label.alpha = 0.34;
      label.position.set(
        Math.cos(angle) * (POCKET_BAND_INNER + 14),
        Math.sin(angle) * (POCKET_BAND_INNER + 14),
      );
      label.rotation = angle + Math.PI / 2;
      container.addChild(label);
    }

    // Machined lip on the band, bright where it faces the key light and
    // falling to nothing on the shadow side.
    const edge = new Graphics();
    edge.arc(0, 0, POCKET_BAND_OUTER, Math.PI * 1.02, Math.PI * 1.62).stroke({
      width: 3,
      color: 0xdcebf8,
      alpha: 0.5,
      cap: 'round',
    });
    edge.arc(0, 0, POCKET_BAND_OUTER, Math.PI * 0.05, Math.PI * 0.4).stroke({
      width: 2,
      color: 0x8fd0f0,
      alpha: 0.22,
      cap: 'round',
    });
    edge.circle(0, 0, POCKET_BAND_INNER).stroke({ width: 1.5, color: 0x18304a, alpha: 0.9 });
    container.addChild(edge);
    return container;
  }

  /** A turned metal ring built from the generated brushed-metal texture. */
  private buildRing(radius: number, thickness: number, tint: number): Sprite {
    const sprite = new Sprite(metalRingTexture(radius, thickness, tint));
    sprite.anchor.set(0.5);
    sprite.width = radius * 2;
    sprite.height = radius * 2;
    return sprite;
  }
}
