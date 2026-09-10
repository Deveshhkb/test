import { Container, Sprite } from 'pixi.js';
import { glowTexture } from '../utils/TextureFactory';

interface Pulse {
  sprite: Sprite;
  life: number;
  maxLife: number;
  fromSize: number;
  toSize: number;
  intensity: number;
  attack: number;
}

export interface PulseOptions {
  /** Peak alpha. */
  intensity?: number;
  /** Seconds spent ramping up to that peak. 0 flashes on instantly. */
  attack?: number;
}

/**
 * Expanding soft-light rings. Used once per draw, when the winning ball seats,
 * so the pool is tiny and the whole effect costs one shared texture.
 */
export class GlowEffect {
  readonly view = new Container();

  private readonly pool: Pulse[] = [];

  constructor(color: number, capacity = 3) {
    const texture = glowTexture(color);
    for (let i = 0; i < capacity; i++) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.blendMode = 'add';
      sprite.visible = false;
      this.view.addChild(sprite);
      this.pool.push({
        sprite,
        life: 0,
        maxLife: 1,
        fromSize: 0,
        toSize: 0,
        intensity: 0.55,
        attack: 0,
      });
    }
  }

  pulse(
    x: number,
    y: number,
    fromSize: number,
    toSize: number,
    duration: number,
    options: PulseOptions = {},
  ): void {
    const free = this.pool.find((p) => p.life <= 0);
    if (!free) return;
    free.sprite.position.set(x, y);
    free.sprite.visible = true;
    free.life = duration;
    free.maxLife = duration;
    free.fromSize = fromSize;
    free.toSize = toSize;
    free.intensity = options.intensity ?? 0.55;
    free.attack = options.attack ?? 0;
  }

  update(dt: number): void {
    for (const pulse of this.pool) {
      if (pulse.life <= 0) continue;
      pulse.life -= dt;
      if (pulse.life <= 0) {
        pulse.sprite.visible = false;
        continue;
      }
      const t = 1 - pulse.life / pulse.maxLife;
      const size = pulse.fromSize + (pulse.toSize - pulse.fromSize) * t;
      pulse.sprite.width = size;
      pulse.sprite.height = size;
      // With no attack this is the original instant flash, so the pulse the
      // ball fires when it seats is unchanged.
      const rise = pulse.attack > 0 ? Math.min((t * pulse.maxLife) / pulse.attack, 1) : 1;
      pulse.sprite.alpha = rise * (1 - t) * pulse.intensity;
    }
  }

  reset(): void {
    for (const pulse of this.pool) {
      pulse.life = 0;
      pulse.sprite.visible = false;
    }
  }
}
