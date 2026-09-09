import { BallBody } from './BallBody';

/**
 * Collision primitives. Each function resolves in place and returns the impulse
 * magnitude so callers can drive audio/effects off real contacts.
 */

/** Circle vs circle, equal density, positional correction plus impulse. */
export function resolveBallPair(a: BallBody, b: BallBody, restitution: number, friction: number): number {
  const dx = b.position.x - a.position.x;
  const dy = b.position.y - a.position.y;
  const distSq = dx * dx + dy * dy;
  const minDist = a.radius + b.radius;
  if (distSq >= minDist * minDist || distSq < 1e-9) return 0;

  const dist = Math.sqrt(distSq);
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;

  const invSum = a.invMass + b.invMass;
  if (invSum <= 0) return 0;

  // Positional correction, weighted by inverse mass.
  const correction = overlap / invSum;
  a.position.add(-nx * correction * a.invMass, -ny * correction * a.invMass);
  b.position.add(nx * correction * b.invMass, ny * correction * b.invMass);

  // Normal impulse.
  const rvx = b.velocity.x - a.velocity.x;
  const rvy = b.velocity.y - a.velocity.y;
  const velAlongNormal = rvx * nx + rvy * ny;
  if (velAlongNormal > 0) return 0;

  const j = (-(1 + restitution) * velAlongNormal) / invSum;
  a.velocity.add(-nx * j * a.invMass, -ny * j * a.invMass);
  b.velocity.add(nx * j * b.invMass, ny * j * b.invMass);

  // Tangential (friction) impulse.
  const tx = -ny;
  const ty = nx;
  const velAlongTangent = rvx * tx + rvy * ty;
  const jt = (-velAlongTangent * friction) / invSum;
  a.velocity.add(-tx * jt * a.invMass, -ty * jt * a.invMass);
  b.velocity.add(tx * jt * b.invMass, ty * jt * b.invMass);

  return Math.abs(j);
}

/**
 * Keeps a ball inside a circular wall centred on the origin. The wall itself
 * spins at `omega`, so its surface has a tangential velocity that drags the
 * ball along - this is what carries the balls around the rim in the reference.
 */
export function resolveCircularWall(
  body: BallBody,
  wallRadius: number,
  omega: number,
  restitution: number,
  grip: number,
): number {
  const dist = Math.hypot(body.position.x, body.position.y);
  const limit = wallRadius - body.radius;
  if (dist <= limit || dist < 1e-9) return 0;

  const nx = body.position.x / dist;
  const ny = body.position.y / dist;

  body.position.set(nx * limit, ny * limit);

  // Surface velocity of the spinning wall at the contact point.
  const contactX = nx * wallRadius;
  const contactY = ny * wallRadius;
  const wallVx = -omega * contactY;
  const wallVy = omega * contactX;

  const relVx = body.velocity.x - wallVx;
  const relVy = body.velocity.y - wallVy;

  const velAlongNormal = relVx * nx + relVy * ny;
  if (velAlongNormal > 0) {
    const j = -(1 + restitution) * velAlongNormal;
    body.velocity.add(nx * j, ny * j);
  }

  // Drag the ball toward the wall's tangential speed.
  const tx = -ny;
  const ty = nx;
  const relAlongTangent = relVx * tx + relVy * ty;
  body.velocity.add(-tx * relAlongTangent * grip, -ty * relAlongTangent * grip);

  return Math.abs(velAlongNormal);
}

/**
 * Ball vs a rotating capsule (a spoke of the agitator). `ax,ay` and `bx,by` are
 * the segment endpoints in the same space as the ball.
 */
export function resolveRotatingSegment(
  body: BallBody,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  halfWidth: number,
  omega: number,
  restitution: number,
  grip: number,
): number {
  const ex = bx - ax;
  const ey = by - ay;
  const lenSq = ex * ex + ey * ey;
  let t = lenSq > 1e-9 ? ((body.position.x - ax) * ex + (body.position.y - ay) * ey) / lenSq : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;

  const cx = ax + ex * t;
  const cy = ay + ey * t;

  const dx = body.position.x - cx;
  const dy = body.position.y - cy;
  const distSq = dx * dx + dy * dy;
  const minDist = body.radius + halfWidth;
  if (distSq >= minDist * minDist) return 0;

  const dist = Math.sqrt(distSq);
  let nx: number;
  let ny: number;
  if (dist < 1e-6) {
    // Degenerate: push perpendicular to the spoke.
    const inv = 1 / Math.sqrt(lenSq || 1);
    nx = -ey * inv;
    ny = ex * inv;
  } else {
    nx = dx / dist;
    ny = dy / dist;
  }

  body.position.set(cx + nx * minDist, cy + ny * minDist);

  // The contact point on the spoke moves with the agitator.
  const spokeVx = -omega * cy;
  const spokeVy = omega * cx;

  const relVx = body.velocity.x - spokeVx;
  const relVy = body.velocity.y - spokeVy;

  const velAlongNormal = relVx * nx + relVy * ny;
  if (velAlongNormal < 0) {
    const j = -(1 + restitution) * velAlongNormal;
    body.velocity.add(nx * j, ny * j);
  }

  const tx = -ny;
  const ty = nx;
  const relAlongTangent = relVx * tx + relVy * ty;
  body.velocity.add(-tx * relAlongTangent * grip, -ty * relAlongTangent * grip);

  return Math.abs(velAlongNormal);
}

