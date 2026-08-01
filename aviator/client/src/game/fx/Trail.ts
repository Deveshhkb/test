import { Graphics } from 'pixi.js';

/**
 * Fading polyline trail (the plane's contrail).
 *
 * Points are recorded with a minimum spacing and age out over `maxAge`
 * seconds; each segment is stroked with alpha and width tapering toward the
 * tail. The point array is bounded (maxAge × emission rate), so redrawing
 * is O(points) per frame with zero allocation in steady state.
 */
interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

export interface TrailOptions {
  maxAge: number;
  width: number;
  color: number;
  alpha: number;
  /** Minimum distance (px) between recorded points. */
  minDistance: number;
}

export class Trail {
  readonly graphics = new Graphics();

  private readonly points: TrailPoint[] = [];
  private readonly options: TrailOptions;

  constructor(options: TrailOptions) {
    this.options = options;
  }

  /** Record the emitter's current position (world coordinates). */
  addPoint(x: number, y: number): void {
    const last = this.points[this.points.length - 1];
    if (last) {
      const dx = x - last.x;
      const dy = y - last.y;
      if (dx * dx + dy * dy < this.options.minDistance * this.options.minDistance) {
        return;
      }
    }
    this.points.push({ x, y, age: 0 });
  }

  update(dt: number): void {
    const { maxAge } = this.options;

    for (const point of this.points) {
      point.age += dt;
    }
    // Points age front-to-back, so expired ones are always a prefix.
    let expired = 0;
    while (expired < this.points.length) {
      const point = this.points[expired];
      if (!point || point.age < maxAge) break;
      expired++;
    }
    if (expired > 0) this.points.splice(0, expired);

    this.redraw();
  }

  clear(): void {
    this.points.length = 0;
    this.graphics.clear();
  }

  destroy(): void {
    this.points.length = 0;
    this.graphics.destroy();
  }

  private redraw(): void {
    const g = this.graphics;
    g.clear();
    if (this.points.length < 2) return;

    const { maxAge, width, color, alpha } = this.options;
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1];
      const b = this.points[i];
      if (!a || !b) continue;
      const strength = 1 - b.age / maxAge;
      if (strength <= 0) continue;
      g.moveTo(a.x, a.y)
        .lineTo(b.x, b.y)
        .stroke({
          width: Math.max(0.5, width * strength),
          color,
          alpha: alpha * strength,
          cap: 'round',
        });
    }
  }
}
