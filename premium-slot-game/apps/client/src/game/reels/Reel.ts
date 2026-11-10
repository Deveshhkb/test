import { Container } from 'pixi.js';
import gsap from 'gsap';
import type { SymbolId } from '@neon/game-math';
import { CELL_H, CELL_W, ROWS } from '../core/constants';
import type { SymbolFactory } from '../symbols/SymbolFactory';
import type { SymbolView } from '../symbols/SymbolView';

export type ReelState = 'idle' | 'spinning' | 'stopping' | 'cascading';

/**
 * A single reel strip: ROWS visible cells plus one hidden buffer above and below.
 * `position` is measured in symbols; views wrap from bottom to top as it increases,
 * which produces real vertical symbol movement inside the masked reel container.
 */
export class Reel {
  readonly container = new Container();
  readonly strip = new Container();
  views: SymbolView[] = [];
  private cycles: number[] = [];
  position = 0;
  speed = 0;
  state: ReelState = 'idle';
  private readonly N = ROWS + 2;
  private finalSymbols: SymbolId[] | null = null;
  private stopTarget = 0;
  private tweens: gsap.core.Animation[] = [];

  constructor(
    readonly index: number,
    private readonly factory: SymbolFactory,
    initial: SymbolId[],
  ) {
    this.container.x = index * CELL_W;
    this.container.addChild(this.strip);
    for (let i = 0; i < this.N; i++) {
      const v = factory.acquire();
      v.x = CELL_W / 2;
      const row = i - 1;
      v.setSymbol(row >= 0 && row < ROWS ? initial[row] : factory.randomFiller(), false);
      this.views.push(v);
      this.cycles.push(0);
      this.strip.addChild(v);
    }
    this.apply();
  }

  /** Y of a row's centre (row -1 is the hidden buffer above). */
  static rowY(row: number) {
    return row * CELL_H + CELL_H / 2;
  }

  private apply() {
    const N = this.N;
    for (let i = 0; i < N; i++) {
      const v = this.views[i];
      const p = i + this.position;
      const cycle = Math.floor(p / N);
      if (cycle !== this.cycles[i]) {
        this.cycles[i] = cycle;
        this.onWrap(i, cycle);
      }
      const slot = p - cycle * N;
      v.y = Reel.rowY(slot - 1);
    }
  }

  private onWrap(i: number, cycle: number) {
    const v = this.views[i];
    if (this.state === 'stopping' && this.finalSymbols && cycle === Math.floor((i + this.stopTarget) / this.N)) {
      const row = ((i + this.stopTarget) % this.N) - 1;
      v.setSymbol(row >= 0 && row < ROWS ? this.finalSymbols[row] : this.factory.randomFiller(), this.stopTarget - this.position > 2.2);
    } else {
      v.setSymbol(this.factory.randomFiller(), this.speed > 0.012);
    }
  }

  update(dtMs: number) {
    if (this.state === 'spinning' && this.speed > 0) {
      this.position += this.speed * dtMs;
      this.apply();
    }
  }

  setBlur(b: boolean) {
    this.views.forEach((v) => v.setBlur(b));
  }

  /** Starts the reel: small wind-up, then smooth acceleration to max speed. */
  spin(maxSpeed: number, accel: number, delay = 0): void {
    this.killTweens();
    this.state = 'spinning';
    this.finalSymbols = null;
    this.views.forEach((v) => v.resetVisual());
    const tl = gsap.timeline({ delay });
    tl.to(this.strip, { y: -18, duration: 0.09, ease: 'power1.out' })
      .to(this.strip, { y: 0, duration: 0.08, ease: 'power1.in' })
      .to(this, {
        speed: maxSpeed,
        duration: accel,
        ease: 'power2.in',
        onUpdate: () => {
          if (this.speed > 0.012) this.setBlur(true);
        },
      }, '<');
    this.tweens.push(tl);
  }

