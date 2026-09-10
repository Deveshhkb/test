import { Vec2 } from './Vec2';

/** A rigid circle inside the drum. Pooled: never recreated during a run. */
export class BallBody {
  readonly position = new Vec2();
  readonly velocity = new Vec2();
  readonly previousPosition = new Vec2();

  radius: number;
  /** Inverse mass; 0 makes the body immovable (used while a ball is parked). */
  invMass = 1;
  /** Roll angle of the printed surface, integrated from angular velocity. */
  rotation = 0;
  /** Radians per second. Driven by contacts, decays in free flight. */
  angularVelocity = 0;
  active = true;

  /**
   * Switches this body from the drum's velocity-matching wall grip to a
   * Coulomb friction model, so it can bounce and roll instead of sticking to
   * the wall the instant the drum stops.
   */
  settling = false;
  /**
   * True while the return mechanism has hold of the ball. It is then off the
   * track entirely - inside the return channel - so the solver leaves it alone
   * and the draw sequence drives it directly.
   */
  lifting = false;
  /** How long the body has continuously met the at-rest thresholds. */
  restTimer = 0;

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
    this.angularVelocity = 0;
    this.invMass = 1;
    this.active = true;
    this.settling = false;
    this.lifting = false;
    this.restTimer = 0;
  }

  get speed(): number {
    return this.velocity.length;
  }
}
