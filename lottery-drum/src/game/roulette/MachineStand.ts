import { Container, Graphics, Sprite } from 'pixi.js';
import {
  COLOR_NEON,
  COLOR_STEEL,
  FRAME_OUTER_RADIUS,
} from '../GameConfig';
import { glowTexture, shadowTexture, verticalGradientTexture } from '../utils/TextureFactory';

/**
 * The support structure the wheel is mounted on: two curved yoke arms gripping
 * the frame, a drive column with a lit control panel, and a plinth with a
 * contact shadow. Without this the wheel reads as floating.
 */
export class MachineStand {
  readonly view = new Container();

  private readonly panelLights: Graphics[] = [];
  private time = 0;

  constructor() {
    const columnTop = FRAME_OUTER_RADIUS - 30;

    this.view.addChild(this.buildFloorShadow(columnTop));
    this.view.addChild(this.buildYokeArms());
    this.view.addChild(this.buildColumn(columnTop));
    this.view.addChild(this.buildPlinth(columnTop));
    this.view.addChild(this.buildUnderGlow(columnTop));
  }

  update(dt: number): void {
    this.time += dt;
    // Running lights on the control panel, offset per lamp.
    for (let i = 0; i < this.panelLights.length; i++) {
      const phase = this.time * 2.4 - i * 0.6;
      this.panelLights[i].alpha = 0.35 + (Math.sin(phase) * 0.5 + 0.5) * 0.6;
    }
  }

  private buildFloorShadow(columnTop: number): Sprite {
    const shadow = new Sprite(shadowTexture());
    shadow.anchor.set(0.5);
    shadow.width = 720;
    shadow.height = 150;
    shadow.y = columnTop + 244;
    shadow.alpha = 0.75;
    return shadow;
  }

  /** Curved yoke arms that reach up and clamp the wheel frame. */
  private buildYokeArms(): Graphics {
    const g = new Graphics();
    const grip = FRAME_OUTER_RADIUS + 4;

    for (const side of [-1, 1]) {
      const x = side * (FRAME_OUTER_RADIUS - 12);

      g.moveTo(x, -FRAME_OUTER_RADIUS * 0.5)
        .bezierCurveTo(
          x + side * 26,
          FRAME_OUTER_RADIUS * 0.2,
          x + side * 12,
          FRAME_OUTER_RADIUS * 0.8,
          side * 74,
          FRAME_OUTER_RADIUS + 74,
        )
        .lineTo(side * 40, FRAME_OUTER_RADIUS + 74)
        .bezierCurveTo(
          x - side * 12,
          FRAME_OUTER_RADIUS * 0.8,
          x - side * 6,
          FRAME_OUTER_RADIUS * 0.2,
          x - side * 18,
          -FRAME_OUTER_RADIUS * 0.5,
        )
        .closePath()
        .fill({ color: 0x1f2836 });

      // Highlight running up the outboard edge.
      g.moveTo(x, -FRAME_OUTER_RADIUS * 0.5)
        .bezierCurveTo(
          x + side * 26,
          FRAME_OUTER_RADIUS * 0.2,
          x + side * 12,
          FRAME_OUTER_RADIUS * 0.8,
          side * 74,
          FRAME_OUTER_RADIUS + 74,
        )
        .stroke({ width: 3, color: COLOR_STEEL, alpha: 0.6 });

      // Clamp block on the frame.
      const clamp = new Graphics();
      clamp.roundRect(-16, -22, 32, 44, 6).fill({ color: 0x2b3341 });
      clamp.roundRect(-16, -22, 32, 12, 5).fill({ color: COLOR_STEEL, alpha: 0.4 });
      clamp.circle(0, 6, 4).fill({ color: 0x0d1017 });
      clamp.position.set(side * grip * 0.96, -FRAME_OUTER_RADIUS * 0.34);
      clamp.rotation = side * 0.12;
      g.addChild(clamp);
    }
    return g;
  }

  /** Drive column, with a lit control panel and vent slots. */
  private buildColumn(columnTop: number): Container {
    const container = new Container();
    const g = new Graphics();

    // Body, shaded with a generated vertical gradient.
    const body = new Sprite(verticalGradientTexture(0x1d2534, 0x0a0e16));
    body.anchor.set(0.5, 0);
    body.width = 208;
    body.height = 214;
    body.y = columnTop;
    container.addChild(body);

    g.roundRect(-104, columnTop, 208, 214, 12).stroke({
      width: 2,
      color: COLOR_STEEL,
      alpha: 0.24,
    });
    // Bevelled front face.
    g.roundRect(-82, columnTop + 16, 164, 182, 9).fill({ color: 0x131a26 });
    g.roundRect(-82, columnTop + 16, 164, 12, 6).fill({ color: 0xffffff, alpha: 0.06 });

    // Gearbox housing under the wheel.
    g.roundRect(-66, columnTop - 40, 132, 62, 8).fill({ color: 0x232b3a });
    g.roundRect(-66, columnTop - 40, 132, 10, 5).fill({ color: COLOR_STEEL, alpha: 0.3 });
    g.roundRect(-44, columnTop - 28, 88, 36, 5).fill({ color: 0x0b0f17 });

    // Vent slots down the column.
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 2; col++) {
        g.roundRect(-62 + col * 84, columnTop + 116 + row * 18, 40, 7, 4).fill({
          color: 0x05080e,
          alpha: 0.9,
        });
      }
    }
    container.addChild(g);

    // Control panel lamps.
    for (let i = 0; i < 3; i++) {
      const lamp = new Graphics();
      lamp.roundRect(-13, -20, 26, 40, 4).fill({ color: COLOR_NEON });
      lamp.position.set(-32 + i * 32, columnTop - 10);
      this.panelLights.push(lamp);
      container.addChild(lamp);
    }

    // Readout strip.
    const strip = new Graphics();
    strip.roundRect(-58, columnTop + 60, 116, 34, 5).fill({ color: 0x061019 });
    strip.roundRect(-58, columnTop + 60, 116, 34, 5).stroke({
      width: 1.5,
      color: COLOR_NEON,
      alpha: 0.35,
    });
    for (let i = 0; i < 7; i++) {
      strip.roundRect(-50 + i * 15, columnTop + 70, 9, 14, 2).fill({
        color: COLOR_NEON,
        alpha: 0.18 + (i % 3) * 0.14,
      });
    }
    container.addChild(strip);
    return container;
  }

  private buildPlinth(columnTop: number): Graphics {
    const g = new Graphics();
    const y = columnTop + 214;

    g.moveTo(-250, y)
      .lineTo(250, y)
      .lineTo(300, y + 58)
      .lineTo(-300, y + 58)
      .closePath()
      .fill({ color: 0x0b0f17 });
    g.moveTo(-250, y)
      .lineTo(250, y)
      .lineTo(250, y + 10)
      .lineTo(-250, y + 10)
      .closePath()
      .fill({ color: 0x2a3346 });
    g.moveTo(-300, y + 58).lineTo(300, y + 58).stroke({ width: 2, color: COLOR_NEON, alpha: 0.25 });
    return g;
  }

  private buildUnderGlow(columnTop: number): Sprite {
    const glow = new Sprite(glowTexture(COLOR_NEON));
    glow.anchor.set(0.5);
    glow.width = 560;
    glow.height = 140;
    glow.y = columnTop + 250;
    glow.alpha = 0.16;
    return glow;
  }
}
