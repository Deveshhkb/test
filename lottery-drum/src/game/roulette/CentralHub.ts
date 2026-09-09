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
import { glowTexture, rodTexture } from '../utils/TextureFactory';

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

    // Kept tight to the boss. A wide additive glow here washes warm colour
    // across the spokes and the whole pocket band at close-up, and the steel
    // stops reading as steel.
    this.hotGlow = new Sprite(glowTexture(0xffb070));
    this.hotGlow.anchor.set(0.5);
    this.hotGlow.width = HUB_RADIUS * 2.4;
    this.hotGlow.height = HUB_RADIUS * 2.4;
    this.hotGlow.alpha = 0.22;
    this.hotGlow.blendMode = 'add';
    this.view.addChild(this.hotGlow, this.buildHub());
  }

  setRotation(angle: number): void {
    this.view.rotation = angle;
  }

  /** The hub lamp breathes; counter-rotated so it does not spin with the arm. */
  update(dt: number, speedFactor: number): void {
    this.glowPhase += dt * 2.2;
    this.hotGlow.alpha = 0.18 + Math.sin(this.glowPhase) * 0.03 + speedFactor * 0.12;
    this.hotGlow.rotation = -this.view.rotation;
  }

  private buildSpokes(): Container {
    const container = new Container();
    const half = SPOKE_HALF_WIDTH;
    const texture = rodTexture(0x93a2b3);

    for (let i = 0; i < SPOKE_COUNT; i++) {
      const angle = (i / SPOKE_COUNT) * TAU;
      const ix = Math.cos(angle) * SPOKE_INNER_RADIUS;
      const iy = Math.sin(angle) * SPOKE_INNER_RADIUS;
      const length = SPOKE_OUTER_RADIUS - SPOKE_INNER_RADIUS;

      // Shadow the rod drops onto the playfield, offset toward the key light.
      const drop = new Sprite(texture);
      drop.anchor.set(0, 0.5);
      drop.width = length;
      drop.height = half * 2.6;
      drop.position.set(ix + 4, iy + 6);
      drop.rotation = angle;
      drop.tint = 0x000000;
      drop.alpha = 0.4;
      container.addChild(drop);

      // The rod itself: generated cylindrical shading stretched along its
      // length, so the highlight lands where the key light actually is.
      const rod = new Sprite(texture);
      rod.anchor.set(0, 0.5);
      rod.width = length;
      rod.height = half * 2;
      rod.position.set(ix, iy);
      rod.rotation = angle;
      container.addChild(rod);
    }

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

    // Machined block: a dark side face, a lit top face and a bevel between
    // them, so it reads as a solid with thickness rather than a rounded rect.
    paddle.roundRect(-w, -h + 4, w * 2, h * 2, 4).fill({ color: 0x05080d, alpha: 0.55 });
    paddle.roundRect(-w, -h, w * 2, h * 2, 4).fill({ color: 0x49535f });
    paddle.roundRect(-w, -h, w * 2 - 6, h * 2, 4).fill({ color: 0xc6d2df });
    paddle.roundRect(-w, -h, w * 2 - 6, h * 0.55, 4).fill({ color: 0xffffff, alpha: 0.72 });
    paddle.roundRect(-w + 2, -h + 3, 2.5, h * 2 - 6, 2).fill({ color: 0xffffff, alpha: 0.9 });
    paddle.roundRect(w - 4, -h + 3, 2, h * 2 - 6, 1).fill({ color: 0x62b4dc, alpha: 0.6 });
    paddle.roundRect(-w, -h, w * 2, h * 2, 4).stroke({ width: 1, color: 0x141a23, alpha: 0.85 });

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
