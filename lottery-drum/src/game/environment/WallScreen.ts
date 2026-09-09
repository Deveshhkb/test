import { Container, Graphics, Sprite } from 'pixi.js';
import { COLOR_NEON } from '../GameConfig';
import { glowTexture, shadowTexture } from '../utils/TextureFactory';

/**
 * A physical wall-mounted monitor.
 *
 * The chassis is built as a real object rather than a rectangle: a bracket on
 * the wall behind it, a drop shadow it casts onto that wall, a bezel with a
 * visible side face so the panel has thickness, a recessed screen well, and a
 * glass front carrying the room's reflections. Callers fill `screen`, which is
 * masked to the display area, so the content cannot spill past the glass.
 *
 * `tilt` is the sign of the panel's angle toward the camera. The side face and
 * the glass reflections are drawn on the side the tilt exposes, so a pair of
 * screens angled inward look like two halves of the same rig.
 */
export class WallScreen {
  readonly view = new Container();
  /** Masked content area. Fill this with whatever the monitor is showing. */
  readonly screen = new Container();

  private readonly glare: Graphics;
  private readonly spill: Sprite;
  private time = 0;

  constructor(
    readonly width: number,
    readonly height: number,
    private readonly tilt: number,
  ) {
    const halfW = width / 2;
    const halfH = height / 2;
    const bezel = 13;
    const depth = 16 * tilt;

    // Light the panel throws back onto the wall behind it.
    this.spill = new Sprite(glowTexture(0x3f92cc));
    this.spill.anchor.set(0.5);
    this.spill.width = width * 1.55;
    this.spill.height = height * 1.9;
    this.spill.alpha = 0.18;
    this.spill.blendMode = 'add';

    this.view.addChild(this.spill, this.buildWallMount(halfW, halfH));

    // Shadow the panel casts onto the wall, offset away from the key light.
    const shadow = new Sprite(shadowTexture());
    shadow.anchor.set(0.5);
    shadow.width = width * 1.22;
    shadow.height = height * 1.35;
    shadow.position.set(14, 20);
    shadow.alpha = 0.85;
    this.view.addChild(shadow);

    this.view.addChild(this.buildChassis(halfW, halfH, bezel, depth));

    const mask = new Graphics()
      .roundRect(-halfW + bezel, -halfH + bezel, width - bezel * 2, height - bezel * 2, 3)
      .fill(0xffffff);
    this.screen.mask = mask;
    this.view.addChild(mask, this.screen);

    this.glare = this.buildGlass(halfW, halfH, bezel);
    this.view.addChild(this.glare, this.buildBezelHighlights(halfW, halfH, bezel));
  }

  /** The glass catches the room slightly differently as its lamps breathe. */
  update(dt: number): void {
    this.time += dt;
    this.glare.alpha = 0.85 + Math.sin(this.time * 0.5) * 0.1;
    this.spill.alpha = 0.17 + Math.sin(this.time * 0.8) * 0.02;
  }

  /** Bracket arms holding the panel off the wall. */
  private buildWallMount(halfW: number, halfH: number): Graphics {
    const g = new Graphics();
    for (const side of [-1, 1]) {
      const x = side * halfW * 0.52;
      g.roundRect(x - 9, -halfH - 26, 18, 30, 3).fill({ color: 0x141a24 });
      g.roundRect(x - 9, -halfH - 26, 18, 5, 2).fill({ color: 0x49566a, alpha: 0.8 });
      // Arm running down the back of the panel.
      g.roundRect(x - 6, -halfH - 4, 12, halfH * 1.7, 3).fill({ color: 0x0e131b });
      g.circle(x, -halfH - 12, 3).fill({ color: 0x2a323d });
    }
    return g;
  }

  /** Bezel with a visible side face, so the panel reads as having thickness. */
  private buildChassis(halfW: number, halfH: number, bezel: number, depth: number): Graphics {
    const g = new Graphics();

    // Side face, exposed by the panel's tilt.
    g.roundRect(-halfW + depth, -halfH + 3, this.width, this.height, 9).fill({ color: 0x05070b });

    // Bezel front.
    g.roundRect(-halfW, -halfH, this.width, this.height, 9).fill({ color: 0x11151c });
    g.roundRect(-halfW, -halfH, this.width, this.height, 9).stroke({
      width: 1.6,
      color: 0x3d4756,
      alpha: 0.9,
    });

    // Chamfer catching the key light along the top and left of the frame.
    g.roundRect(-halfW + 1.5, -halfH + 1.5, this.width - 3, 4, 3).fill({
      color: 0x8ea2b8,
      alpha: 0.5,
    });
    g.roundRect(-halfW + 1.5, -halfH + 1.5, 4, this.height - 3, 3).fill({
      color: 0x6f8299,
      alpha: 0.35,
    });

    // Recessed screen well: the panel sits below the bezel face.
    g.roundRect(-halfW + bezel, -halfH + bezel, this.width - bezel * 2, this.height - bezel * 2, 3)
      .fill({ color: 0x02040a });
    g.roundRect(-halfW + bezel, -halfH + bezel, this.width - bezel * 2, 5, 2).fill({
      color: 0x000000,
      alpha: 0.75,
    });

    // Maker's strip along the bottom bezel.
    g.roundRect(-14, halfH - 9, 28, 3, 1.5).fill({ color: 0x55627a, alpha: 0.7 });
    g.circle(halfW - 18, halfH - 7, 2).fill({ color: COLOR_NEON, alpha: 0.8 });
    return g;
  }

  /**
   * Glass front. Two soft diagonal streaks from the studio lamps plus a broad
   * top glare, which is what stops the screen reading as a flat lit rectangle.
   */
  private buildGlass(halfW: number, halfH: number, bezel: number): Graphics {
    const g = new Graphics();
    const w = this.width - bezel * 2;
    const h = this.height - bezel * 2;
    const x0 = -halfW + bezel;
    const y0 = -halfH + bezel;

    // Broad glare falling from the top of the glass.
    g.roundRect(x0, y0, w, h * 0.4, 3).fill({ color: 0xbfe0f5, alpha: 0.055 });

    // Diagonal reflection streaks from the rig, angled with the panel's tilt.
    const lean = this.tilt * w * 0.22;
    g.moveTo(x0 + w * 0.08, y0 + h)
      .lineTo(x0 + w * 0.3 + lean, y0)
      .lineTo(x0 + w * 0.44 + lean, y0)
      .lineTo(x0 + w * 0.22, y0 + h)
      .closePath()
      .fill({ color: 0xdff0ff, alpha: 0.05 });
    g.moveTo(x0 + w * 0.52, y0 + h)
      .lineTo(x0 + w * 0.74 + lean, y0)
      .lineTo(x0 + w * 0.79 + lean, y0)
      .lineTo(x0 + w * 0.57, y0 + h)
      .closePath()
      .fill({ color: 0xdff0ff, alpha: 0.035 });

    // Cyan bounce from the set, strongest along the lower edge.
    g.roundRect(x0, y0 + h * 0.82, w, h * 0.18, 2).fill({ color: 0x2f7fa8, alpha: 0.07 });
    return g;
  }

  private buildBezelHighlights(halfW: number, halfH: number, bezel: number): Graphics {
    // Thin bright line where the glass meets the bezel.
    return new Graphics()
      .roundRect(-halfW + bezel, -halfH + bezel, this.width - bezel * 2, this.height - bezel * 2, 3)
      .stroke({ width: 1, color: 0x9fc8e0, alpha: 0.3 });
  }
}
