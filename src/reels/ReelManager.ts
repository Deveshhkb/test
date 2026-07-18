import { Container, Graphics, Ticker } from 'pixi.js';
import gsap from 'gsap';
import type { Cell, Grid } from '@/types';
import { SpinMode } from '@/types';
import { Reel } from './Reel';
import { getReelStrips } from '@/config/gameConfig';
import { soundManager } from '@/services/SoundManager';
import { animations } from '@/animations/AnimationManager';
import {
  ANTICIPATION_EXTRA_TIME,
  REEL_AREA_HEIGHT,
  REEL_AREA_WIDTH,
  REEL_COUNT,
  REEL_MAX_SPEED,
  REEL_MAX_SPEED_TURBO,
  REEL_MIN_SPIN_TIME,
  REEL_MIN_SPIN_TIME_TURBO,
  REEL_STAGGER_START,
  REEL_STAGGER_STOP,
  REEL_STAGGER_STOP_QUICK,
  REEL_STOP_DURATION,
  REEL_WIDTH,
  ROW_COUNT,
  SYMBOL_SIZE,
} from '@/constants';

/**
 * Owns the five reels: staggered spin-up, result-driven staggered stops,
 * scatter anticipation on the last reel, and cascade animations.
 */
export class ReelManager {
  readonly container = new Container();
  /** Unmasked effects layer; the scene positions it over the reel window. */
  readonly overlayContainer = new Container();
  private reels: Reel[] = [];
  private ticker: Ticker | null = null;
  private spinStartedAt = 0;
  private anticipationGlow: Graphics | null = null;

  init(ticker: Ticker): void {
    this.ticker = ticker;
    const strips = getReelStrips();
    for (let i = 0; i < REEL_COUNT; i++) {
      const reel = new Reel(i, strips[i]);
      reel.container.x = i * REEL_WIDTH;
      this.reels.push(reel);
      this.container.addChild(reel.container);
    }

    const mask = new Graphics()
      .rect(0, 0, REEL_AREA_WIDTH, REEL_AREA_HEIGHT)
      .fill({ color: 0xffffff });
    this.container.addChild(mask);
    this.container.mask = mask;

    // Pulsing golden frame over the last reel during scatter anticipation.
    // Lives in the (unmasked) overlay container so it can spill outside the
    // reel window without exposing the overflow symbol rows.
    const lastReelX = (REEL_COUNT - 1) * REEL_WIDTH;
    this.anticipationGlow = new Graphics()
      .roundRect(lastReelX - 6, -6, SYMBOL_SIZE + 12, REEL_AREA_HEIGHT + 12, 14)
      .stroke({ color: 0xffc93c, width: 6, alpha: 0.9 })
      .roundRect(lastReelX - 12, -12, SYMBOL_SIZE + 24, REEL_AREA_HEIGHT + 24, 18)
      .stroke({ color: 0xff6ec7, width: 3, alpha: 0.5 });
    this.anticipationGlow.visible = false;
    this.overlayContainer.addChild(this.anticipationGlow);

    ticker.add(this.update, this);
  }

  get isBusy(): boolean {
    return this.reels.some((r) => r.isBusy);
  }

  reelAt(index: number): Reel {
    return this.reels[index];
  }

  setGrid(grid: Grid): void {
    this.reels.forEach((reel, i) => reel.setColumn(grid[i]));
  }

  /** Spin up all reels with a small left-to-right stagger. */
  startSpin(mode: SpinMode): void {
    const maxSpeed = mode === SpinMode.Turbo ? REEL_MAX_SPEED_TURBO : REEL_MAX_SPEED;
    const stagger = mode === SpinMode.Normal ? REEL_STAGGER_START : 0.04;
    this.spinStartedAt = performance.now();
    soundManager.play('spin');
    this.reels.forEach((reel, i) => {
      gsap.delayedCall(i * stagger, () => reel.startSpin(maxSpeed));
    });
  }

