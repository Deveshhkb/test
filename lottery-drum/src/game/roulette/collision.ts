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
