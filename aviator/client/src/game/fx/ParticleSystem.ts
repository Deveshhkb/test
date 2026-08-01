import { Container, Sprite, type Texture } from 'pixi.js';
import { ObjectPool, type Poolable } from '@/utils/ObjectPool';
import { lerp } from '@/utils/math';

/**
 * Pooled sprite particle system.
 *
 * Sprites are created once, share one texture (single batch) and are
 * recycled through an ObjectPool — zero per-frame allocation, which is what
 * keeps smoke and fire from stuttering low-end Android. `maxParticles` is a
 * hard cap: when the budget is spent, `emit` degrades gracefully by
 * spawning fewer particles instead of blowing the frame budget.
 */
export interface ParticleSystemOptions {
  texture: Texture;
  maxParticles: number;
  blendMode?: 'normal' | 'add' | 'screen';
}

export interface EmitConfig {
  x: number;
  y: number;
  count: number;
  /** Emission speed range, px/s. */
  speedMin: number;
  speedMax: number;
  /** Emission direction range, radians. */
  angleMin: number;
  angleMax: number;
  /** Particle lifetime range, seconds. */
  lifeMin: number;
  lifeMax: number;
  scaleStart: number;
  scaleEnd: number;
  alphaStart: number;
  alphaEnd: number;
  tint: number;
  /** Downward acceleration, px/s² (negative = buoyant). */
  gravity?: number;
  /** Velocity damping per second (0 = none, 1 = stops in ~1s). */
  drag?: number;
  /** Random spin range, radians/s. */
  spin?: number;
}

class Particle implements Poolable {
  readonly sprite: Sprite;
  vx = 0;
  vy = 0;
  age = 0;
  life = 1;
  scaleStart = 1;
  scaleEnd = 1;
  alphaStart = 1;
  alphaEnd = 0;
  gravity = 0;
  drag = 0;
  spin = 0;

  constructor(sprite: Sprite) {
    this.sprite = sprite;
  }

  reset(): void {
    this.sprite.visible = false;
    this.vx = 0;
    this.vy = 0;
    this.age = 0;
  }
}

export class ParticleSystem {
  readonly container = new Container();

  private readonly pool: ObjectPool<Particle>;
  private readonly active: Particle[] = [];
  private readonly maxParticles: number;
  private destroyed = false;

  constructor(options: ParticleSystemOptions) {
    this.maxParticles = options.maxParticles;
    this.pool = new ObjectPool<Particle>(
      () => {
        const sprite = new Sprite(options.texture);
        sprite.anchor.set(0.5);
        sprite.visible = false;
        sprite.blendMode = options.blendMode ?? 'normal';
        this.container.addChild(sprite);
        return new Particle(sprite);
      },
      { maxSize: options.maxParticles },
    );
  }

  get activeCount(): number {
    return this.active.length;
  }

  emit(config: EmitConfig): void {
    if (this.destroyed) return;
    for (let i = 0; i < config.count; i++) {
      if (this.active.length >= this.maxParticles) break;

      const p = this.pool.acquire();
      const speed = lerp(config.speedMin, config.speedMax, Math.random());
      const angle = lerp(config.angleMin, config.angleMax, Math.random());
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.age = 0;
      p.life = Math.max(0.05, lerp(config.lifeMin, config.lifeMax, Math.random()));
      p.scaleStart = config.scaleStart;
      p.scaleEnd = config.scaleEnd;
      p.alphaStart = config.alphaStart;
      p.alphaEnd = config.alphaEnd;
      p.gravity = config.gravity ?? 0;
      p.drag = config.drag ?? 0;
      p.spin = (Math.random() * 2 - 1) * (config.spin ?? 0);

      const s = p.sprite;
      s.position.set(config.x, config.y);
      s.tint = config.tint;
      s.alpha = config.alphaStart;
      s.scale.set(config.scaleStart);
      s.rotation = Math.random() * Math.PI * 2;
      s.visible = true;

      this.active.push(p);
    }
  }

  update(dt: number): void {
    if (this.destroyed) return;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      if (!p) continue;
      p.age += dt;

      if (p.age >= p.life) {
        // Swap-remove keeps this O(1) regardless of particle count.
        const last = this.active[this.active.length - 1];
        if (last) this.active[i] = last;
        this.active.pop();
        this.pool.release(p);
        continue;
      }

      const t = p.age / p.life;
      const dragFactor = Math.max(0, 1 - p.drag * dt);
      p.vx *= dragFactor;
      p.vy = p.vy * dragFactor + p.gravity * dt;

      const s = p.sprite;
      s.x += p.vx * dt;
      s.y += p.vy * dt;
      s.rotation += p.spin * dt;
      s.alpha = lerp(p.alphaStart, p.alphaEnd, t);
      const scale = lerp(p.scaleStart, p.scaleEnd, t);
      s.scale.set(scale);
    }
  }

  /** Immediately retire every live particle (round reset). */
  killAll(): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      if (p) this.pool.release(p);
    }
    this.active.length = 0;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.killAll();
    this.pool.drain((p) => p.sprite.destroy());
    // Sprites are children of the container; destroy cleans up any remainder.
    this.container.destroy({ children: true });
  }
}
