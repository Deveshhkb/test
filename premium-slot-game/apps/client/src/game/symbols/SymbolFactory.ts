import { SYMBOL_IDS, type SymbolId } from '@neon/game-math';
import { SymbolView, type SymbolTextures } from './SymbolView';

/**
 * Creates and pools SymbolViews. Views are allocated once at startup; spins and cascades
 * only swap textures. Also supplies weighted filler symbols for spinning strips (visual only).
 */
export class SymbolFactory {
  private readonly pool: SymbolView[] = [];
  private fillerBag: SymbolId[] = [];

  constructor(private readonly textures: SymbolTextures) {}

  acquire(): SymbolView {
    return this.pool.pop() ?? new SymbolView(this.textures);
  }

  release(v: SymbolView) {
    v.resetVisual();
    v.removeFromParent();
    this.pool.push(v);
  }

  /** Visual-only filler for blurred spinning reels (never affects outcomes). */
  randomFiller(): SymbolId {
    if (this.fillerBag.length === 0) {
      const regular = SYMBOL_IDS.filter((s) => s !== 'BONUS');
      this.fillerBag = [...regular, ...regular.slice(0, 15)].sort(() => Math.random() - 0.5);
    }
    return this.fillerBag.pop()!;
  }
}
