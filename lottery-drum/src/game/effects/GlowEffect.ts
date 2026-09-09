import { Container, Sprite } from 'pixi.js';
import { glowTexture } from '../utils/TextureFactory';

interface Pulse {
  sprite: Sprite;
  life: number;
  maxLife: number;
  fromSize: number;
  toSize: number;
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
      sprite.visible = false;
      this.view.addChild(sprite);
      this.pool.push({ sprite, life: 0, maxLife: 1, fromSize: 0, toSize: 0 });
    }
  }

  pulse(x: number, y: number, fromSize: number, toSize: number, duration: number): void {
    const free = this.pool.find((p) => p.life <= 0);
    if (!free) return;
    free.sprite.position.set(x, y);
    free.sprite.visible = true;
    free.life = duration;
    free.maxLife = duration;
    free.fromSize = fromSize;
    free.toSize = toSize;
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
      pulse.sprite.alpha = (1 - t) * 0.55;
    }
  }

  reset(): void {
    for (const pulse of this.pool) {
      pulse.life = 0;
      pulse.sprite.visible = false;
    }
  }
}
