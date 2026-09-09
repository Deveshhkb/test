import {
  SPIN_ACCELERATION,
  SPIN_DECELERATION,
  SPIN_IDLE_SPEED,
  SPIN_TARGET_SPEED,
} from '../config';
import { PhysicsWorld } from '../physics/PhysicsWorld';

/**
 * Ramps the agitator's angular velocity. Acceleration and deceleration are
 * separate so the drum winds up briskly and coasts down slowly, which is what
 * the reference machine does.
 */
export class SpinSystem {
  private targetOmega = SPIN_IDLE_SPEED;

  constructor(private readonly world: PhysicsWorld) {
    this.world.drumOmega = SPIN_IDLE_SPEED;
  }

  spinUp(): void {
    this.targetOmega = SPIN_TARGET_SPEED;
  }

  stop(): void {
    this.targetOmega = 0;
  }

  update(dt: number): void {
    const current = this.world.drumOmega;
    const diff = this.targetOmega - current;
    if (Math.abs(diff) < 1e-4) {
      this.world.drumOmega = this.targetOmega;
      return;
    }
    const rate = diff > 0 ? SPIN_ACCELERATION : SPIN_DECELERATION;
    const step = rate * dt * Math.sign(diff);
    this.world.drumOmega =
      Math.abs(step) >= Math.abs(diff) ? this.targetOmega : current + step;
  }
}