  /** Decelerates and lands exactly on `symbols` (top to bottom) with a landing bounce. */
  stop(symbols: SymbolId[], decel: number, bounce: number): Promise<void> {
    return new Promise((resolve) => {
      this.killTweens();
      const speed = Math.max(this.speed, 0.01);
      const distance = Math.max(this.N + 1, (speed * decel * 1000) / 2);
      this.stopTarget = Math.ceil(this.position + distance);
      this.finalSymbols = symbols;
      this.state = 'stopping';
      const overshoot = 0.16;
      const state = { p: this.position };
      const tl = gsap.timeline({
        onComplete: () => {
          this.normalize();
          this.state = 'idle';
          resolve();
        },
      });
      tl.to(state, {
        p: this.stopTarget + overshoot,
        duration: decel,
        ease: 'power2.out',
        onUpdate: () => {
          this.position = state.p;
          if (this.stopTarget - this.position < 2.2) this.setBlur(false);
          this.apply();
        },
      }).to(state, {
        p: this.stopTarget,
        duration: bounce,
        ease: 'back.out(3)',
        onUpdate: () => {
          this.position = state.p;
          this.apply();
        },
      });
      this.speed = 0;
      this.tweens.push(tl);
    });
  }

  /** Re-indexes views so that views[i] sits in slot i and position is 0. */
  normalize() {
    const N = this.N;
    const order = this.views
      .map((v, i) => ({ v, slot: (((i + Math.round(this.position)) % N) + N) % N }))
      .sort((a, b) => a.slot - b.slot)
      .map((x) => x.v);
    this.views = order;
    this.position = 0;
    this.cycles = this.views.map(() => 0);
    this.setBlur(false);
    this.apply();
  }

  /** Visible views top to bottom (only valid when idle). */
  visibleViews(): SymbolView[] {
    return this.views.slice(1, ROWS + 1);
  }

  visibleSymbols(): SymbolId[] {
    return this.visibleViews().map((v) => v.symbolId);
  }

  /** Sets symbols instantly (used for recovery/reconnection). */
  setSymbols(symbols: SymbolId[]) {
    this.killTweens();
    this.state = 'idle';
    this.speed = 0;
    this.normalize();
    this.visibleViews().forEach((v, r) => {
      v.resetVisual();
      v.setSymbol(symbols[r], false);
    });
  }

  /**
   * Cascade gravity: survivors fall to the bottom, recycled views re-enter from the top
   * with the server-provided fill symbols.
   */
  cascade(removedRows: number[], fills: SymbolId[], duration: number): Promise<void> {
    if (removedRows.length === 0) return Promise.resolve();
    this.state = 'cascading';
    const visible = this.visibleViews();
    const removed = new Set(removedRows);
    const survivors = visible.filter((_, r) => !removed.has(r));
    const recycled = visible.filter((_, r) => removed.has(r));
    const missing = recycled.length;
    const newOrder = [...recycled, ...survivors];
    const promises: Promise<void>[] = [];
    recycled.forEach((v, k) => {
      v.resetVisual();
      v.setSymbol(fills[k], false);
      v.y = Reel.rowY(k - missing) - CELL_H * 0.6;
      v.alpha = 1;
    });
    newOrder.forEach((v, row) => {
      const targetY = Reel.rowY(row);
      if (Math.abs(v.y - targetY) < 0.5) return;
      const delay = (ROWS - row) * 0.035;
      promises.push(
        new Promise((res) => {
          const t = gsap.timeline({ delay, onComplete: () => res() });
          t.to(v, { y: targetY + 10, duration, ease: 'power2.in' }).to(v, { y: targetY, duration: 0.14, ease: 'back.out(2.5)' });
          this.tweens.push(t);
        }),
      );
    });
    return Promise.all(promises).then(() => {
      this.views = [this.views[0], ...newOrder, this.views[ROWS + 1]];
      this.position = 0;
      this.cycles = this.views.map(() => 0);
      this.apply();
      this.state = 'idle';
    });
  }

  killTweens() {
    this.tweens.forEach((t) => t.kill());
    this.tweens = [];
  }

  destroy() {
    this.killTweens();
    this.views.forEach((v) => this.factory.release(v));
    this.views = [];
    this.container.destroy({ children: true });
  }
}
