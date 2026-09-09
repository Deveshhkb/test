import { Container, Graphics, Sprite } from 'pixi.js';
import {
  ARM_LENGTH,
  ARM_PIVOT_RADIUS,
  ARM_REST_ANGLE,
  COLOR_NEON,
  COLOR_STEEL,
  T_ARM_SWING,
} from '../GameConfig';
import { easeInOutCubic } from '../utils/easing';
import { angleDelta, clamp } from '../utils/math';
import { glowTexture, rodTexture } from '../utils/TextureFactory';

/**
 * The indicator arm. It pivots on the hub independently of the agitator: while
 * the drum churns the arm is stowed and dim, and when a pocket is drawn it
 * swings over and lights its tip claw on the winning ball.
 *
 * The swing is a timed eased interpolation over the shortest angular path, so
 * it never takes the long way round and never depends on frame count.
 */
export class MechanicalArm {
  readonly view = new Container();

  private readonly tipGlow: Sprite;
  private readonly body = new Container();

  private angle = ARM_REST_ANGLE;
  private fromAngle = ARM_REST_ANGLE;
  private deltaAngle = 0;
  private elapsed = 0;
  private duration = 0;

  private lit = 0;
  private litTarget = 0;

  constructor() {
    this.buildBody();

    this.tipGlow = new Sprite(glowTexture(COLOR_NEON));
    this.tipGlow.anchor.set(0.5);
    this.tipGlow.width = 78;
    this.tipGlow.height = 78;
    this.tipGlow.x = ARM_LENGTH + 30;
    this.tipGlow.alpha = 0;
    this.tipGlow.blendMode = 'add';

    this.body.addChild(this.tipGlow);
    this.view.addChild(this.body);
    this.view.rotation = this.angle;
    this.view.alpha = 0.45;
  }

  get currentAngle(): number {
    return this.angle;
  }

  /** Swings the arm onto a target angle over `duration` seconds. */
  swingTo(targetAngle: number, duration = T_ARM_SWING): void {
    this.fromAngle = this.angle;
    this.deltaAngle = angleDelta(this.angle, targetAngle);
    this.elapsed = 0;
    this.duration = Math.max(duration, 0.0001);
  }

  /** Returns the arm to its parked angle and puts the tip lamp out. */
  stow(duration = T_ARM_SWING): void {
    this.swingTo(ARM_REST_ANGLE, duration);
    this.litTarget = 0;
  }

  setLit(lit: boolean): void {
    this.litTarget = lit ? 1 : 0;
  }

  snapTo(targetAngle: number): void {
    this.angle = targetAngle;
    this.duration = 0;
    this.elapsed = 0;
    this.view.rotation = this.angle;
  }

  update(dt: number): void {
    if (this.elapsed < this.duration) {
      this.elapsed = Math.min(this.elapsed + dt, this.duration);
      const t = easeInOutCubic(this.elapsed / this.duration);
      this.angle = this.fromAngle + this.deltaAngle * t;
      this.view.rotation = this.angle;
    }

    // Exponential approach, so the fade is identical at any frame rate.
    this.lit = this.lit + (this.litTarget - this.lit) * (1 - Math.exp(-6 * dt));
    this.view.alpha = 0.45 + this.lit * 0.55;
    this.tipGlow.alpha = clamp(this.lit, 0, 1) * 0.5;
    this.tipGlow.scale.set((0.9 + this.lit * 0.25) * (78 / 256));
  }

