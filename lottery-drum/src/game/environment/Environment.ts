import { BlurFilter, Container, Graphics, Sprite, TextStyle } from 'pixi.js';
import {
  COLOR_BACKDROP_BOTTOM,
  COLOR_BACKDROP_TOP,
  COLOR_NEON,
  COLOR_NEON_DIM,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  MACHINE_X,
  MACHINE_Y,
} from '../GameConfig';
import {
  edgeLitPanelTexture,
  glowTexture,
  mixColor,
  shadowTexture,
  verticalGradientTexture,
} from '../utils/TextureFactory';
import { MiniDisplay } from './MiniDisplay';

/**
 * The room, built as depth bands rather than one painted backdrop.
 *
 *   far    sky gradient, architectural recesses, LED wall, ceiling rig
 *   mid    chevron light guides, wall monitors, neon trim
 *   near   floor, reflection smear, light pool, foreground haze
 *
 * The far band is blurred and hazed so it separates optically from the machine
 * rather than only in draw order, and the whole room is kept dark: in the
 * reference almost every pixel is deep navy and only a handful of small
 * elements are bright, which is what makes those elements read as lights.
 */
export class Environment {
  readonly view = new Container();

  private readonly displays: MiniDisplay[] = [];
  private readonly guides: Sprite[] = [];
  private readonly neonTube: Graphics;
  private readonly neonBloom: Sprite;
  private time = 0;

  constructor(labelStyle: TextStyle) {
    const far = new Container();
    far.addChild(this.buildBackdrop(), this.buildArchitecture(), this.buildLedWall(), this.buildRig());
    // Depth of field on the far wall, so it separates from the machine
    // optically and not only by draw order. Nothing in this band animates, so
    // it is baked to a texture once instead of running the blur every frame.
    far.filters = [new BlurFilter({ strength: 4, quality: 2 })];
    far.cacheAsTexture(true);

    const depthHaze = new Sprite(glowTexture(0x14496e));
    depthHaze.anchor.set(0.5);
    depthHaze.width = DESIGN_WIDTH * 1.15;
    depthHaze.height = DESIGN_HEIGHT * 0.95;
    depthHaze.position.set(MACHINE_X, DESIGN_HEIGHT * 0.46);
    depthHaze.alpha = 0.22;
    depthHaze.blendMode = 'add';

    const mid = new Container();
    mid.addChild(this.buildLightGuides());
    this.neonBloom = this.buildNeonBloom();
    this.neonTube = this.buildNeonTube();
    mid.addChild(this.neonBloom, this.neonTube, this.buildDisplays(labelStyle));

    const near = new Container();
    near.addChild(this.buildFloor(), this.buildSpareBalls());

    this.view.addChild(far, depthHaze, mid, near);
  }

  update(dt: number): void {
    this.time += dt;
    for (const display of this.displays) display.update(dt);

    // Light guides flicker only very slightly; a strong pulse reads as arcade.
    const pulse = 0.9 + Math.sin(this.time * 0.9) * 0.05;
    for (let i = 0; i < this.guides.length; i++) {
      this.guides[i].alpha = (0.95 - (i % 5) * 0.11) * pulse;
    }
    const tube = 0.95 + Math.sin(this.time * 1.7) * 0.04;
    this.neonTube.alpha = tube;
    this.neonBloom.alpha = 0.3 * tube;
  }

