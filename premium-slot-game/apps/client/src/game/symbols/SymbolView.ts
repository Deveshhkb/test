import { Container, Sprite, type Texture } from 'pixi.js';
import type { SymbolId } from '@neon/game-math';
import { SYMBOL_PX } from '../assets/AssetFactory';
import { SYMBOL_SIZE } from '../core/constants';

export const SYMBOL_GLOW: Partial<Record<SymbolId, number>> = {
  WILD: 0x29e6ff,
  SCATTER: 0xff2bd6,
  BONUS: 0xffb020,
  HERO: 0xff2bd6,
  HACKER: 0xff2bd6,
  FIGHTER: 0x29e6ff,
  SOLDIER: 0x29e6ff,
  RIFLE: 0x29e6ff,
  BLASTER: 0xff7a1a,
  HELMET: 0x8b3dff,
  GRENADE: 0x2cff9a,
  BATTERY: 0x2cff9a,
  HOLO: 0x29e6ff,
};

export interface SymbolTextures {
  sharp: Record<SymbolId, Texture>;
  blur: Record<SymbolId, Texture>;
  glow: Texture;
}

/** One pooled reel cell: symbol sprite + additive glow. Never recreated during play. */
export class SymbolView extends Container {
  readonly glow: Sprite;
  readonly sprite: Sprite;
  symbolId: SymbolId = 'A';
  blurred = false;

  constructor(private readonly tex: SymbolTextures) {
    super();
    this.glow = new Sprite(tex.glow);
    this.glow.anchor.set(0.5);
    this.glow.blendMode = 'add';
    this.glow.alpha = 0;
    this.glow.scale.set(2.4);
    this.sprite = new Sprite(tex.sharp.A);
    this.sprite.anchor.set(0.5);
    this.sprite.scale.set(SYMBOL_SIZE / SYMBOL_PX);
    this.addChild(this.glow, this.sprite);
  }

  setSymbol(id: SymbolId, blurred = this.blurred) {
    this.symbolId = id;
    this.blurred = blurred;
    this.sprite.texture = blurred ? this.tex.blur[id] : this.tex.sharp[id];
    this.glow.tint = SYMBOL_GLOW[id] ?? 0xffffff;
  }

  setBlur(blurred: boolean) {
    if (blurred !== this.blurred) this.setSymbol(this.symbolId, blurred);
  }

  resetVisual() {
    this.alpha = 1;
    this.sprite.alpha = 1;
    this.sprite.scale.set(SYMBOL_SIZE / SYMBOL_PX);
    this.sprite.rotation = 0;
    this.sprite.tint = 0xffffff;
    this.glow.alpha = 0;
    this.scale.set(1);
  }
}
