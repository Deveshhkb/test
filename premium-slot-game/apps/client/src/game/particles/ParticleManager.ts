import { Container, Sprite, type Texture } from 'pixi.js';

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  drag: number;
  spin: number;
  life: number;
  maxLife: number;
  s0: number;
  s1: number;
  a0: number;
  flip: boolean;
  active: boolean;
}

export interface EmitOptions {
  texture: Texture;
  x: number;
  y: number;
  count: number;
  container: Container;
  speed?: [number, number];
  angle?: [number, number]; // radians
  gravity?: number;
  drag?: number;
  life?: [number, number]; // ms
  scale?: [number, number];
  scaleEnd?: number; // multiplier
  alpha?: number;
  tint?: number | number[];
  spin?: number;
  spread?: number; // random position offset
  additive?: boolean;
  /** 3D-ish coin flip (scale.x oscillation). */
  flip?: boolean;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Pooled sprite particle system updated on the shared ticker. Zero allocations per frame. */
export class ParticleManager {
  private readonly pool: Particle[] = [];
  private readonly active: Particle[] = [];
  maxParticles: number;

  constructor(max = 700) {
    this.maxParticles = max;
    for (let i = 0; i < max; i++) {
      const sprite = new Sprite();
      sprite.anchor.set(0.5);
      sprite.visible = false;
      this.pool.push({ sprite, vx: 0, vy: 0, ax: 0, ay: 0, drag: 0, spin: 0, life: 0, maxLife: 1, s0: 1, s1: 1, a0: 1, flip: false, active: false });
    }
  }

  get activeCount() {
    return this.active.length;
  }

  emit(o: EmitOptions) {
    const [smin, smax] = o.speed ?? [0.1, 0.4];
    const [amin, amax] = o.angle ?? [0, Math.PI * 2];
    const [lmin, lmax] = o.life ?? [600, 1200];
    const [scmin, scmax] = o.scale ?? [0.3, 0.6];
    const tints = o.tint === undefined ? [0xffffff] : Array.isArray(o.tint) ? o.tint : [o.tint];
    for (let i = 0; i < o.count; i++) {
      const p = this.pool.pop();
      if (!p) return;
      const a = rand(amin, amax);
      const sp = rand(smin, smax);
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.ax = 0;
      p.ay = o.gravity ?? 0;
      p.drag = o.drag ?? 0;
      p.spin = (Math.random() - 0.5) * (o.spin ?? 0);
      p.life = 0;
      p.maxLife = rand(lmin, lmax);
      p.s0 = rand(scmin, scmax);
      p.s1 = p.s0 * (o.scaleEnd ?? 0.4);
      p.a0 = o.alpha ?? 1;
      p.flip = !!o.flip;
      p.active = true;
      const s = p.sprite;
      s.texture = o.texture;
      s.tint = tints[(Math.random() * tints.length) | 0];
      s.blendMode = o.additive ? 'add' : 'normal';
      s.position.set(o.x + (Math.random() - 0.5) * (o.spread ?? 0), o.y + (Math.random() - 0.5) * (o.spread ?? 0));
      s.rotation = Math.random() * Math.PI * 2 * (o.spin ? 1 : 0);
      s.scale.set(p.s0);
      s.alpha = p.a0;
      s.visible = true;
      o.container.addChild(s);
      this.active.push(p);
    }
  }

  update(dtMs: number) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life += dtMs;
      const t = p.life / p.maxLife;
      if (t >= 1) {
        p.active = false;
        p.sprite.visible = false;
        p.sprite.removeFromParent();
        this.active[i] = this.active[this.active.length - 1];
        this.active.pop();
        this.pool.push(p);
        continue;
      }
      p.vx += p.ax * dtMs;
      p.vy += p.ay * dtMs;
      if (p.drag) {
        const d = Math.max(0, 1 - p.drag * dtMs);
        p.vx *= d;
        p.vy *= d;
      }
      const s = p.sprite;
      s.x += p.vx * dtMs;
      s.y += p.vy * dtMs;
      s.rotation += p.spin * dtMs;
      const sc = p.s0 + (p.s1 - p.s0) * t;
      s.scale.set(p.flip ? sc * Math.cos(p.life * 0.012) : sc, sc);
      s.alpha = t > 0.7 ? p.a0 * (1 - (t - 0.7) / 0.3) : p.a0;
    }
  }

  clear() {
    for (const p of this.active) {
      p.sprite.visible = false;
      p.sprite.removeFromParent();
      this.pool.push(p);
    }
    this.active.length = 0;
  }

  destroy() {
    this.clear();
    this.pool.forEach((p) => p.sprite.destroy());
    this.pool.length = 0;
  }
}
