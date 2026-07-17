import { Container, Graphics, Renderer, Text, TextStyle, Texture } from 'pixi.js';
import type { SymbolId } from '@/types';
import { SYMBOL_SIZE } from '@/constants';

/**
 * Asset manager with a texture + audio cache. All game art is generated
 * procedurally into render textures at boot (so the project runs with zero
 * binary assets); a production reskin only needs to replace `generate*`
 * with `Assets.load(...)` calls — the cache API stays identical.
 */

export type ParticleTextureName = 'coin' | 'star' | 'sparkle' | 'fire' | 'smoke' | 'magic';

interface SymbolStyleDef {
  border: number;
  bg: number;
  bg2: number;
}

const CARD = SYMBOL_SIZE - 18;
const SYMBOL_STYLES: Record<SymbolId, SymbolStyleDef> = {
  WILD: { border: 0xffc93c, bg: 0x4d3300, bg2: 0x996b00 },
  SCATTER: { border: 0xff6ec7, bg: 0x3d0a33, bg2: 0x77135f },
  BONUS: { border: 0x9d5cff, bg: 0x1e0a3d, bg2: 0x3d1877 },
  SEVEN: { border: 0xff4d4d, bg: 0x330a0a, bg2: 0x661414 },
  BELL: { border: 0xffd166, bg: 0x33270a, bg2: 0x665014 },
  DIAMOND: { border: 0x4dd6ff, bg: 0x0a2933, bg2: 0x145266 },
  CHERRY: { border: 0xff5c7a, bg: 0x330a14, bg2: 0x661429 },
  LEMON: { border: 0xf4f45c, bg: 0x31330a, bg2: 0x626614 },
  ORANGE: { border: 0xffa04d, bg: 0x33200a, bg2: 0x664114 },
  PLUM: { border: 0xc44dff, bg: 0x250a33, bg2: 0x4a1466 },
  MYSTERY: { border: 0xb8b8ff, bg: 0x14143d, bg2: 0x282877 },
};

class AssetManager {
  private symbolTextures = new Map<SymbolId, Texture>();
  private blurredSymbolTextures = new Map<SymbolId, Texture>();
  private particleTextures = new Map<ParticleTextureName, Texture>();
  private renderer: Renderer | null = null;
  loaded = false;

  /** Generate & cache every texture. Reports progress 0..1 for the preloader. */
  async load(renderer: Renderer, onProgress: (p: number) => void): Promise<void> {
    this.renderer = renderer;
    const symbols = Object.keys(SYMBOL_STYLES) as SymbolId[];
    const particles: ParticleTextureName[] = ['coin', 'star', 'sparkle', 'fire', 'smoke', 'magic'];
    const total = symbols.length + particles.length;
    let done = 0;

    const step = async () => {
      done += 1;
      onProgress(done / total);
      // Yield to the browser so the progress bar actually paints.
      await new Promise((r) => setTimeout(r, 16));
    };

    for (const id of symbols) {
      this.symbolTextures.set(id, this.generateSymbolTexture(id));
      await step();
    }
    for (const name of particles) {
      this.particleTextures.set(name, this.generateParticleTexture(name));
      await step();
    }
    this.loaded = true;
  }

  getSymbolTexture(id: SymbolId): Texture {
    const texture = this.symbolTextures.get(id);
    if (!texture) throw new Error(`Symbol texture not loaded: ${id}`);
    return texture;
  }

  getParticleTexture(name: ParticleTextureName): Texture {
    const texture = this.particleTextures.get(name);
    if (!texture) throw new Error(`Particle texture not loaded: ${name}`);
    return texture;
  }

  destroy(): void {
    for (const t of this.symbolTextures.values()) t.destroy(true);
    for (const t of this.blurredSymbolTextures.values()) t.destroy(true);
    for (const t of this.particleTextures.values()) t.destroy(true);
    this.symbolTextures.clear();
    this.blurredSymbolTextures.clear();
    this.particleTextures.clear();
    this.loaded = false;
  }

  // ---- generators -------------------------------------------------------

  private generateSymbolTexture(id: SymbolId): Texture {
    const container = new Container();
    const style = SYMBOL_STYLES[id];
    const g = new Graphics();
    const half = CARD / 2;

    // Card with subtle two-tone gradient look.
    g.roundRect(-half, -half, CARD, CARD, 22).fill({ color: style.bg });
    g.roundRect(-half + 4, -half + 4, CARD - 8, CARD / 2, 18).fill({
      color: style.bg2,
      alpha: 0.55,
    });
    g.roundRect(-half, -half, CARD, CARD, 22).stroke({ color: style.border, width: 4 });
    container.addChild(g);

    const art = new Graphics();
    container.addChild(art);
    this.drawSymbolArt(id, art, container);

    // Render centred inside a SYMBOL_SIZE square.
    const frame = new Container();
    frame.addChild(container);
    container.position.set(SYMBOL_SIZE / 2, SYMBOL_SIZE / 2);
    const bounds = new Graphics().rect(0, 0, SYMBOL_SIZE, SYMBOL_SIZE).fill({
      color: 0x000000,
      alpha: 0.0001,
    });
    frame.addChildAt(bounds, 0);
    const texture = this.renderer!.generateTexture({ target: frame, resolution: 2 });
    frame.destroy({ children: true });
    return texture;
  }

  private label(text: string, size: number, color: number, container: Container, y = 0): void {
    const t = new Text({
      text,
      style: new TextStyle({
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontWeight: '900',
        fontSize: size,
        fill: color,
        stroke: { color: 0x000000, width: Math.max(3, size * 0.08) },
        dropShadow: { color: 0x000000, blur: 4, distance: 3, alpha: 0.6 },
      }),
    });
    t.anchor.set(0.5);
    t.position.set(0, y);
    container.addChild(t);
  }