/**
 * Ball against the circular track, with rolling contact friction.
 *
 * The grip model above matches the ball's tangential velocity to the wall's,
 * which is what carries balls around a spinning rim - but with the drum
 * stopped it removes most of the tangential velocity on every solver
 * iteration, so a ball hitting the track stops dead and can never roll.
 *
 * Here friction acts on the *slip* at the contact point, not on the ball's
 * velocity. Slip is `tangentialVelocity + angularVelocity * radius`: it is zero
 * exactly when the ball is rolling without slipping. So a skidding ball is
 * gripped hard and spun up, and a rolling ball is left alone - which is why it
 * keeps travelling along the track instead of stopping on contact. The impulse
 * is shared between linear and angular velocity using a solid sphere's inertia
 * (2/5 m r^2), and is bounded by the normal force in the usual Coulomb way.
 *
 * The normal force has two parts: the impulse from an impact, and the steady
 * support of gravity pressing a resting ball into the curved track. Including
 * the second is what lets a ball that has stopped bouncing still slow down and
 * come to rest, and it follows the track's curvature rather than assuming a
 * flat floor.
 *
 * `h` is the effective substep for the support term. Returns the normal
 * impulse magnitude so callers can drive impact effects.
 */
export function resolveCircularWallFriction(
  body: BallBody,
  wallRadius: number,
  omega: number,
  restitution: number,
  friction: number,
  rollingResistance: number,
  gravity: number,
  h: number,
): number {
  const dist = Math.hypot(body.position.x, body.position.y);
  const limit = wallRadius - body.radius;
  if (dist <= limit || dist < 1e-9) return 0;

  const nx = body.position.x / dist;
  const ny = body.position.y / dist;
  body.position.set(nx * limit, ny * limit);

  // Surface velocity of the track at the contact point.
  const wallVx = -omega * ny * wallRadius;
  const wallVy = omega * nx * wallRadius;

  let relVx = body.velocity.x - wallVx;
  let relVy = body.velocity.y - wallVy;

  // Normal impulse. Only an approaching contact bounces.
  const velAlongNormal = relVx * nx + relVy * ny;
  let normalImpulse = 0;
  if (velAlongNormal > 0) {
    normalImpulse = (1 + restitution) * velAlongNormal;
    body.velocity.add(-nx * normalImpulse, -ny * normalImpulse);
    relVx -= nx * normalImpulse;
    relVy -= ny * normalImpulse;
  }

  // Gravity pressing the ball into the track, zero on the upper wall where the
  // track cannot support it at all.
  const support = Math.max(0, gravity * ny) * h;

  const tx = -ny;
  const ty = nx;
  const velAlongTangent = relVx * tx + relVy * ty;

  // Slip at the contact point. Zero means rolling without slipping.
  const slip = velAlongTangent + body.angularVelocity * body.radius;

  // Impulse that would kill the slip outright, then Coulomb's bound on it.
  // A tangential impulse jt changes slip by 3.5 * jt for a solid sphere.
  let tangentImpulse = -slip / 3.5;
  const maxImpulse = friction * (normalImpulse + support);
  if (tangentImpulse > maxImpulse) tangentImpulse = maxImpulse;
  else if (tangentImpulse < -maxImpulse) tangentImpulse = -maxImpulse;

  body.velocity.add(tx * tangentImpulse, ty * tangentImpulse);
  body.angularVelocity += (2.5 * tangentImpulse) / body.radius;

  // Rolling resistance: the small loss that finally brings a rolling ball to a
  // stop. It only ever slows the ball, never reverses it.
  const rolling = rollingResistance * (normalImpulse + support);
  const remaining = velAlongTangent + tangentImpulse;
  if (Math.abs(remaining) > 1e-6 && rolling > 0) {
    const drag = Math.min(rolling, Math.abs(remaining)) * Math.sign(remaining);
    body.velocity.add(-tx * drag, -ty * drag);
    body.angularVelocity -= (drag / body.radius) * Math.sign(body.angularVelocity || 1) * 0.4;
  }

  return normalImpulse;
}

/**
 * Ball against a static line segment expressed in the same space, used for the
 * pocket separator fins. Same friction treatment as the track.
 */
export function resolveSegmentFriction(
  body: BallBody,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  halfWidth: number,
  restitution: number,
  friction: number,
  gravity: number,
  h: number,
): number {
  const ex = bx - ax;
  const ey = by - ay;
  const lenSq = ex * ex + ey * ey;
  let t = lenSq > 1e-9 ? ((body.position.x - ax) * ex + (body.position.y - ay) * ey) / lenSq : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;

  const cx = ax + ex * t;
  const cy = ay + ey * t;
  const dx = body.position.x - cx;
  const dy = body.position.y - cy;
  const distSq = dx * dx + dy * dy;
  const minDist = body.radius + halfWidth;
  if (distSq >= minDist * minDist) return 0;

  const dist = Math.sqrt(distSq);
  let nx: number;
  let ny: number;
  if (dist < 1e-6) {
    const inv = 1 / Math.sqrt(lenSq || 1);
    nx = -ey * inv;
    ny = ex * inv;
  } else {
    nx = dx / dist;
    ny = dy / dist;
  }

  body.position.set(cx + nx * minDist, cy + ny * minDist);

  const velAlongNormal = body.velocity.x * nx + body.velocity.y * ny;
  let normalImpulse = 0;
  if (velAlongNormal < 0) {
    normalImpulse = -(1 + restitution) * velAlongNormal;
    body.velocity.add(nx * normalImpulse, ny * normalImpulse);
  }

  const support = Math.max(0, gravity * -ny) * h;
  const tx = -ny;
  const ty = nx;
  const velAlongTangent = body.velocity.x * tx + body.velocity.y * ty;
  const limitImpulse = friction * (normalImpulse + support);

  let tangentImpulse = -velAlongTangent;
  if (tangentImpulse > limitImpulse) tangentImpulse = limitImpulse;
  else if (tangentImpulse < -limitImpulse) tangentImpulse = -limitImpulse;
  body.velocity.add(tx * tangentImpulse, ty * tangentImpulse);

  return normalImpulse;
}
