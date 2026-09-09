import { Container, Graphics, Sprite } from 'pixi.js';
import {
  COLOR_GOLD,
  COLOR_GOLD_DEEP,
  COLOR_STEEL,
  HUB_RADIUS,
  PADDLE_HALF_LENGTH,
  PADDLE_HALF_WIDTH,
  SPOKE_COUNT,
  SPOKE_HALF_WIDTH,
  SPOKE_INNER_RADIUS,
  SPOKE_OUTER_RADIUS,
} from '../GameConfig';
import { TAU } from '../utils/math';
import { glowTexture } from '../utils/TextureFactory';

/**
 * The agitator: hub, shaft collar, five spokes and the paddle blocks that scoop
 * the balls. It is a single rigid assembly driven by one angle, matching the
 * physics body it stands for.
 */
export class CentralHub {
  readonly view = new Container();

  private readonly hotGlow: Sprite;
  private glowPhase = 0;

  constructor() {
    this.view.addChild(this.buildSpokes());

    this.hotGlow = new Sprite(glowTexture(0xff8a4a));
    this.hotGlow.anchor.set(0.5);
    this.hotGlow.width = HUB_RADIUS * 5;
    this.hotGlow.height = HUB_RADIUS * 5;
    this.hotGlow.alpha = 0.3;
    this.view.addChild(this.hotGlow, this.buildHub());
  }

  setRotation(angle: number): void {
    this.view.rotation = angle;
  }

  /** The hub lamp breathes; counter-rotated so it does not spin with the arm. */
  update(dt: number, speedFactor: number): void {
    this.glowPhase += dt * 2.2;
    this.hotGlow.alpha = 0.22 + Math.sin(this.glowPhase) * 0.05 + speedFactor * 0.22;
    this.hotGlow.rotation = -this.view.rotation;
  }

  private buildSpokes(): Container {
    const container = new Container();
    const g = new Graphics();
    const half = SPOKE_HALF_WIDTH;

    for (let i = 0; i < SPOKE_COUNT; i++) {
      const angle = (i / SPOKE_COUNT) * TAU;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const ix = cos * SPOKE_INNER_RADIUS;
      const iy = sin * SPOKE_INNER_RADIUS;
      const ox = cos * SPOKE_OUTER_RADIUS;
      const oy = sin * SPOKE_OUTER_RADIUS;
      const nx = -sin;
      const ny = cos;

      // Shadow side of the rod.
      g.moveTo(ix + nx * half, iy + ny * half)
        .lineTo(ox + nx * half, oy + ny * half)
        .lineTo(ox - nx * half, oy - ny * half)
        .lineTo(ix - nx * half, iy - ny * half)
        .closePath()
        .fill({ color: 0x5d6875 });

      // Lit face, offset toward the light.
      g.moveTo(ix + nx * half * 0.15, iy + ny * half * 0.15)
        .lineTo(ox + nx * half * 0.15, oy + ny * half * 0.15)
        .lineTo(ox - nx * half * 0.8, oy - ny * half * 0.8)
        .lineTo(ix - nx * half * 0.8, iy - ny * half * 0.8)
        .closePath()
        .fill({ color: 0xd9e2ec });

      // Specular line down the crown of the rod.
      g.moveTo(ix - nx * half * 0.35, iy - ny * half * 0.35)
        .lineTo(ox - nx * half * 0.35, oy - ny * half * 0.35)
        .stroke({ width: 1.6, color: 0xffffff, alpha: 0.75 });
    }

    container.addChild(g);

    for (let i = 0; i < SPOKE_COUNT; i++) {
      const angle = (i / SPOKE_COUNT) * TAU;
      container.addChild(this.buildPaddle(angle));
    }
    return container;
  }

  private buildPaddle(angle: number): Graphics {
    const paddle = new Graphics();
    const w = PADDLE_HALF_WIDTH;
    const h = PADDLE_HALF_LENGTH;

    paddle.roundRect(-w, -h, w * 2, h * 2, 4).fill({ color: 0x8e9aa8 });
    paddle.roundRect(-w, -h, w * 2 - 5, h * 2, 4).fill({ color: 0xeef3f8 });
    paddle.roundRect(-w, -h, w * 2, h * 2, 4).stroke({ width: 1.4, color: 0x6b7684, alpha: 0.9 });
    paddle.roundRect(-w + 2, -h + 3, 3, h * 2 - 6, 2).fill({ color: 0xffffff, alpha: 0.85 });

    paddle.position.set(
      Math.cos(angle) * (SPOKE_OUTER_RADIUS - 6),
      Math.sin(angle) * (SPOKE_OUTER_RADIUS - 6),
    );
    paddle.rotation = angle;
    return paddle;
  }

  private buildHub(): Graphics {
    const g = new Graphics();
    const r = HUB_RADIUS;

    g.circle(0, 0, r + 10).fill({ color: 0x0c0d11, alpha: 0.9 });
    g.circle(0, 0, r + 6).fill({ color: 0xc4322c });
    g.circle(0, 0, r + 6).stroke({ width: 1.5, color: 0x7d1a16, alpha: 0.9 });
    g.circle(0, 0, r).fill({ color: COLOR_GOLD_DEEP });
    g.circle(0, 0, r - 7).fill({ color: COLOR_GOLD });
    g.circle(-r * 0.16, -r * 0.16, r - 14).fill({ color: 0xfdeec3 });
    g.circle(-r * 0.3, -r * 0.32, r * 0.28).fill({ color: 0xffffff, alpha: 0.85 });

    // Retaining screws around the boss.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.3;
      g.circle(Math.cos(a) * (r + 3), Math.sin(a) * (r + 3), 2.2).fill({
        color: COLOR_STEEL,
        alpha: 0.8,
      });
    }
    return g;
  }
}