  private buildBackdrop(): Graphics {
    const g = new Graphics();
    const bands = 32;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      g.rect(0, (DESIGN_HEIGHT / bands) * i, DESIGN_WIDTH, DESIGN_HEIGHT / bands + 1).fill({
        color: mixColor(COLOR_BACKDROP_TOP, COLOR_BACKDROP_BOTTOM, t * t),
      });
    }
    return g;
  }

  /** Recessed wall bays, so the room has structure behind the machine. */
  private buildArchitecture(): Graphics {
    const g = new Graphics();
    const top = DESIGN_HEIGHT * 0.1;
    const bottom = DESIGN_HEIGHT * 0.9;

    // Two flanking wall slabs angled toward the centre.
    for (const side of [-1, 1]) {
      const outer = DESIGN_WIDTH * 0.5 + side * DESIGN_WIDTH * 0.5;
      const inner = DESIGN_WIDTH * 0.5 + side * DESIGN_WIDTH * 0.28;
      g.moveTo(outer, top - 40)
        .lineTo(inner, top + 46)
        .lineTo(inner, bottom - 30)
        .lineTo(outer, bottom + 40)
        .closePath()
        .fill({ color: 0x0a1421 });

      // Lit inner corner where the slab turns away from the room.
      g.moveTo(inner, top + 46)
        .lineTo(inner, bottom - 30)
        .stroke({ width: 3, color: COLOR_NEON, alpha: 0.18 });

      // Horizontal seams across the slab.
      for (let i = 1; i < 5; i++) {
        const y = top + ((bottom - top) / 5) * i;
        g.moveTo(outer, y + side * 0).lineTo(inner, y).stroke({
          width: 1.5,
          color: 0x2b4460,
          alpha: 0.5,
        });
      }
    }

    // Header beam across the top of the set.
    g.rect(DESIGN_WIDTH * 0.24, top - 10, DESIGN_WIDTH * 0.52, 40).fill({ color: 0x0c1826 });
    g.rect(DESIGN_WIDTH * 0.24, top + 26, DESIGN_WIDTH * 0.52, 4).fill({
      color: COLOR_NEON,
      alpha: 0.22,
    });
    return g;
  }

  /** Perforated LED panel directly behind the machine. */
  private buildLedWall(): Graphics {
    const g = new Graphics();
    const left = DESIGN_WIDTH * 0.345;
    const right = DESIGN_WIDTH * 0.655;
    const top = DESIGN_HEIGHT * 0.2;
    const bottom = DESIGN_HEIGHT * 0.88;

    g.rect(left, top, right - left, bottom - top).fill({ color: 0x0b2440 });
    g.rect(left, top, right - left, bottom - top).stroke({
      width: 2,
      color: COLOR_NEON,
      alpha: 0.14,
    });

    const spacing = 18;
    for (let y = top + spacing; y < bottom; y += spacing) {
      for (let x = left + spacing; x < right; x += spacing) {
        const fade = 1 - Math.abs(x - DESIGN_WIDTH * 0.5) / (DESIGN_WIDTH * 0.17);
        if (fade <= 0.02) continue;
        g.circle(x, y, 2.4).fill({ color: COLOR_NEON, alpha: 0.09 + fade * 0.26 });
      }
    }

    // The machine blocks the panel's light, so it falls off behind it.
    for (let i = 8; i > 0; i--) {
      const t = i / 8;
      g.ellipse(MACHINE_X, MACHINE_Y, 760 * t, 560 * t).fill({ color: 0x03060c, alpha: 0.1 });
    }
    return g;
  }

  /** Ceiling truss with the lamps that light the machine. */
  private buildRig(): Container {
    const container = new Container();
    const g = new Graphics();
    const y = DESIGN_HEIGHT * 0.055;

    g.rect(DESIGN_WIDTH * 0.1, y, DESIGN_WIDTH * 0.8, 9).fill({ color: 0x121b27 });
    for (let x = DESIGN_WIDTH * 0.1; x < DESIGN_WIDTH * 0.9; x += 52) {
      g.moveTo(x, y + 9).lineTo(x + 26, y + 34).lineTo(x + 52, y + 9).stroke({
        width: 2.5,
        color: 0x1c2735,
      });
    }
    container.addChild(g);

    for (let i = 0; i < 6; i++) {
      const x = DESIGN_WIDTH * (0.16 + i * 0.136);
      const housing = new Graphics();
      housing.position.set(x, 0);
      housing.roundRect(-18, y + 30, 36, 24, 4).fill({ color: 0x0e141d });
      housing.roundRect(-18, y + 30, 36, 5, 3).fill({ color: 0x2c3646, alpha: 0.8 });
      container.addChild(housing);

      const lamp = new Sprite(glowTexture(0xfff0d2));
      lamp.anchor.set(0.5, 0);
      lamp.width = 150;
      lamp.height = 210;
      lamp.position.set(x, y + 44);
      lamp.alpha = 0.16;
      lamp.blendMode = 'add';
      container.addChild(lamp);
    }
    return container;
  }

  /**
   * Chevron light guides on the side walls. Each is a stack of edge-lit acrylic
   * blades: bright where the light enters and falling away across the blade,
   * which is what gives them their depth in the reference.
   */
  private buildLightGuides(): Container {
    const container = new Container();
    const texture = edgeLitPanelTexture(0xcfe8ff);
    const midY = DESIGN_HEIGHT * 0.5;
    const halfHeight = DESIGN_HEIGHT * 0.3;

    for (const side of [-1, 1]) {
      const originX = DESIGN_WIDTH * 0.5 + side * DESIGN_WIDTH * 0.315;
      for (let i = 0; i < 5; i++) {
        const offset = i * 74;
        for (const half of [-1, 1]) {
          const blade = new Sprite(texture);
          blade.anchor.set(0, 0.5);
          blade.width = 26;
          blade.height = Math.hypot(94, halfHeight);
          blade.position.set(originX + side * offset, midY + (half * halfHeight) / 2);
          blade.rotation = Math.atan2(half * halfHeight, side * 94) - Math.PI / 2;
          blade.alpha = 0.95 - i * 0.11;
          blade.blendMode = 'add';
          this.guides.push(blade);
          container.addChild(blade);
        }
      }
    }
    return container;
  }

  private buildNeonTube(): Graphics {
    const g = new Graphics();
    const inset = DESIGN_WIDTH * 0.042;
    const trace = (width: number, color: number, alpha: number) => {
      g.moveTo(inset, DESIGN_HEIGHT * 0.115)
        .lineTo(DESIGN_WIDTH * 0.22, DESIGN_HEIGHT * 0.115)
        .lineTo(DESIGN_WIDTH * 0.275, DESIGN_HEIGHT * 0.062)
        .lineTo(DESIGN_WIDTH * 0.725, DESIGN_HEIGHT * 0.062)
        .lineTo(DESIGN_WIDTH * 0.78, DESIGN_HEIGHT * 0.115)
        .lineTo(DESIGN_WIDTH - inset, DESIGN_HEIGHT * 0.115)
        .stroke({ width, color, alpha, join: 'round', cap: 'round' });
    };
    // A real tube has a hot white core inside a coloured envelope.
    trace(9, COLOR_NEON, 0.9);
    trace(3, 0xdff6ff, 0.95);

    for (const x of [inset, DESIGN_WIDTH - inset]) {
      g.moveTo(x, DESIGN_HEIGHT * 0.115)
        .lineTo(x, DESIGN_HEIGHT * 0.9)
        .stroke({ width: 5, color: COLOR_NEON_DIM, alpha: 0.55, cap: 'round' });
      g.moveTo(x, DESIGN_HEIGHT * 0.115)
        .lineTo(x, DESIGN_HEIGHT * 0.9)
        .stroke({ width: 1.5, color: 0xbfeaff, alpha: 0.6, cap: 'round' });
    }
    return g;
  }

  /** Tight halo around the tube. Neon blooms close in, it does not wash. */
  private buildNeonBloom(): Sprite {
    const bloom = new Sprite(glowTexture(COLOR_NEON));
    bloom.anchor.set(0.5);
    bloom.width = DESIGN_WIDTH * 1.05;
    bloom.height = DESIGN_HEIGHT * 0.34;
    bloom.position.set(DESIGN_WIDTH * 0.5, DESIGN_HEIGHT * 0.1);
    bloom.alpha = 0.34;
    bloom.blendMode = 'add';
    return bloom;
  }

  private buildDisplays(labelStyle: TextStyle): Container {
    const container = new Container();
    const width = DESIGN_WIDTH * 0.256;
    const height = width * 0.565;

    const left = new MiniDisplay(width, height, 'dashboard', labelStyle, 'Trend Ribber');
    left.view.position.set(DESIGN_WIDTH * 0.245, DESIGN_HEIGHT * 0.32);
    left.view.skew.set(0, -0.055);

    const right = new MiniDisplay(width, height, 'wheel', labelStyle, 'Live Wheel');
    right.view.position.set(DESIGN_WIDTH * 0.755, DESIGN_HEIGHT * 0.31);
    right.view.skew.set(0, 0.055);

    this.displays.push(left, right);
    container.addChild(left.view, right.view);

    // Each screen throws its own light onto the wall behind it.
    for (const display of [left, right]) {
      const spill = new Sprite(glowTexture(0x2e7fb8));
      spill.anchor.set(0.5);
      spill.width = width * 1.9;
      spill.height = height * 2.2;
      spill.position.set(display.view.x, display.view.y);
      spill.alpha = 0.16;
      spill.blendMode = 'add';
      container.addChildAt(spill, 0);
    }
    return container;
  }

  private buildFloor(): Container {
    const container = new Container();
    const horizon = DESIGN_HEIGHT * 0.9;
    const g = new Graphics();

    g.rect(0, horizon, DESIGN_WIDTH, DESIGN_HEIGHT - horizon).fill({ color: 0x040709 });
    container.addChild(g);

    // The floor is polished, so the room smears down into it.
    const smear = new Sprite(verticalGradientTexture(0x123047, 0x040709));
    smear.anchor.set(0.5, 0);
    smear.width = DESIGN_WIDTH;
    smear.height = (DESIGN_HEIGHT - horizon) * 0.85;
    smear.position.set(DESIGN_WIDTH * 0.5, horizon);
    smear.alpha = 0.55;
    container.addChild(smear);

    const edge = new Graphics();
    edge.rect(0, horizon - 3, DESIGN_WIDTH, 3).fill({ color: 0xbfeaff, alpha: 0.55 });
    container.addChild(edge);

    // Warm pool thrown by the rig, plus its reflection running toward camera.
    const pool = new Sprite(glowTexture(0xf3dcc4));
    pool.anchor.set(0.5);
    pool.width = 1180;
    pool.height = 250;
    pool.position.set(MACHINE_X, horizon + 30);
    pool.alpha = 0.26;
    pool.blendMode = 'add';
    container.addChild(pool);

    const reflection = new Sprite(glowTexture(0x7fc4e8));
    reflection.anchor.set(0.5, 0);
    reflection.width = 420;
    reflection.height = 200;
    reflection.position.set(MACHINE_X, horizon - 10);
    reflection.alpha = 0.16;
    reflection.blendMode = 'add';
    container.addChild(reflection);
    return container;
  }

  /** The two spare balls resting on the plinth beside the machine. */
  private buildSpareBalls(): Container {
    const container = new Container();
    const y = DESIGN_HEIGHT * 0.935;

    const make = (x: number, base: number, light: number) => {
      const shadow = new Sprite(shadowTexture());
      shadow.anchor.set(0.5);
      shadow.width = 96;
      shadow.height = 32;
      shadow.position.set(x + 5, y + 25);
      shadow.alpha = 0.85;

      const ball = new Graphics()
        .circle(0, 0, 27)
        .fill({ color: base })
        .circle(-7, -8, 18)
        .fill({ color: light })
        .circle(10, 9, 13)
        .fill({ color: 0x2f7fa8, alpha: 0.28 })
        .circle(-11, -12, 6)
        .fill({ color: 0xffffff, alpha: 0.75 });
      ball.position.set(x, y);
      container.addChild(shadow, ball);
    };

    make(MACHINE_X - 390, 0x0d3f21, 0x2c9b52);
    make(MACHINE_X + 390, 0x060608, 0x24242a);
    return container;
  }
}