  /**
   * Stop all reels onto the result grid. `anticipation` slow-rolls the last
   * reel (scatter tease). Resolves when every reel has settled.
   */
  async stopSpin(grid: Grid, mode: SpinMode, anticipation = false): Promise<void> {
    // Guarantee a minimum full-speed spin so quick API responses still read
    // as a real spin.
    const minSpin =
      mode === SpinMode.Normal ? REEL_MIN_SPIN_TIME : REEL_MIN_SPIN_TIME_TURBO;
    const elapsed = (performance.now() - this.spinStartedAt) / 1000;
    if (elapsed < minSpin) await animations.delay(minSpin - elapsed);

    const stagger =
      mode === SpinMode.Normal ? REEL_STAGGER_STOP : REEL_STAGGER_STOP_QUICK;

    // Light up the last-reel tease once the other reels have landed.
    if (anticipation && this.anticipationGlow) {
      const glow = this.anticipationGlow;
      gsap.delayedCall((REEL_COUNT - 1) * stagger, () => {
        glow.visible = true;
        glow.alpha = 0;
        gsap.to(glow, { alpha: 1, duration: 0.3, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      });
    }

    const stops: Promise<void>[] = [];
    for (let i = 0; i < REEL_COUNT; i++) {
      const isLast = i === REEL_COUNT - 1;
      const extraDelay = anticipation && isLast ? ANTICIPATION_EXTRA_TIME : 0;
      const delay = i * stagger + extraDelay;
      const duration = anticipation && isLast ? REEL_STOP_DURATION * 1.6 : REEL_STOP_DURATION;
      stops.push(
        new Promise<void>((resolve) => {
          gsap.delayedCall(delay, () => {
            void this.reels[i].stopAt(grid[i], duration).then(() => {
              soundManager.play('reelStop');
              this.squash(this.reels[i]);
              resolve();
            });
          });
        }),
      );
    }
    await Promise.all(stops);
    if (this.anticipationGlow) {
      gsap.killTweensOf(this.anticipationGlow);
      this.anticipationGlow.visible = false;
    }
    soundManager.stopSpinLoop();
  }

  /** Squash & stretch impact on the visible symbols when a reel lands. */
  private squash(reel: Reel): void {
    for (let row = 0; row < ROW_COUNT; row++) {
      const symbol = reel.symbolAt(row);
      gsap.fromTo(
        symbol.scale,
        { x: 1.07, y: 0.86 },
        { x: 1, y: 1, duration: 0.3, ease: 'back.out(2.5)' },
      );
    }
  }

  /**
   * Animate one cascade step: pop the removed cells, then drop the refilled
   * grid in with a bounce.
   */
  async playCascade(removed: Cell[], nextGrid: Grid): Promise<void> {
    soundManager.play('cascade');
    const removedByReel = new Map<number, Set<number>>();
    for (const [reel, row] of removed) {
      if (!removedByReel.has(reel)) removedByReel.set(reel, new Set());
      removedByReel.get(reel)!.add(row);
    }

    for (const reel of this.reels) reel.suspendLayout();

    // 1. Pop out the winning symbols.
    const pops: Promise<void>[] = [];
    for (const [reelIndex, rows] of removedByReel) {
      for (const row of rows) {
        const symbol = this.reels[reelIndex].symbolAt(row);
        pops.push(
          new Promise((resolve) => {
            gsap.to(symbol.scale, {
              x: 0,
              y: 0,
              duration: 0.28,
              ease: 'back.in(2)',
              onComplete: resolve,
            });
          }),
        );
      }
    }
    await Promise.all(pops);

    // 2. Swap in the new grid and drop columns in from above.
    const drops: Promise<void>[] = [];
    this.reels.forEach((reel, reelIndex) => {
      reel.setColumn(nextGrid[reelIndex]);
      for (let row = 0; row < ROW_COUNT; row++) {
        const symbol = reel.symbolAt(row);
        symbol.resetVisuals();
        const targetY = symbol.y;
        symbol.y = targetY - SYMBOL_SIZE * (ROW_COUNT + 1);
        drops.push(
          new Promise((resolve) => {
            gsap.to(symbol, {
              y: targetY,
              duration: 0.45,
              delay: reelIndex * 0.05 + row * 0.04,
              ease: 'bounce.out',
              onComplete: resolve,
            });
          }),
        );
      }
    });
    await Promise.all(drops);

    for (const reel of this.reels) reel.resumeLayout();
  }

  private update(ticker: Ticker): void {
    const dt = ticker.deltaMS / 1000;
    for (const reel of this.reels) reel.update(dt);
  }

  destroy(): void {
    this.ticker?.remove(this.update, this);
    if (this.anticipationGlow) gsap.killTweensOf(this.anticipationGlow);
    for (const reel of this.reels) reel.destroy();
    this.reels = [];
    this.container.destroy({ children: true });
    this.overlayContainer.destroy({ children: true });
  }
}
