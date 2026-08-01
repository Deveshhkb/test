import { Texture } from 'pixi.js';

/**
 * Procedural texture factory.
 *
 * One radial-gradient "soft circle" texture is shared by every glow, light,
 * smoke puff and fire particle in the game (tinted per use). One texture ⇒
 * one GPU upload ⇒ every particle batches into a single draw call.
 */
export function createSoftCircleTexture(size = 64): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Canvas 2D is universally available; if it truly is not, a plain white
    // texture keeps the game running with square particles.
    return Texture.WHITE;
  }

  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.18)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return Texture.from(canvas);
}

/**
 * Owns the textures a scene creates so teardown is a single call —
 * the "always destroy textures" rule enforced structurally.
 */
export class TextureLibrary {
  readonly soft: Texture;

  constructor() {
    this.soft = createSoftCircleTexture();
  }

  destroy(): void {
    if (this.soft !== Texture.WHITE) {
      this.soft.destroy(true);
    }
  }
}
