import { Vec2 } from './Vec2';

/** A rigid circle inside the drum. Pooled: never recreated during a run. */
export class BallBody {
  readonly position = new Vec2();
  readonly velocity = new Vec2();
  readonly previousPosition = new Vec2();

  radius: number;
  /** Inverse mass; 0 makes the body immovable (used while a ball is parked). */
  invMass = 1;
  /** Visual roll angle, integrated from tangential motion. */
  rotation = 0;
  active = true;

  constructor(
    readonly id: number,
    radius: number,
  ) {
    this.radius = radius;
  }

  reset(x: number, y: number): void {
    this.position.set(x, y);
    this.previousPosition.set(x, y);
    this.velocity.set(0, 0);
    this.rotation = 0;
    this.invMass = 1;
    this.active = true;
  }

  get speed(): number {
    return this.velocity.length;
  }
}
