import { ReelSymbol } from './ReelSymbol';

/**
 * Shared pool of ReelSymbol instances used for transient effects
 * (floating copies during cascades / win presentation). Reel slots
 * themselves hold their fixed set of pooled symbols.
 */
export class SymbolPool {
  private free: ReelSymbol[] = [];
  private created = 0;

  acquire(): ReelSymbol {
    const symbol = this.free.pop();
    if (symbol) {
      symbol.resetVisuals();
      symbol.visible = true;
      return symbol;
    }
    this.created += 1;
    return new ReelSymbol();
  }

  release(symbol: ReelSymbol): void {
    symbol.visible = false;
    symbol.removeFromParent();
    this.free.push(symbol);
  }

  get stats(): { created: number; free: number } {
    return { created: this.created, free: this.free.length };
  }

  destroy(): void {
    for (const s of this.free) s.destroy({ children: true });
    this.free = [];
  }
}

export const symbolPool = new SymbolPool();
