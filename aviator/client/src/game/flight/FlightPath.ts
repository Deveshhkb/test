import { FLIGHT_CONFIG } from '@/config/flight';

/**
 * Pure flight-path model: seconds-since-takeoff → position in playfield
 * fractions (fx rightward 0..1, fy upward 0..1).
 *
 * Shape: double exponential ease toward a cruise point. Horizontal speed
 * leads vertical (tauX < tauY), so the plane visibly accelerates along the
 * ground, rotates, and climbs — then settles into a gentle bob at cruise.
 * Pure and stateless, so it is trivially unit-tested and the server can
 * replay the identical path from timestamps alone.
 */
export interface FlightPoint {
  fx: number;
  fy: number;
}

export function flightPosition(
  t: number,
  cfg: typeof FLIGHT_CONFIG = FLIGHT_CONFIG,
): FlightPoint {
  if (t <= 0) return { fx: 0, fy: 0 };

  const fx = cfg.cruiseX * (1 - Math.exp(-t / cfg.tauX));
  const baseFy = cfg.cruiseY * (1 - Math.exp(-t / cfg.tauY));

  // Bobbing ramps in smoothly and is suppressed near the ground so the
  // climb-out stays clean.
  const ramp = 1 - Math.exp(-t / cfg.bobRampSeconds);
  const groundSuppression = Math.min(1, baseFy / 0.1);
  const bob =
    Math.sin(t * cfg.bobFrequency * Math.PI * 2) * cfg.bobAmplitude * ramp * groundSuppression;

  return { fx, fy: Math.max(0, baseFy + bob) };
}
