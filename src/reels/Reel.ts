import { BlurFilter, Container } from 'pixi.js';
import gsap from 'gsap';
import type { SymbolId } from '@/types';
import { ReelSymbol } from './ReelSymbol';
import { mod } from '@/utils/format';
import {
  REEL_ACCEL,
  REEL_OVERSHOOT,
  REEL_STOP_DURATION,
  ROW_COUNT,
  SYMBOL_SIZE,
} from '@/constants';

type ReelState = 'idle' | 'spinup' | 'spinning' | 'stopping' | 'suspended';

/**
 * One reel column with real motion: symbols scroll along an infinite
 * virtual strip. `position` is a float in symbol units that DECREASES while
 * spinning (symbols travel downward, new ones enter from the top).
 *
 * Only ROW_COUNT + 2 pooled ReelSymbol instances exist per reel — they are
 * re-textured as the strip scrolls (object pooling / infinite scroll).
 *
 * Layout invariant: slot i (i = -1 .. ROW_COUNT) shows strip[base + i] at
 * y = (i - frac) * SYMBOL_SIZE, which is continuous across integer
 * boundaries for a decreasing position.
 */
export class Reel {
  readonly container = new Container();
  readonly index: number;

  private strip: SymbolId[];
  private position: number;
  private speed = 0;
  private maxSpeed = 20;
  private state: ReelState = 'idle';
  private slots: ReelSymbol[] = [];
  private blur = new BlurFilter({ strength: 0 });
  private stopTween: gsap.core.Tween | null = null;

  constructor(index: number, strip: SymbolId[]) {
    this.index = index;
    this.strip = [...strip];
    // Start deep inside the strip so positions never go negative in practice.
    this.position = this.strip.length * 1000;

    for (let i = 0; i < ROW_COUNT + 2; i++) {
      const symbol = new ReelSymbol();
      symbol.x = SYMBOL_SIZE / 2;
      this.slots.push(symbol);
      this.container.addChild(symbol);
    }

    this.blur.strengthX = 0;
    this.container.filters = [this.blur];
    this.layout();
  }

  get isBusy(): boolean {
    return this.state !== 'idle' && this.state !== 'suspended';
  }

  /** The ReelSymbol currently displaying a visible row (0..2). */
  symbolAt(row: number): ReelSymbol {
    return this.slots[row + 1];
  }

  /** Instantly show a column of symbols (initial fill / cascade refill). */
  setColumn(column: SymbolId[]): void {
    const base = Math.round(this.position);
    this.position = base;
    for (let row = 0; row < ROW_COUNT; row++) {
      this.strip[mod(base + row, this.strip.length)] = column[row];
    }
    this.layout();
  }

  /** Begin accelerating into a spin. */
  startSpin(maxSpeed: number): void {
    if (this.isBusy) return;
    this.stopTween?.kill();
    this.maxSpeed = maxSpeed;
    this.speed = 0;
    this.state = 'spinup';
  }

  /**
   * Decelerate and settle so `column` lands on the visible rows, with an
   * overshoot bounce. Resolves when the reel has fully settled.
   */
  stopAt(column: SymbolId[], duration = REEL_STOP_DURATION): Promise<void> {
    return new Promise((resolve) => {
      if (this.state !== 'spinup' && this.state !== 'spinning') {
        resolve();
        return;
      }
      this.state = 'stopping';

      // Land a few symbols further along the direction of travel and write
      // the server result into the virtual strip at the landing window.
      const runway = 4;
      const target = Math.floor(this.position) - runway;
      for (let row = 0; row < ROW_COUNT; row++) {
        this.strip[mod(target + row, this.strip.length)] = column[row];
      }

      this.stopTween = gsap.to(this, {
        position: target,
        duration,
        ease: `back.out(${1 + REEL_OVERSHOOT * 4})`,
        onUpdate: () => {
          // Ease the motion blur off as the reel slows.
          const progress = this.stopTween?.progress() ?? 1;
          this.blur.strengthY = Math.max(0, (1 - progress) * this.blurStrength());
        },
        onComplete: () => {
          this.position = target;
          this.speed = 0;
          this.state = 'idle';
          this.blur.strengthY = 0;
          this.layout();
          resolve();
        },
      });
    });
  }

  /** Per-frame integration. dt in seconds. */
  update(dt: number): void {
    if (this.state === 'spinup') {
      this.speed = Math.min(this.maxSpeed, this.speed + REEL_ACCEL * dt);
      this.position -= this.speed * dt;
      if (this.speed >= this.maxSpeed) this.state = 'spinning';
      this.blur.strengthY = this.blurStrength() * (this.speed / this.maxSpeed);
    } else if (this.state === 'spinning') {
      this.position -= this.speed * dt;
    }
    if (this.state !== 'suspended') this.layout();
  }

  /**
   * Suspend strip-driven layout so slot sprites can be tweened directly
   * (cascade removal/refill animation). Call `resumeLayout` afterwards.
   */
  suspendLayout(): void {
    this.state = 'suspended';
  }

  resumeLayout(): void {
    this.state = 'idle';
    for (const slot of this.slots) slot.resetVisuals();
    this.layout();
  }

  private blurStrength(): number {
    return Math.min(10, this.maxSpeed * 0.35);
  }

  private layout(): void {
    const base = Math.floor(this.position);
    const frac = this.position - base;
    for (let i = -1; i <= ROW_COUNT; i++) {
      const slot = this.slots[i + 1];
      slot.setSymbol(this.strip[mod(base + i, this.strip.length)]);
      slot.y = (i - frac) * SYMBOL_SIZE + SYMBOL_SIZE / 2;
    }
  }

  destroy(): void {
    this.stopTween?.kill();
    this.container.destroy({ children: true });
    this.slots = [];
  }
}
