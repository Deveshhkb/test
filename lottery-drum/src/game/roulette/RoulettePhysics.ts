import {
  AGITATION_INTERVAL,
  AGITATION_STRENGTH,
  BALL_FRICTION,
  BALL_RESTITUTION,
  GRAVITY,
  HUB_RADIUS,
  LINEAR_DAMPING,
  PADDLE_HALF_LENGTH,
  PADDLE_HALF_WIDTH,
  PHYSICS_MAX_STEPS_PER_FRAME,
  PHYSICS_SOLVER_ITERATIONS,
  PHYSICS_STEP,
  PLAYFIELD_RADIUS,
  SPOKE_COUNT,
  SPOKE_HALF_WIDTH,
  SPOKE_INNER_RADIUS,
  SPOKE_OUTER_RADIUS,
  SPOKE_RESTITUTION,
  SPOKE_TANGENT_GRIP,
  WALL_RESTITUTION,
  WALL_TANGENT_GRIP,
} from '../GameConfig';
import { TAU } from '../utils/math';
import { Rng } from '../utils/random';
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
export class RoulettePhysics {
  readonly bodies: BallBody[] = [];

  /** Current agitator angle and angular velocity, radians and radians/second. */
  drumAngle = 0;
  drumOmega = 0;

  /** Diagnostics for the debug overlay. */
  lastSubStepCount = 0;
  lastContactCount = 0;

  private accumulator = 0;
  private readonly spokeAngles = new Float32Array(SPOKE_COUNT);

  private readonly rng = new Rng(0x9e3779b9);
  private agitationTimer = 0;

  constructor(private readonly innerRadius = PLAYFIELD_RADIUS) {}

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
    this.applyAgitation(h);

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

      // Ball vs ball. 18 bodies means 153 pairs, cheaper than any broadphase.
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
        for (let s = 0; s < SPOKE_COUNT; s++) {
          const angle = this.spokeAngles[s];
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const impulse = resolveRotatingSegment(
            body,
            cos * SPOKE_INNER_RADIUS,
            sin * SPOKE_INNER_RADIUS,
            cos * SPOKE_OUTER_RADIUS,
            sin * SPOKE_OUTER_RADIUS,
            SPOKE_HALF_WIDTH,
            this.drumOmega,
            SPOKE_RESTITUTION,
            SPOKE_TANGENT_GRIP,
          );
          if (impulse > 0) contacts++;

          // The paddle block on the spoke end is wider than the rod and is what
          // actually scoops the balls, so it gets its own capsule.
          const px = cos * (SPOKE_OUTER_RADIUS - 6);
          const py = sin * (SPOKE_OUTER_RADIUS - 6);
          const nx = -sin * PADDLE_HALF_LENGTH;
          const ny = cos * PADDLE_HALF_LENGTH;
          const paddleImpulse = resolveRotatingSegment(
            body,
            px + nx,
            py + ny,
            px - nx,
            py - ny,
            PADDLE_HALF_WIDTH,
            this.drumOmega,
            SPOKE_RESTITUTION,
            SPOKE_TANGENT_GRIP,
          );
          if (paddleImpulse > 0) contacts++;
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

  /**
   * Random tangential and radial nudges on rim-riding balls.
   *
   * Grip alone drives every ball to exactly the wall's surface speed, at which
   * point the ring freezes into a rigid formation and stops looking like loose
   * balls in a drum. These impulses stand in for the surface irregularity and
   * air turbulence that keep a real drum churning; they scale with drum speed
   * and vanish when it stops, so a settled ball is never disturbed.
   */
  private applyAgitation(h: number): void {
    const speedFactor = Math.min(Math.abs(this.drumOmega) / 6, 1);
    if (speedFactor < 0.2) return;

    this.agitationTimer += h;
    if (this.agitationTimer < AGITATION_INTERVAL) return;
    this.agitationTimer = 0;

    const strength = AGITATION_STRENGTH * speedFactor;
    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];
      if (!body.active || body.invMass === 0) continue;

      const dist = Math.hypot(body.position.x, body.position.y);
      if (dist < this.innerRadius * 0.5) continue;

      const nx = body.position.x / dist;
      const ny = body.position.y / dist;
      // Mostly inward, so balls occasionally break off the wall and fall back.
      body.velocity.add(
        -nx * this.rng.range(0.1, 1) * strength + -ny * this.rng.range(-0.5, 0.5) * strength,
        -ny * this.rng.range(0.1, 1) * strength + nx * this.rng.range(-0.5, 0.5) * strength,
      );
    }
  }

  private resolveHub(body: BallBody): void {
    const dist = Math.hypot(body.position.x, body.position.y);
    const minDist = HUB_RADIUS + body.radius;
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
    const stepAngle = TAU / SPOKE_COUNT;
    for (let s = 0; s < SPOKE_COUNT; s++) {
      this.spokeAngles[s] = this.drumAngle + s * stepAngle;
    }
  }
}
