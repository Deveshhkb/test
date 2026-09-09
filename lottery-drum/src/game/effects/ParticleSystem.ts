import { Container, Graphics } from 'pixi.js';
import { Rng } from '../utils/random';

interface Particle {
  view: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

/**
 * Fixed-size pool of soft sparks for the puff of dust thrown up when the
 * winning ball seats into its pocket. Sprites are allocated once and recycled,
 * so a burst costs no allocation.
 */
export class ParticleSystem {
  readonly view = new Container();

  private readonly pool: Particle[] = [];
  private readonly rng = new Rng(0xc0ffee);

  constructor(capacity = 24, color = 0xd8e8ff) {
    for (let i = 0; i < capacity; i++) {
      const view = new Graphics().circle(0, 0, 1).fill({ color });
      view.blendMode = 'add';
      view.visible = false;
      this.view.addChild(view);
      this.pool.push({ view, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1 });
    }
  }

  burst(x: number, y: number, count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.pool.find((candidate) => candidate.life <= 0);
      if (!p) return;
      const angle = this.rng.range(-Math.PI, 0);
      const magnitude = this.rng.range(speed * 0.35, speed);
      p.x = x + this.rng.range(-6, 6);
      p.y = y + this.rng.range(-4, 4);
      p.vx = Math.cos(angle) * magnitude;
      p.vy = Math.sin(angle) * magnitude;
      p.maxLife = this.rng.range(0.25, 0.6);
      p.life = p.maxLife;
      p.size = this.rng.range(2, 5);
      p.view.visible = true;
    }
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.view.visible = false;
        continue;
      }
      p.vy += 900 * dt;
      p.vx *= 0.97;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const t = p.life / p.maxLife;
      p.view.x = p.x;
      p.view.y = p.y;
      p.view.alpha = t * 0.7;
      p.view.scale.set(p.size * t);
    }
  }

  reset(): void {
    for (const p of this.pool) {
      p.life = 0;
      p.view.visible = false;
    }
  }
}
