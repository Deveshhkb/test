import { Container, Sprite, Texture, Ticker } from 'pixi.js';
import { assetManager, type ParticleTextureName } from '@/services/AssetManager';

/**
 * Lightweight pooled particle system. Sprites are recycled, never
 * allocated per burst, and the whole system is driven by one ticker.
 */

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  life: number;
  maxLife: number;
  rotationSpeed: number;
  scaleStart: number;
  scaleEnd: number;
  alphaStart: number;
  alphaEnd: number;
  active: boolean;
}

export interface EmitConfig {
  texture: ParticleTextureName;
  count: number;
  x: number;
  y: number;
  /** Emission spread in radians around `angle`. */
  angle?: number;
  spread?: number;
  speedMin: number;
  speedMax: number;
  gravity?: number;
  drag?: number;
  lifeMin: number;
  lifeMax: number;
  scaleMin?: number;
  scaleMax?: number;
  scaleEnd?: number;
  alphaEnd?: number;
  rotation?: boolean;
  tint?: number;
}

const POOL_SIZE = 400;

export class ParticleSystem {
  readonly container = new Container();
  private pool: Particle[] = [];
  private ticker: Ticker | null = null;

  init(ticker: Ticker): void {
    this.ticker = ticker;
    for (let i = 0; i < POOL_SIZE; i++) {
      const sprite = new Sprite(Texture.EMPTY);
      sprite.anchor.set(0.5);
      sprite.visible = false;
      this.container.addChild(sprite);
      this.pool.push({
        sprite,
        vx: 0,
        vy: 0,
        gravity: 0,
        drag: 0,
        life: 0,
        maxLife: 1,
        rotationSpeed: 0,
        scaleStart: 1,
        scaleEnd: 1,
        alphaStart: 1,
        alphaEnd: 0,
        active: false,
      });
    }
    ticker.add(this.update, this);
  }

  emit(config: EmitConfig): void {
    const texture = assetManager.getParticleTexture(config.texture);
    const angle = config.angle ?? -Math.PI / 2;
    const spread = config.spread ?? Math.PI * 2;
    let emitted = 0;
    for (const p of this.pool) {
      if (emitted >= config.count) break;
      if (p.active) continue;
      emitted++;
      const dir = angle + (Math.random() - 0.5) * spread;
      const speed = config.speedMin + Math.random() * (config.speedMax - config.speedMin);
      p.active = true;
      p.sprite.visible = true;
      p.sprite.texture = texture;
      p.sprite.tint = config.tint ?? 0xffffff;
      p.sprite.position.set(config.x, config.y);
      p.vx = Math.cos(dir) * speed;
      p.vy = Math.sin(dir) * speed;
      p.gravity = config.gravity ?? 0;
      p.drag = config.drag ?? 0;
      p.maxLife = config.lifeMin + Math.random() * (config.lifeMax - config.lifeMin);
      p.life = p.maxLife;
      p.rotationSpeed = config.rotation ? (Math.random() - 0.5) * 10 : 0;
      p.sprite.rotation = config.rotation ? Math.random() * Math.PI * 2 : 0;
      p.scaleStart = (config.scaleMin ?? 0.8) + Math.random() * ((config.scaleMax ?? 1.2) - (config.scaleMin ?? 0.8));
      p.scaleEnd = config.scaleEnd ?? p.scaleStart * 0.4;
      p.alphaStart = 1;
      p.alphaEnd = config.alphaEnd ?? 0;
      p.sprite.scale.set(p.scaleStart);
      p.sprite.alpha = 1;
    }
  }

  private update(ticker: Ticker): void {
    const dt = ticker.deltaMS / 1000;
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      const t = 1 - p.life / p.maxLife;
      p.vy += p.gravity * dt;
      if (p.drag > 0) {
        const damp = Math.max(0, 1 - p.drag * dt);
        p.vx *= damp;
        p.vy *= damp;
      }
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.sprite.rotation += p.rotationSpeed * dt;
      const scale = p.scaleStart + (p.scaleEnd - p.scaleStart) * t;
      p.sprite.scale.set(scale);
      p.sprite.alpha = p.alphaStart + (p.alphaEnd - p.alphaStart) * t;
    }
  }

  clear(): void {
    for (const p of this.pool) {
      p.active = false;
      p.sprite.visible = false;
    }
  }

  destroy(): void {
    this.ticker?.remove(this.update, this);
    this.container.destroy({ children: true });
    this.pool = [];
  }
}