  /** Tapered arm drawn along +X, so rotation alone aims it. */
  private buildBody(): void {
    const g = new Graphics();
    const baseHalf = 14;
    const tipHalf = 8;
    const span = ARM_LENGTH - 16 - ARM_PIVOT_RADIUS;

    // Shadow the arm drops onto whatever is below it.
    const drop = new Sprite(rodTexture(0x000000));
    drop.anchor.set(0, 0.5);
    drop.width = span;
    drop.height = baseHalf * 2.1;
    drop.position.set(ARM_PIVOT_RADIUS + 4, 7);
    drop.alpha = 0.4;
    this.body.addChild(drop);

    // Machined bar: cylindrical shading across its width gives it a dark
    // underside, a bright crown and a cyan bounce from the room.
    const bar = new Sprite(rodTexture(0x9aa8b8));
    bar.anchor.set(0, 0.5);
    bar.width = span;
    bar.height = baseHalf * 2;
    bar.position.set(ARM_PIVOT_RADIUS, 0);
    this.body.addChild(bar);

    // Taper: mask the outer end down toward the tip with two dark wedges.
    g.moveTo(ARM_PIVOT_RADIUS, -baseHalf - 1)
      .lineTo(ARM_LENGTH - 16, -tipHalf)
      .lineTo(ARM_LENGTH - 16, -baseHalf - 1)
      .closePath()
      .fill({ color: 0x070b12 });
    g.moveTo(ARM_PIVOT_RADIUS, baseHalf + 1)
      .lineTo(ARM_LENGTH - 16, tipHalf)
      .lineTo(ARM_LENGTH - 16, baseHalf + 1)
      .closePath()
      .fill({ color: 0x070b12 });

    // Edge highlights along both machined edges.
    g.moveTo(ARM_PIVOT_RADIUS, -baseHalf + 1)
      .lineTo(ARM_LENGTH - 16, -tipHalf + 1)
      .stroke({ width: 1.4, color: 0xffffff, alpha: 0.7 });
    g.moveTo(ARM_PIVOT_RADIUS, baseHalf - 1)
      .lineTo(ARM_LENGTH - 16, tipHalf - 1)
      .stroke({ width: 1.2, color: 0x62b4dc, alpha: 0.45 });

    // Mechanical joint plates where the bar meets the pivot boss.
    g.roundRect(ARM_PIVOT_RADIUS - 2, -baseHalf - 2, 12, baseHalf * 2 + 4, 2).fill({
      color: 0x5d6a79,
    });
    g.roundRect(ARM_PIVOT_RADIUS - 2, -baseHalf - 2, 12, 4, 2).fill({
      color: 0xd6e2ee,
      alpha: 0.85,
    });
    g.circle(ARM_PIVOT_RADIUS + 4, -baseHalf * 0.45, 2).fill({ color: 0x11161e });
    g.circle(ARM_PIVOT_RADIUS + 4, baseHalf * 0.45, 2).fill({ color: 0x11161e });

    // Pivot boss.
    g.circle(0, 0, ARM_PIVOT_RADIUS + 3).fill({ color: 0x222a35 });
    g.circle(0, 0, ARM_PIVOT_RADIUS).fill({ color: 0x39424f });
    g.circle(0, 0, ARM_PIVOT_RADIUS - 5).fill({ color: 0x9aa7b5 });
    g.circle(-3, -3, ARM_PIVOT_RADIUS - 11).fill({ color: 0xdfe7ef });

    // Counterweight behind the pivot balances the arm visually.
    g.roundRect(-ARM_PIVOT_RADIUS - 26, -7, 26, 14, 4).fill({ color: 0x3f4956 });
    g.roundRect(-ARM_PIVOT_RADIUS - 26, -7, 26, 5, 3).fill({ color: 0xc3cedb });
    g.roundRect(-ARM_PIVOT_RADIUS - 26, 4, 26, 3, 2).fill({ color: 0x62b4dc, alpha: 0.4 });

    // Fork claw at the tip that brackets the seated ball.
    // Fork claw: one solid yoke that opens around the seated ball, so it reads
    // as a single machined part rather than two floating shards.
    const clawX = ARM_LENGTH - 18;
    g.moveTo(clawX, -tipHalf)
      .lineTo(ARM_LENGTH + 4, -34)
      .lineTo(ARM_LENGTH + 17, -30)
      .lineTo(ARM_LENGTH + 6, -12)
      .lineTo(ARM_LENGTH + 6, 12)
      .lineTo(ARM_LENGTH + 17, 30)
      .lineTo(ARM_LENGTH + 4, 34)
      .lineTo(clawX, tipHalf)
      .closePath()
      .fill({ color: 0xb9c5d3 });
    g.moveTo(clawX, -tipHalf)
      .lineTo(ARM_LENGTH + 4, -34)
      .lineTo(ARM_LENGTH + 17, -30)
      .lineTo(ARM_LENGTH + 6, -12)
      .closePath()
      .fill({ color: 0xeff4f9 });
    // Cyan bounce along the lower fork, from the room below.
    g.moveTo(clawX, tipHalf)
      .lineTo(ARM_LENGTH + 4, 34)
      .lineTo(ARM_LENGTH + 9, 32)
      .lineTo(clawX + 2, tipHalf)
      .closePath()
      .fill({ color: 0x62b4dc, alpha: 0.5 });
    g.circle(clawX, 0, 6).fill({ color: COLOR_STEEL });
    g.circle(clawX - 1, -1, 3).fill({ color: 0xe4ebf2 });

    this.body.addChild(g);
  }
}
