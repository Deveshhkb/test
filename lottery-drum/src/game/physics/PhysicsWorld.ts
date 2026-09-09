import {
  BALL_FRICTION,
  BALL_RESTITUTION,
  DRUM_HUB_RADIUS,
  DRUM_INNER_RADIUS,
  DRUM_SPOKE_COUNT,
  DRUM_SPOKE_HALF_WIDTH,
  GRAVITY,
  LINEAR_DAMPING,
  PHYSICS_MAX_STEPS_PER_FRAME,
  PHYSICS_SOLVER_ITERATIONS,
  PHYSICS_STEP,
  SPOKE_RESTITUTION,
  SPOKE_TANGENT_GRIP,
  WALL_RESTITUTION,
  WALL_TANGENT_GRIP,
} from '../config';
import { TAU } from '../utils/math';
import { BallBody } from './BallBody';
import { resolveBallPair, resolveCircularWall, resolveRotatingSegment } from './collision';

/**
 * Fixed-timestep rigid body world for the inside of the drum.
 *
 * Everything is solved in drum-local space: the origin is the drum centre, so
 * the circular wall and the agitator spokes are cheap analytic shapes. The
 * caller only supplies the drum's angular velocity; the balls being flung to
 * the rim and carried around emerges from wall grip plus centripetal contact,
 * not from any scripted path.
 */
export class PhysicsWorld {
  readonly bodies: BallBody[] = [];

  /** Current agitator angle and angular velocity, radians and radians/second. */
  drumAngle = 0;
  drumOmega = 0;

  /** Diagnostics for the debug overlay. */
  lastSubStepCount = 0;
  lastContactCount = 0;

  private accumulator = 0;
  private readonly spokeAngles = new Float32Array(DRUM_SPOKE_COUNT);

  constructor(private readonly innerRadius = DRUM_INNER_RADIUS) {}

  addBody(body: BallBody): void {
    this.bodies.push(body);
  }

  clearBodies(): void {
    this.bodies.length = 0;
  }

  /** Advance the simulation by a wall-clock delta, in fixed substeps. */
  update(dt: number): void {
    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator >= PHYSICS_STEP && steps < PHYSICS_MAX_STEPS_PER_FRAME) {
      this.step(PHYSICS_STEP);
      this.accumulator -= PHYSICS_STEP;
      steps++;
    }
    // Long stall (tab was hidden): drop the backlog instead of spiralling.
    if (steps === PHYSICS_MAX_STEPS_PER_FRAME) this.accumulator = 0;
    this.lastSubStepCount = steps;
  }

  private step(h: number): void {
    this.drumAngle = (this.drumAngle + this.drumOmega * h) % TAU;

    const damping = Math.exp(-LINEAR_DAMPING * h);
    const bodies = this.bodies;

    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i];
      if (!body.active || body.invMass === 0) continue;
      body.previousPosition.copyFrom(body.position);
      body.velocity.y += GRAVITY * h;
      body.velocity.scale(damping);
      body.position.addScaled(body.velocity, h);
    }

    let contacts = 0;
    for (let iter = 0; iter < PHYSICS_SOLVER_ITERATIONS; iter++) {
      contacts = 0;

      // Ball vs ball. 20 bodies means 190 pairs, cheaper than any broadphase.
      for (let i = 0; i < bodies.length; i++) {
        const a = bodies[i];
        if (!a.active) continue;
        for (let j = i + 1; j < bodies.length; j++) {
          const b = bodies[j];
          if (!b.active) continue;
          if (resolveBallPair(a, b, BALL_RESTITUTION, BALL_FRICTION) > 0) contacts++;
        }
      }

      // Static hub in the middle of the agitator.
      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (!body.active || body.invMass === 0) continue;
        this.resolveHub(body);
      }

      // Rotating spokes.
      this.writeSpokeAngles();
      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (!body.active || body.invMass === 0) continue;
        for (let s = 0; s < DRUM_SPOKE_COUNT; s++) {
          const angle = this.spokeAngles[s];
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const impulse = resolveRotatingSegment(
            body,
            cos * DRUM_HUB_RADIUS,
            sin * DRUM_HUB_RADIUS,
            cos * this.innerRadius,
            sin * this.innerRadius,
            DRUM_SPOKE_HALF_WIDTH,
            this.drumOmega,
            SPOKE_RESTITUTION,
            SPOKE_TANGENT_GRIP,
          );
          if (impulse > 0) contacts++;
        }
      }

      // Outer containment last so nothing ever ends a step outside the glass.
      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (!body.active || body.invMass === 0) continue;
        if (
          resolveCircularWall(
            body,
            this.innerRadius,
            this.drumOmega,
            WALL_RESTITUTION,
            WALL_TANGENT_GRIP,
          ) > 0
        ) {
          contacts++;
        }
      }
    }
    this.lastContactCount = contacts;

    // Integrate the visual roll from how far each ball actually travelled.
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i];
      if (!body.active || body.invMass === 0) continue;
      const dx = body.position.x - body.previousPosition.x;
      const dy = body.position.y - body.previousPosition.y;
      body.rotation += (dx * 0.7 + dy * 0.3) / body.radius;
    }
  }

  private resolveHub(body: BallBody): void {
    const dist = Math.hypot(body.position.x, body.position.y);
    const minDist = DRUM_HUB_RADIUS + body.radius;
    if (dist >= minDist || dist < 1e-9) return;

    const nx = body.position.x / dist;
    const ny = body.position.y / dist;
    body.position.set(nx * minDist, ny * minDist);

    const velAlongNormal = body.velocity.x * nx + body.velocity.y * ny;
    if (velAlongNormal < 0) {
      const j = -(1 + SPOKE_RESTITUTION) * velAlongNormal;
      body.velocity.add(nx * j, ny * j);
    }
  }

  private writeSpokeAngles(): void {
    const stepAngle = TAU / DRUM_SPOKE_COUNT;
    for (let s = 0; s < DRUM_SPOKE_COUNT; s++) {
      this.spokeAngles[s] = this.drumAngle + s * stepAngle;
    }
  }
}
