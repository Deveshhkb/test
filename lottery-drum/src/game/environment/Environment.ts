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
import { glowTexture, mixColor, shadowTexture } from '../utils/TextureFactory';
import { MiniDisplay } from './MiniDisplay';

/**
 * The room the machine stands in, built as depth-separated bands:
 *
 *   far    - gradient sky, LED back wall, ceiling truss (blurred)
 *   mid    - chevron light blades, wall monitors, side rails
 *   near   - floor, light pool, foreground haze
 *
 * The far band carries a real blur so it sits behind the machine optically, not
 * just in draw order.
 */
export class Environment {
  readonly view = new Container();

  private readonly displays: MiniDisplay[] = [];
  private readonly blades: Graphics[] = [];
  private readonly ceilingTube: Graphics;
  private time = 0;

  constructor(labelStyle: TextStyle) {
    const far = new Container();
    far.addChild(this.buildBackdrop(), this.buildLedWall(), this.buildTruss());
    far.filters = [new BlurFilter({ strength: 3, quality: 2 })];

    const mid = new Container();
    mid.addChild(this.buildChevronBlades());
    this.ceilingTube = this.buildNeonFrame();
    mid.addChild(this.ceilingTube);
    mid.addChild(this.buildDisplays(labelStyle));

    const near = new Container();
    near.addChild(this.buildFloor(), this.buildSpareBalls());

    this.view.addChild(far, mid, near);
  }

  update(dt: number): void {
    this.time += dt;
    for (const display of this.displays) display.update(dt);

    const pulse = 0.78 + Math.sin(this.time * 1.05) * 0.1;
    for (let i = 0; i < this.blades.length; i++) {
      this.blades[i].alpha = pulse - (i % 4) * 0.06;
    }
    this.ceilingTube.alpha = 0.9 + Math.sin(this.time * 1.9) * 0.06;
  }

