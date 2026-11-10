import { Container } from 'pixi.js';
import type { Grid, SymbolId } from '@neon/game-math';
import { FRAME_PAD, GRID_H, GRID_W, REELS, ROWS } from '../core/constants';
import type { SymbolFactory } from '../symbols/SymbolFactory';
import { MaskManager } from './MaskManager';
import { Reel } from './Reel';
import type { ReelFrame } from './ReelFrame';

/** Owns the six reels, their masked window and the frame. */
export class ReelManager extends Container {
  readonly reels: Reel[] = [];
  readonly window = new Container();
  readonly fxLayer = new Container();
  private readonly masks = new MaskManager();

  constructor(
    readonly frame: ReelFrame,
    factory: SymbolFactory,
  ) {
    super();
    this.addChild(frame);
    this.window.position.set(FRAME_PAD, FRAME_PAD);
    this.fxLayer.position.set(FRAME_PAD, FRAME_PAD);
    this.addChild(this.window, this.fxLayer);
    const initial: SymbolId[][] = Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => factory.randomFiller()));
    for (let i = 0; i < REELS; i++) {
      const reel = new Reel(i, factory, initial[i]);
      this.reels.push(reel);
      this.window.addChild(reel.container);
    }
    this.masks.apply(this.window, 0, 0, GRID_W, GRID_H, this.window);
  }

  update(dtMs: number) {
    for (const r of this.reels) {
      r.update(dtMs);
      // cull invisible additive glows (saves fill-rate on mobile GPUs)
      for (const v of r.views) v.glow.visible = v.glow.alpha > 0.01;
    }
    this.frame.update(dtMs);
  }

  getGrid(): Grid {
    return this.reels.map((r) => r.visibleSymbols());
  }

  setGrid(grid: Grid) {
    grid.forEach((col, i) => this.reels[i].setSymbols(col));
  }

  destroy() {
    this.reels.forEach((r) => r.destroy());
    this.masks.destroy();
    super.destroy({ children: true });
  }
}