  private drawSymbolArt(id: SymbolId, g: Graphics, container: Container): void {
    switch (id) {
      case 'WILD':
        g.star(0, 0, 8, 52, 40).fill({ color: 0xffc93c, alpha: 0.25 });
        this.label('WILD', 34, 0xffe066, container);
        break;
      case 'SCATTER':
        g.star(0, -6, 5, 44, 20).fill({ color: 0xff6ec7 });
        g.star(0, -6, 5, 44, 20).stroke({ color: 0xffd7ef, width: 3 });
        this.label('SCATTER', 16, 0xffd7ef, container, 44);
        break;
      case 'BONUS':
        g.roundRect(-34, -18, 68, 46, 8).fill({ color: 0x9d5cff });
        g.roundRect(-38, -30, 76, 16, 6).fill({ color: 0xb98aff });
        g.rect(-7, -30, 14, 58).fill({ color: 0xffe066 });
        this.label('BONUS', 16, 0xe6d6ff, container, 46);
        break;
      case 'SEVEN':
        this.label('7', 78, 0xff4d4d, container, -2);
        break;
      case 'BELL': {
        g.moveTo(-32, 26)
          .quadraticCurveTo(-30, -34, 0, -38)
          .quadraticCurveTo(30, -34, 32, 26)
          .closePath()
          .fill({ color: 0xffd166 });
        g.roundRect(-38, 24, 76, 10, 5).fill({ color: 0xffb84d });
        g.circle(0, 42, 8).fill({ color: 0xffb84d });
        g.circle(-10, -14, 8).fill({ color: 0xffe9b3, alpha: 0.8 });
        break;
      }
      case 'DIAMOND':
        g.poly([0, -42, 40, 0, 0, 42, -40, 0]).fill({ color: 0x4dd6ff });
        g.poly([0, -42, 40, 0, 0, 0]).fill({ color: 0x99e8ff, alpha: 0.7 });
        g.poly([0, -42, 40, 0, 0, 42, -40, 0]).stroke({ color: 0xd6f5ff, width: 3 });
        break;
      case 'CHERRY':
        g.moveTo(-14, 12).quadraticCurveTo(-4, -34, 18, -40).stroke({ color: 0x67c05a, width: 5 });
        g.moveTo(16, 16).quadraticCurveTo(16, -20, 18, -40).stroke({ color: 0x67c05a, width: 5 });
        g.ellipse(24, -42, 14, 7).fill({ color: 0x67c05a });
        g.circle(-16, 18, 18).fill({ color: 0xff2e4d });
        g.circle(18, 22, 18).fill({ color: 0xd6203c });
        g.circle(-21, 12, 6).fill({ color: 0xff8fa3, alpha: 0.9 });
        break;
      case 'LEMON':
        g.ellipse(0, 0, 42, 30).fill({ color: 0xf4e04d });
        g.poly([40, -6, 52, -10, 44, 2]).fill({ color: 0xf4e04d });
        g.ellipse(-12, -8, 14, 8).fill({ color: 0xfff7b3, alpha: 0.8 });
        break;
      case 'ORANGE':
        g.circle(0, 2, 36).fill({ color: 0xff9a2e });
        g.ellipse(-12, -10, 12, 8).fill({ color: 0xffc891, alpha: 0.85 });
        g.ellipse(6, -36, 12, 6).fill({ color: 0x67c05a });
        break;
      case 'PLUM':
        g.circle(-10, 6, 26).fill({ color: 0x9b30d9 });
        g.circle(12, 8, 24).fill({ color: 0x7a1fb8 });
        g.moveTo(2, -16).quadraticCurveTo(6, -34, 16, -40).stroke({ color: 0x67c05a, width: 5 });
        g.circle(-18, -2, 7).fill({ color: 0xc98ae8, alpha: 0.9 });
        break;
      case 'MYSTERY':
        this.label('?', 70, 0xb8b8ff, container, -2);
        break;
    }
  }

  private generateParticleTexture(name: ParticleTextureName): Texture {
    const g = new Graphics();
    switch (name) {
      case 'coin':
        g.ellipse(0, 0, 22, 22).fill({ color: 0xffc93c });
        g.ellipse(0, 0, 22, 22).stroke({ color: 0xb8860b, width: 3 });
        g.ellipse(0, 0, 14, 14).stroke({ color: 0xffe066, width: 3 });
        g.rect(-3, -9, 6, 18).fill({ color: 0xb8860b });
        break;
      case 'star':
        g.star(0, 0, 5, 18, 8).fill({ color: 0xfff3b3 });
        break;
      case 'sparkle':
        g.poly([0, -16, 4, -4, 16, 0, 4, 4, 0, 16, -4, 4, -16, 0, -4, -4]).fill({
          color: 0xffffff,
        });
        break;
      case 'fire':
        g.circle(0, 0, 14).fill({ color: 0xff7a2e });
        g.circle(0, 2, 8).fill({ color: 0xffd166 });
        break;
      case 'smoke':
        g.circle(0, 0, 18).fill({ color: 0x888899, alpha: 0.5 });
        g.circle(8, -6, 12).fill({ color: 0xaaaabb, alpha: 0.4 });
        break;
      case 'magic':
        g.circle(0, 0, 10).fill({ color: 0xc44dff });
        g.star(0, 0, 4, 18, 4).fill({ color: 0xe8b3ff, alpha: 0.8 });
        break;
    }
    const texture = this.renderer!.generateTexture({ target: g, resolution: 2 });
    g.destroy();
    return texture;
  }
}

export const assetManager = new AssetManager();