  private buildBackdrop(): Graphics {
    const g = new Graphics();
    const bands = 28;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      g.rect(0, (DESIGN_HEIGHT / bands) * i, DESIGN_WIDTH, DESIGN_HEIGHT / bands + 1).fill({
        color: mixColor(COLOR_BACKDROP_TOP, COLOR_BACKDROP_BOTTOM, t),
      });
    }
    return g;
  }

  /** Perforated LED wall directly behind the machine. */
  private buildLedWall(): Container {
    const container = new Container();
    const g = new Graphics();
    const left = DESIGN_WIDTH * 0.33;
    const right = DESIGN_WIDTH * 0.67;
    const top = DESIGN_HEIGHT * 0.17;
    const bottom = DESIGN_HEIGHT * 0.9;

    g.rect(left, top, right - left, bottom - top).fill({ color: 0x0d2440 });

    const spacing = 17;
    for (let y = top + spacing; y < bottom; y += spacing) {
      for (let x = left + spacing; x < right; x += spacing) {
        const fade = 1 - Math.abs(x - DESIGN_WIDTH * 0.5) / (DESIGN_WIDTH * 0.19);
        if (fade <= 0.02) continue;
        g.circle(x, y, 2.6).fill({ color: COLOR_NEON, alpha: 0.05 + fade * 0.2 });
      }
    }

    // The machine occludes the wall's key light, so it falls off behind it.
    for (let i = 7; i > 0; i--) {
      const t = i / 7;
      g.ellipse(MACHINE_X, MACHINE_Y, 700 * t, 520 * t).fill({ color: 0x040810, alpha: 0.13 });
    }
    container.addChild(g);
    return container;
  }

  /** Ceiling truss running across the top of the set. */
  private buildTruss(): Graphics {
    const g = new Graphics();
    const y = DESIGN_HEIGHT * 0.09;

    g.rect(DESIGN_WIDTH * 0.06, y, DESIGN_WIDTH * 0.88, 10).fill({ color: 0x1a222f });
    for (let x = DESIGN_WIDTH * 0.06; x < DESIGN_WIDTH * 0.94; x += 46) {
      g.moveTo(x, y).lineTo(x + 23, y + 34).lineTo(x + 46, y).stroke({
        width: 3,
        color: 0x28303e,
      });
    }
    // Housings for the key lights.
    for (let i = 0; i < 6; i++) {
      const x = DESIGN_WIDTH * (0.14 + i * 0.145);
      g.roundRect(x - 17, y + 30, 34, 22, 4).fill({ color: 0x141b26 });
      g.circle(x, y + 52, 8).fill({ color: 0xfff2d0, alpha: 0.5 });
    }
    return g;
  }

  /** Angled light blades flanking the set on both sides. */
  private buildChevronBlades(): Container {
    const container = new Container();

    for (const side of [-1, 1]) {
      const originX = DESIGN_WIDTH * 0.5 + side * DESIGN_WIDTH * 0.32;
      for (let i = 0; i < 5; i++) {
        const g = new Graphics();
        const offset = i * 68;
        const halfHeight = DESIGN_HEIGHT * 0.31;
        const width = 92;
        const midY = DESIGN_HEIGHT * 0.5;

        g.moveTo(originX + side * offset, midY - halfHeight)
          .lineTo(originX + side * (offset + width), midY)
          .lineTo(originX + side * offset, midY + halfHeight)
          .stroke({ width: 10, color: 0xeef6ff, alpha: 0.72, join: 'round', cap: 'round' });

        // Soft bloom behind each blade.
        const bloom = new Graphics();
        bloom
          .moveTo(originX + side * offset, midY - halfHeight)
          .lineTo(originX + side * (offset + width), midY)
          .lineTo(originX + side * offset, midY + halfHeight)
          .stroke({ width: 26, color: COLOR_NEON, alpha: 0.09, join: 'round', cap: 'round' });

        this.blades.push(g);
        container.addChild(bloom, g);
      }
    }
    return container;
  }

  private buildNeonFrame(): Graphics {
    const g = new Graphics();
    const inset = DESIGN_WIDTH * 0.042;
    const path = (width: number, alpha: number) => {
      g.moveTo(inset, DESIGN_HEIGHT * 0.115)
        .lineTo(DESIGN_WIDTH * 0.22, DESIGN_HEIGHT * 0.115)
        .lineTo(DESIGN_WIDTH * 0.275, DESIGN_HEIGHT * 0.062)
        .lineTo(DESIGN_WIDTH * 0.725, DESIGN_HEIGHT * 0.062)
        .lineTo(DESIGN_WIDTH * 0.78, DESIGN_HEIGHT * 0.115)
        .lineTo(DESIGN_WIDTH - inset, DESIGN_HEIGHT * 0.115)
        .stroke({ width, color: COLOR_NEON, alpha, join: 'round', cap: 'round' });
    };
    path(30, 0.14);
    path(9, 0.95);

    for (const x of [inset, DESIGN_WIDTH - inset]) {
      g.moveTo(x, DESIGN_HEIGHT * 0.115)
        .lineTo(x, DESIGN_HEIGHT * 0.92)
        .stroke({ width: 6, color: COLOR_NEON_DIM, alpha: 0.7, cap: 'round' });
    }
    return g;
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
    return container;
  }

  private buildFloor(): Container {
    const container = new Container();
    const g = new Graphics();
    const horizon = DESIGN_HEIGHT * 0.9;

    g.rect(0, horizon, DESIGN_WIDTH, DESIGN_HEIGHT - horizon).fill({ color: 0x05080e });
    g.rect(0, horizon - 4, DESIGN_WIDTH, 4).fill({ color: COLOR_NEON, alpha: 0.32 });
    container.addChild(g);

    // Warm pool of light under the machine.
    const pool = new Sprite(glowTexture(0xf6dcc5));
    pool.anchor.set(0.5);
    pool.width = 1120;
    pool.height = 260;
    pool.position.set(MACHINE_X, horizon + 34);
    pool.alpha = 0.15;
    container.addChild(pool);
    return container;
  }

  /** The two spare balls resting on the plinth beside the machine. */
  private buildSpareBalls(): Container {
    const container = new Container();
    const y = DESIGN_HEIGHT * 0.935;

    const make = (x: number, base: number, light: number) => {
      const shadow = new Sprite(shadowTexture());
      shadow.anchor.set(0.5);
      shadow.width = 92;
      shadow.height = 30;
      shadow.position.set(x + 4, y + 24);
      shadow.alpha = 0.8;

      const ball = new Graphics()
        .circle(0, 0, 27)
        .fill({ color: base })
        .circle(-7, -8, 18)
        .fill({ color: light })
        .circle(-11, -12, 6)
        .fill({ color: 0xffffff, alpha: 0.7 });
      ball.position.set(x, y);
      container.addChild(shadow, ball);
    };

    make(MACHINE_X - 390, 0x155c2d, 0x35b45f);
    make(MACHINE_X + 390, 0x08080a, 0x2b2b31);
    return container;
  }
}
