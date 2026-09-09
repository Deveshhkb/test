import { Container, Graphics, TextStyle } from 'pixi.js';
import {
  BALL_ONYX,
  BALL_ONYX_DARK,
  COLOR_BACKDROP_BOTTOM,
  COLOR_BACKDROP_TOP,
  COLOR_NEON,
  COLOR_NEON_DIM,
  DRUM_CENTER_X,
  DRUM_CENTER_Y,
  DRUM_OUTER_RADIUS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../config';
import { Monitor } from './Monitor';

/**
 * The neon television set behind the machine: LED back wall, chevron light
 * panels, two wall monitors, a warm floor pool, and the two spare balls that
 * sit on the plinth in the reference clip.
 */
export class Studio {
  readonly view = new Container();

  private readonly monitors: Monitor[] = [];
  private readonly pulseTargets: Graphics[] = [];
  private time = 0;

  constructor(labelStyle: TextStyle) {
    this.view.addChild(this.buildBackdrop());
    this.view.addChild(this.buildLedWall());
    this.view.addChild(this.buildChevrons());
    this.view.addChild(this.buildNeonFrame());
    this.buildMonitors(labelStyle);
    this.view.addChild(this.buildFloor());
    this.view.addChild(this.buildSpareBalls());
  }

  update(dt: number): void {
    this.time += dt;
    for (const monitor of this.monitors) monitor.update(dt);

    // Slow breathing on the neon tubes; the reference set shimmers gently.
    const pulse = 0.82 + Math.sin(this.time * 1.1) * 0.1;
    for (let i = 0; i < this.pulseTargets.length; i++) {
      this.pulseTargets[i].alpha = pulse - i * 0.04;
    }
  }

  private buildBackdrop(): Graphics {
    const g = new Graphics();
    const bands = 24;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      const color = mixColor(COLOR_BACKDROP_TOP, COLOR_BACKDROP_BOTTOM, t);
      g.rect(0, (WORLD_HEIGHT / bands) * i, WORLD_WIDTH, WORLD_HEIGHT / bands + 1).fill({ color });
    }
    return g;
  }

  private buildLedWall(): Graphics {
    const g = new Graphics();
    const left = WORLD_WIDTH * 0.3;
    const right = WORLD_WIDTH * 0.7;
    const top = WORLD_HEIGHT * 0.16;
    const bottom = WORLD_HEIGHT * 0.86;

    g.rect(left, top, right - left, bottom - top).fill({ color: 0x0d2440 });

    // Perforated dot matrix, baked once into a single Graphics.
    const spacing = 15;
    for (let y = top + spacing; y < bottom; y += spacing) {
      for (let x = left + spacing; x < right; x += spacing) {
        const fade = 1 - Math.abs(x - WORLD_WIDTH * 0.5) / (WORLD_WIDTH * 0.34);
        if (fade <= 0.02) continue;
        g.circle(x, y, 2.4).fill({ color: COLOR_NEON, alpha: 0.06 + fade * 0.2 });
      }
    }
    // The machine is lit from the front, so the wall falls off behind it.
    for (let i = 6; i > 0; i--) {
      const t = i / 6;
      g.ellipse(WORLD_WIDTH * 0.5, WORLD_HEIGHT * 0.47, 640 * t, 470 * t).fill({
        color: 0x050a12,
        alpha: 0.14,
      });
    }
    return g;
  }

  private buildChevrons(): Container {
    const container = new Container();

    for (const side of [-1, 1]) {
      const originX = WORLD_WIDTH * 0.5 + side * WORLD_WIDTH * 0.33;
      for (let i = 0; i < 4; i++) {
        const g = new Graphics();
        const offset = i * 62;
        const halfHeight = WORLD_HEIGHT * 0.3;
        const width = 84;
        g.moveTo(originX + side * offset, WORLD_HEIGHT * 0.46 - halfHeight)
          .lineTo(originX + side * (offset + width), WORLD_HEIGHT * 0.46)
          .lineTo(originX + side * offset, WORLD_HEIGHT * 0.46 + halfHeight)
          .stroke({ width: 9, color: 0xeef6ff, alpha: 0.78, join: 'round' });
        g.alpha = 0.8 - i * 0.05;
        this.pulseTargets.push(g);
        container.addChild(g);
      }
    }
    return container;
  }

  private buildNeonFrame(): Graphics {
    const g = new Graphics();
    const inset = 46;

    // Bright cyan tube tracing the top of the set.
    g.moveTo(inset, WORLD_HEIGHT * 0.06)
      .lineTo(WORLD_WIDTH * 0.2, WORLD_HEIGHT * 0.06)
      .lineTo(WORLD_WIDTH * 0.26, WORLD_HEIGHT * 0.015)
      .lineTo(WORLD_WIDTH * 0.74, WORLD_HEIGHT * 0.015)
      .lineTo(WORLD_WIDTH * 0.8, WORLD_HEIGHT * 0.06)
      .lineTo(WORLD_WIDTH - inset, WORLD_HEIGHT * 0.06)
      .stroke({ width: 9, color: COLOR_NEON, alpha: 0.9, join: 'round', cap: 'round' });

    // Wide soft bloom under the tube.
    g.moveTo(inset, WORLD_HEIGHT * 0.06)
      .lineTo(WORLD_WIDTH * 0.2, WORLD_HEIGHT * 0.06)
      .lineTo(WORLD_WIDTH * 0.26, WORLD_HEIGHT * 0.015)
      .lineTo(WORLD_WIDTH * 0.74, WORLD_HEIGHT * 0.015)
      .lineTo(WORLD_WIDTH * 0.8, WORLD_HEIGHT * 0.06)
      .lineTo(WORLD_WIDTH - inset, WORLD_HEIGHT * 0.06)
      .stroke({ width: 26, color: COLOR_NEON, alpha: 0.15, join: 'round', cap: 'round' });

    // Side rails.
    for (const side of [0, 1]) {
      const x = side === 0 ? inset : WORLD_WIDTH - inset;
      g.moveTo(x, WORLD_HEIGHT * 0.06)
        .lineTo(x, WORLD_HEIGHT * 0.9)
        .stroke({ width: 6, color: COLOR_NEON_DIM, alpha: 0.7, cap: 'round' });
    }
    return g;
  }

  private buildMonitors(labelStyle: TextStyle): void {
    const width = WORLD_WIDTH * 0.27;
    const height = width * 0.56;

    const left = new Monitor(width, height, 'dashboard', labelStyle, 'Trend Ribber');
    left.view.position.set(WORLD_WIDTH * 0.225, WORLD_HEIGHT * 0.255);
    left.view.skew.set(0, -0.045);

    const right = new Monitor(width, height, 'wheel', labelStyle, 'Live Wheel');
    right.view.position.set(WORLD_WIDTH * 0.775, WORLD_HEIGHT * 0.255);
    right.view.skew.set(0, 0.045);

    this.monitors.push(left, right);
    this.view.addChild(left.view, right.view);
  }

  private buildFloor(): Graphics {
    const g = new Graphics();
    const horizon = WORLD_HEIGHT * 0.86;

    g.rect(0, horizon, WORLD_WIDTH, WORLD_HEIGHT - horizon).fill({ color: 0x070b12 });

    // Warm pool of light under the machine, as lit in the reference.
    for (let i = 8; i > 0; i--) {
      const t = i / 8;
      g.ellipse(DRUM_CENTER_X, horizon + 62, 470 * t, 92 * t).fill({
        color: 0xf6dcc5,
        alpha: 0.035 * (1 - t) + 0.02,
      });
    }

    // Cyan floor strip reflecting the set lighting.
    g.rect(0, horizon - 4, WORLD_WIDTH, 4).fill({ color: COLOR_NEON, alpha: 0.35 });
    return g;
  }

  private buildSpareBalls(): Container {
    const container = new Container();
    const y = DRUM_CENTER_Y + DRUM_OUTER_RADIUS + 214;

    const green = new Graphics()
      .circle(0, 0, 26)
      .fill({ color: 0x1f7a3c })
      .circle(-7, -8, 17)
      .fill({ color: 0x35b45f })
      .circle(-10, -11, 6)
      .fill({ color: 0xffffff, alpha: 0.65 });
    green.position.set(DRUM_CENTER_X - 300, y);

    const black = new Graphics()
      .circle(0, 0, 26)
      .fill({ color: BALL_ONYX_DARK })
      .circle(-7, -8, 17)
      .fill({ color: BALL_ONYX })
      .circle(-10, -11, 5)
      .fill({ color: 0xffffff, alpha: 0.45 });
    black.position.set(DRUM_CENTER_X + 300, y);

    for (const ball of [green, black]) {
      const shadow = new Graphics().ellipse(ball.x, y + 26, 30, 8).fill({ color: 0x000000, alpha: 0.5 });
      container.addChild(shadow);
    }
    container.addChild(green, black);
    return container;
  }
}

/** Linear blend between two packed RGB colours. */
function mixColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

