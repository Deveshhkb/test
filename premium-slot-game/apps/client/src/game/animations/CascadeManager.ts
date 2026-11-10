import gsap from 'gsap';
import { Container, Text, type Texture } from 'pixi.js';
import type { CascadeStep } from '@neon/game-math';
import { FONT_DISPLAY } from '../assets/AssetFactory';
import { CELL_H, CELL_W, GRID_H, GRID_W, type Timing, wait } from '../core/constants';
import type { AudioManager } from '../audio/AudioManager';
import type { ParticleManager } from '../particles/ParticleManager';
import type { ReelManager } from '../reels/ReelManager';
import type { SymbolAnimator } from '../symbols/SymbolAnimator';
import type { WinAnimator } from './WinAnimator';

/**
 * Renders the server-confirmed cascade sequence: highlight → destroy → gravity → refill.
 * The client never decides which symbols fall in; it replays CascadeStep.fills.
 */
export class CascadeManager {
  readonly counter: Text;

  constructor(
    private readonly reels: ReelManager,
    private readonly winAnimator: WinAnimator,
    private readonly symbols: SymbolAnimator,
    private readonly particles: ParticleManager,
    private readonly fxContainer: Container,
    private readonly tex: { spark: Texture; shard: Texture },
    private readonly audio: AudioManager,
  ) {
    this.counter = new Text({
      text: '',
      style: { fontFamily: FONT_DISPLAY, fontWeight: '900', fontSize: 26, fill: '#ffffff', stroke: { color: '#ff2bd6', width: 4 }, letterSpacing: 4, dropShadow: { color: '#ff2bd6', blur: 12, distance: 0 } },
    });
    this.counter.anchor.set(0.5);
    // sits on the bottom frame border, clear of the HUD
    this.counter.position.set(GRID_W / 2, GRID_H + 21);
    this.counter.alpha = 0;
  }

  showCounter(cascadeNumber: number, multiplier: number) {
    this.counter.text = multiplier > 1 ? `CASCADE ${cascadeNumber}  •  x${multiplier}` : `CASCADE ${cascadeNumber}`;
    gsap.killTweensOf(this.counter);
    gsap.fromTo(this.counter, { alpha: 0 }, { alpha: 1, duration: 0.2 });
    gsap.fromTo(this.counter.scale, { x: 1.5, y: 1.5 }, { x: 1, y: 1, duration: 0.35, ease: 'back.out(2)' });
  }

  hideCounter() {
    gsap.to(this.counter, { alpha: 0, duration: 0.3 });
  }

  /** Plays one winning step. Returns after the grid has settled into step.nextGrid. */
  async playStep(step: CascadeStep, timing: Timing, opts: { bigStep?: boolean; cascadeNumber: number }) {
    this.audio.play(step.multiplier > 1 || opts.cascadeNumber > 1 ? 'winCascade' : 'win', { rate: 1 + Math.min(0.5, opts.cascadeNumber * 0.06) });
    this.winAnimator.highlight(step.wins, step.stepWin, step.multiplier, timing.winHighlight, opts.bigStep);
    if (opts.cascadeNumber > 1 || step.multiplier > 1) this.showCounter(opts.cascadeNumber, step.multiplier);
    await wait(timing.winHighlight);
    if (step.removed.length === 0) {
      this.winAnimator.clear();
      return;
    }
    // destroy winners
    this.audio.play('explode', { volume: 0.5 });
    const byReel = new Map<number, number[]>();
    for (const p of step.removed) {
      byReel.set(p.reel, [...(byReel.get(p.reel) ?? []), p.row]);
      const v = this.reels.reels[p.reel].visibleViews()[p.row];
      gsap.to(v.sprite.scale, { x: v.sprite.scale.x * 1.35, y: v.sprite.scale.y * 1.35, duration: 0.22, ease: 'power2.out' });
      gsap.to(v, { alpha: 0, duration: 0.24, delay: 0.06 });
      const x = p.reel * CELL_W + CELL_W / 2;
      const y = p.row * CELL_H + CELL_H / 2;
      this.particles.emit({ texture: this.tex.spark, x, y, count: 10, container: this.fxContainer, speed: [0.15, 0.5], life: [250, 550], scale: [0.12, 0.3], tint: [0xff2bd6, 0x29e6ff, 0xffffff], additive: true, drag: 0.004 });
      this.particles.emit({ texture: this.tex.shard, x, y, count: 5, container: this.fxContainer, speed: [0.2, 0.45], life: [300, 600], scale: [0.15, 0.25], tint: [0xff2bd6, 0x8b3dff], additive: true, spin: 0.02, gravity: 0.0012 });
    }
    await wait(320);
    this.winAnimator.clear(false);
    // gravity + refill with server fills
    await Promise.all(this.reels.reels.map((reel) => reel.cascade(byReel.get(reel.index) ?? [], step.fills[reel.index], timing.cascadeFall)));
    this.reels.reels.forEach((r) => r.visibleViews().forEach((v) => v.resetVisual()));
    this.audio.play('reelStop', { volume: 0.6 });
    this.symbols.registerIdle(this.reels.reels.flatMap((r) => r.visibleViews()));
  }
}
