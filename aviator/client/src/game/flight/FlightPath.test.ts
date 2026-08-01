import { describe, expect, it } from 'vitest';
import { flightPosition } from './FlightPath';
import { FLIGHT_CONFIG } from '@/config/flight';

describe('flightPosition', () => {
  it('starts exactly at the origin', () => {
    expect(flightPosition(0)).toEqual({ fx: 0, fy: 0 });
    expect(flightPosition(-5)).toEqual({ fx: 0, fy: 0 });
  });

  it('advances horizontally monotonically', () => {
    let previous = -1;
    for (let t = 0; t <= 30; t += 0.25) {
      const { fx } = flightPosition(t);
      expect(fx).toBeGreaterThan(previous);
      previous = fx;
    }
  });

  it('never exceeds the cruise envelope', () => {
    const maxFy = FLIGHT_CONFIG.cruiseY + FLIGHT_CONFIG.bobAmplitude;
    for (let t = 0; t <= 120; t += 0.1) {
      const { fx, fy } = flightPosition(t);
      expect(fx).toBeLessThan(FLIGHT_CONFIG.cruiseX);
      expect(fy).toBeGreaterThanOrEqual(0);
      expect(fy).toBeLessThanOrEqual(maxFy);
    }
  });

  it('gains ground speed before altitude (takeoff feel)', () => {
    const early = flightPosition(0.8);
    expect(early.fx / FLIGHT_CONFIG.cruiseX).toBeGreaterThan(early.fy / FLIGHT_CONFIG.cruiseY);
  });

  it('bobs around cruise altitude late in flight', () => {
    // Sample a full bob period at cruise; fy must vary but stay bounded.
    const period = 1 / FLIGHT_CONFIG.bobFrequency;
    const values: number[] = [];
    for (let t = 60; t <= 60 + period; t += period / 20) {
      values.push(flightPosition(t).fy);
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    expect(max - min).toBeGreaterThan(FLIGHT_CONFIG.bobAmplitude * 0.5);
  });
});
