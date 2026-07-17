import { Container, Sprite } from 'pixi.js';
import type { SymbolId } from '@/types';
import { assetManager } from '@/services/AssetManager';
import { SYMBOL_SIZE } from '@/constants';

/**
 * A single pooled symbol cell: sprite + reusable glow backdrop.
 * Instances are created once per reel slot and re-textured forever
 * (object pooling — no allocation during spins).
 */
export class ReelSymbol extends Container {
  readonly sprite: Sprite;
  readonly glow: Sprite;
  private currentId: SymbolId | null = null;

  constructor() {
    super();
    this.glow = new Sprite();
    this.glow.anchor.set(0.5);
    this.glow.visible = false;
    this.glow.scale.set(1.35);
    this.addChild(this.glow);

    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5);
    this.addChild(this.sprite);
  }

  get symbolId(): SymbolId | null {
    return this.currentId;
  }

  setSymbol(id: SymbolId): void {
    if (this.currentId === id) return;
    this.currentId = id;
    this.sprite.texture = assetManager.getSymbolTexture(id);
    this.sprite.width = SYMBOL_SIZE;
    this.sprite.height = SYMBOL_SIZE;
  }

  showGlow(on: boolean): void {
    if (on && this.currentId) {
      this.glow.texture = assetManager.getParticleTexture('magic');
      this.glow.width = SYMBOL_SIZE * 1.25;
      this.glow.height = SYMBOL_SIZE * 1.25;
      this.glow.alpha = 0.8;
    }
    this.glow.visible = on;
  }

  /** Reset transient animation state before reuse. */
  resetVisuals(): void {
    this.scale.set(1);
    this.alpha = 1;
    this.rotation = 0;
    this.showGlow(false);
  }
}
