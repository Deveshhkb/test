import { Container, Graphics } from 'pixi.js';
import {
  HUB_RADIUS,
  PADDLE_HALF_LENGTH,
  PADDLE_HALF_WIDTH,
  PLAYFIELD_RADIUS,
  POCKET_SEAT_RADIUS,
  SPOKE_COUNT,
  SPOKE_HALF_WIDTH,
  SPOKE_INNER_RADIUS,
  SPOKE_OUTER_RADIUS,
} from '../GameConfig';
import { RouletteBall } from '../roulette/RouletteBall';
import { RoulettePhysics } from '../roulette/RoulettePhysics';
import { TAU } from '../utils/math';

/**
 * Draws the collision shapes the solver actually uses: the containment circle,
 * the hub, every spoke and paddle capsule, the pocket seat ring, and each
 * ball's radius plus its velocity vector. Costs nothing while hidden.
 */
export class DebugSystem {
  readonly view = new Container();

  private readonly gfx = new Graphics();
  private enabled = false;

  constructor(
    private readonly physics: RoulettePhysics,
    private readonly balls: readonly RouletteBall[],
    private readonly pocketAngles: readonly number[],
  ) {
    this.view.addChild(this.gfx);
    this.view.visible = false;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.view.visible = enabled;
    if (!enabled) this.gfx.clear();
  }

  update(): void {
    if (!this.enabled) return;
    const g = this.gfx.clear();

    g.circle(0, 0, PLAYFIELD_RADIUS).stroke({ width: 2, color: 0x00ff9c, alpha: 0.85 });
    g.circle(0, 0, HUB_RADIUS).stroke({ width: 2, color: 0x00ff9c, alpha: 0.85 });
    g.circle(0, 0, POCKET_SEAT_RADIUS).stroke({ width: 1, color: 0x00ff9c, alpha: 0.3 });

    const drumAngle = this.physics.drumAngle;

    for (const pocket of this.pocketAngles) {
      const a = pocket + drumAngle;
      g.circle(Math.cos(a) * POCKET_SEAT_RADIUS, Math.sin(a) * POCKET_SEAT_RADIUS, 4).stroke({
        width: 1.5,
        color: 0x00ff9c,
        alpha: 0.5,
      });
    }

    for (let s = 0; s < SPOKE_COUNT; s++) {
      const angle = drumAngle + (s * TAU) / SPOKE_COUNT;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      g.moveTo(cos * SPOKE_INNER_RADIUS, sin * SPOKE_INNER_RADIUS)
        .lineTo(cos * SPOKE_OUTER_RADIUS, sin * SPOKE_OUTER_RADIUS)
        .stroke({ width: SPOKE_HALF_WIDTH * 2, color: 0xffc400, alpha: 0.4 });

      const px = cos * (SPOKE_OUTER_RADIUS - 6);
      const py = sin * (SPOKE_OUTER_RADIUS - 6);
      g.moveTo(px - sin * PADDLE_HALF_LENGTH, py + cos * PADDLE_HALF_LENGTH)
        .lineTo(px + sin * PADDLE_HALF_LENGTH, py - cos * PADDLE_HALF_LENGTH)
        .stroke({ width: PADDLE_HALF_WIDTH * 2, color: 0xff9c00, alpha: 0.45 });
    }

    for (const ball of this.balls) {
      if (!ball.view.visible) continue;
      const { position, velocity, radius } = ball.body;
      const color = ball.body.invMass === 0 ? 0xff3ea5 : 0x35e0ff;
      g.circle(position.x, position.y, radius).stroke({ width: 2, color, alpha: 0.9 });
      g.moveTo(position.x, position.y)
        .lineTo(position.x + velocity.x * 0.06, position.y + velocity.y * 0.06)
        .stroke({ width: 2, color: 0xff7a29, alpha: 0.9 });
    }
  }
}
