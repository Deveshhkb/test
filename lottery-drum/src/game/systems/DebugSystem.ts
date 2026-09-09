import { Container, Graphics } from 'pixi.js';
import { DRUM_HUB_RADIUS, DRUM_INNER_RADIUS, DRUM_SPOKE_COUNT, DRUM_SPOKE_HALF_WIDTH } from '../config';
import { Ball } from '../entities/Ball';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { TAU } from '../utils/math';

/**
 * Draws the actual collision shapes the solver uses: the containment circle,
 * the hub, every spoke capsule, and each ball's radius plus velocity vector.
 * Disabled by default and costs nothing while hidden.
 */
export class DebugSystem {
  readonly view = new Container();

  private readonly gfx = new Graphics();
  private enabled = false;

  constructor(
    private readonly world: PhysicsWorld,
    private readonly balls: readonly Ball[],
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

    g.circle(0, 0, DRUM_INNER_RADIUS).stroke({ width: 2, color: 0x00ff9c, alpha: 0.85 });
    g.circle(0, 0, DRUM_HUB_RADIUS).stroke({ width: 2, color: 0x00ff9c, alpha: 0.85 });

    for (let s = 0; s < DRUM_SPOKE_COUNT; s++) {
      const angle = this.world.drumAngle + (s * TAU) / DRUM_SPOKE_COUNT;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      g.moveTo(cos * DRUM_HUB_RADIUS, sin * DRUM_HUB_RADIUS)
        .lineTo(cos * (DRUM_INNER_RADIUS - 4), sin * (DRUM_INNER_RADIUS - 4))
        .stroke({ width: DRUM_SPOKE_HALF_WIDTH * 2, color: 0xffc400, alpha: 0.45 });
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
