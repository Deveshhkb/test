import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { COLOR_GOLD, COLOR_GOLD_DEEP, COLOR_NEON } from '../GameConfig';
import { TAU } from '../utils/math';

/** Standard European roulette wheel order, used for the on-screen wheels. */
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export type DisplayKind = 'wheel' | 'dashboard';

/**
 * A wall screen in the set. Both monitors in the reference carry roulette
 * content, so the wheel is generated from the real European pocket order and
 * animated rather than faked with a static image.
 */
export class MiniDisplay {
  readonly view = new Container();

  private readonly wheel = new Container();
  private spinSpeed: number;

  constructor(
    width: number,
    height: number,
    kind: DisplayKind,
    labelStyle: TextStyle,
    title: string,
  ) {
    this.spinSpeed = kind === 'wheel' ? 0.34 : 0.18;

    const bezel = new Graphics()
      .roundRect(-width / 2 - 10, -height / 2 - 10, width + 20, height + 20, 8)
      .fill({ color: 0x0a0c10 })
      .roundRect(-width / 2, -height / 2, width, height, 3)
      .fill({ color: 0x060a12 });

    const screen = new Container();
    const mask = new Graphics().roundRect(-width / 2, -height / 2, width, height, 3).fill(0xffffff);
    screen.mask = mask;

    const glow = new Graphics()
      .roundRect(-width / 2 - 10, -height / 2 - 10, width + 20, height + 20, 8)
      .stroke({ width: 2, color: COLOR_NEON, alpha: 0.35 });

    this.buildWheel(Math.min(width, height) * 0.42);

    if (kind === 'wheel') {
      this.wheel.position.set(0, 0);
      screen.addChild(this.buildWheelScreen(width, height), this.wheel);
    } else {
      this.wheel.position.set(width * 0.02, height * 0.06);
      this.wheel.scale.set(0.62);
      screen.addChild(this.buildDashboardScreen(width, height, labelStyle, title), this.wheel);
    }

    this.view.addChild(bezel, mask, screen, glow);
  }

  update(dt: number): void {
    this.wheel.rotation = (this.wheel.rotation + this.spinSpeed * dt) % TAU;
  }

  private buildWheelScreen(width: number, height: number): Graphics {
    return new Graphics()
      .rect(-width / 2, -height / 2, width, height)
      .fill({ color: 0x11161d })
      .rect(-width / 2, -height / 2, width, height * 0.1)
      .fill({ color: 0x0a0e14 })
      .rect(-width / 2, height / 2 - height * 0.12, width, height * 0.12)
      .fill({ color: 0x0a0e14 });
  }

  private buildDashboardScreen(
    width: number,
    height: number,
    labelStyle: TextStyle,
    title: string,
  ): Container {
    const container = new Container();
    const g = new Graphics()
      .rect(-width / 2, -height / 2, width, height)
      .fill({ color: 0x0f141c })
      // Left results column.
      .roundRect(-width / 2 + 8, -height / 2 + 34, width * 0.16, height * 0.78, 4)
      .fill({ color: 0x161d27 })
      // Right stats block.
      .roundRect(width / 2 - width * 0.3, -height / 2 + 34, width * 0.28, height * 0.42, 4)
      .fill({ color: 0x161d27 })
      // Bottom bet bar.
      .roundRect(-width / 2 + 8, height / 2 - 34, width - 16, 24, 4)
      .fill({ color: 0x121821 });

    // Colour swatches in the stats block, mirroring the reference dashboard.
    const swatches = [0xe0454f, 0x2f8fd6, 0x35b877, 0xe0b13a, 0x8c5bd6];
    for (let i = 0; i < swatches.length; i++) {
      g.roundRect(width / 2 - width * 0.28 + i * 22, -height / 2 + 46, 16, 26, 3).fill({
        color: swatches[i],
        alpha: 0.85,
      });
    }

    // Recent-result chips down the left column.
    for (let i = 0; i < 6; i++) {
      const n = WHEEL_ORDER[(i * 5 + 3) % WHEEL_ORDER.length];
      g.circle(-width / 2 + 8 + width * 0.05, -height / 2 + 54 + i * 26, 8).fill({
        color: n === 0 ? 0x1f9d55 : RED_NUMBERS.has(n) ? 0xc03040 : 0x22262e,
      });
      g.roundRect(-width / 2 + 8 + width * 0.09, -height / 2 + 48 + i * 26, width * 0.06, 12, 2).fill({
        color: 0x2b3440,
      });
    }

    const heading = new Text({ text: title, style: labelStyle });
    heading.position.set(-width / 2 + 14, -height / 2 + 10);

    container.addChild(g, heading);
    return container;
  }

  private buildWheel(radius: number): void {
    const g = new Graphics();
    const pockets = WHEEL_ORDER.length;
    const step = TAU / pockets;

    g.circle(0, 0, radius * 1.06).fill({ color: 0x2c1a0e });
    g.circle(0, 0, radius * 1.06).stroke({ width: 2, color: COLOR_GOLD_DEEP, alpha: 0.8 });

    for (let i = 0; i < pockets; i++) {
      const n = WHEEL_ORDER[i];
      const a0 = i * step - step / 2;
      const color = n === 0 ? 0x1f9d55 : RED_NUMBERS.has(n) ? 0xc03040 : 0x1a1d22;
      g.moveTo(0, 0)
        .arc(0, 0, radius, a0, a0 + step)
        .closePath()
        .fill({ color });
    }

    // Wooden cone and gold turret.
    g.circle(0, 0, radius * 0.66).fill({ color: 0x8a5a2b });
    g.circle(0, 0, radius * 0.66).stroke({ width: 1.5, color: COLOR_GOLD_DEEP, alpha: 0.7 });
    g.circle(0, 0, radius * 0.52).fill({ color: 0xa26c33 });

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      g.moveTo(0, 0)
        .lineTo(Math.cos(a) * radius * 0.62, Math.sin(a) * radius * 0.62)
        .stroke({ width: 3, color: COLOR_GOLD, alpha: 0.9 });
    }
    g.circle(0, 0, radius * 0.13).fill({ color: COLOR_GOLD });
    g.circle(0, 0, radius * 0.06).fill({ color: 0xfdeec3 });

    this.wheel.addChild(g);
  }
}
