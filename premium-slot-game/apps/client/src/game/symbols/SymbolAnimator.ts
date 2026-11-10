import gsap from 'gsap';
import type { Container, Texture } from 'pixi.js';
import type { SymbolId } from '@neon/game-math';
import type { AudioManager } from '../audio/AudioManager';
import type { ParticleManager } from '../particles/ParticleManager';
import type { SymbolView } from './SymbolView';
import { SYMBOL_PX } from '../assets/AssetFactory';
import { SYMBOL_SIZE } from '../core/constants';

const BASE = SYMBOL_SIZE / SYMBOL_PX;

const IDLE_GLOW: Partial<Record<SymbolId, number>> = {
  WILD: 0.6,
  SCATTER: 0.6,
  BONUS: 0.55,
  HERO: 0.22,
  HACKER: 0.22,
  FIGHTER: 0.2,
  SOLDIER: 0.2,
  RIFLE: 0.25,
  BLASTER: 0.25,
  HELMET: 0.25,
  GRENADE: 0.25,
  BATTERY: 0.25,
  HOLO: 0.25,
};

/**
 * Symbol-level animation: idle glow for premium/special symbols, special landing effects
 * for WILD/SCATTER/BONUS and win pulses.
 */
export class SymbolAnimator {
  private idle: SymbolView[] = [];
  private t = 0;

  constructor(
    private readonly particles: ParticleManager,
    private readonly fxContainer: Container,
    private readonly tex: { spark: Texture; ring: Texture; star: Texture },
    private readonly audio: AudioManager,
  ) {}

  clearIdle() {
    this.idle.forEach((v) => (v.glow.alpha = 0));
    this.idle = [];
  }

  /** Registers idle animations for a reel's visible views and plays special landing effects. */
  onReelLanded(views: SymbolView[]) {
    for (const v of views) {
      if (IDLE_GLOW[v.symbolId]) this.idle.push(v);
      const pos = v.getGlobalPosition();
      const local = this.fxContainer.toLocal(pos);
      if (v.symbolId === 'WILD') {
        gsap.fromTo(v.sprite.scale, { x: 0.35, y: 0.35 }, { x: BASE, y: BASE, duration: 0.4, ease: 'back.out(3)' });
        this.particles.emit({ texture: this.tex.spark, x: local.x, y: local.y, count: 14, container: this.fxContainer, speed: [0.1, 0.35], life: [300, 600], scale: [0.15, 0.35], tint: [0x29e6ff, 0xffffff], additive: true });
        this.audio.play('wildLand');
      } else if (v.symbolId === 'SCATTER') {
        gsap.fromTo(v.glow, { alpha: 1.6 }, { alpha: 0.6, duration: 0.6 });
        this.particles.emit({ texture: this.tex.ring, x: local.x, y: local.y, count: 1, container: this.fxContainer, speed: [0, 0], life: [500, 500], scale: [0.6, 0.6], scaleEnd: 3, tint: 0xff2bd6, additive: true });
        this.particles.emit({ texture: this.tex.star, x: local.x, y: local.y, count: 10, container: this.fxContainer, speed: [0.1, 0.3], life: [400, 700], scale: [0.15, 0.3], tint: [0xff2bd6, 0x29e6ff], additive: true, spin: 0.01 });
        this.audio.play('scatterLand');
      } else if (v.symbolId === 'BONUS') {
        gsap.fromTo(v.sprite.scale, { x: 0.8, y: 0.8 }, { x: BASE, y: BASE, duration: 0.45, ease: 'elastic.out(1, 0.5)' });
        this.particles.emit({ texture: this.tex.spark, x: local.x, y: local.y, count: 24, container: this.fxContainer, speed: [0.2, 0.6], life: [300, 700], scale: [0.15, 0.4], tint: [0xffb020, 0xff7a1a, 0xffffff], additive: true, drag: 0.003 });
        this.audio.play('bonusLand');
      }
    }
  }

  /** Re-scan after cascades. */
  registerIdle(views: SymbolView[]) {
    this.clearIdle();
    for (const v of views) if (IDLE_GLOW[v.symbolId]) this.idle.push(v);
  }

  pulseWin(views: SymbolView[], durationMs: number) {
    views.forEach((v) => {
      gsap.fromTo(v.scale, { x: 1, y: 1 }, { x: 1.12, y: 1.12, duration: 0.22, yoyo: true, repeat: Math.max(1, Math.round(durationMs / 440) * 2 - 1), ease: 'sine.inOut' });
      gsap.to(v.glow, { alpha: 1, duration: 0.2 });
    });
  }

  update(dtMs: number) {
    this.t += dtMs;
    for (let i = 0; i < this.idle.length; i++) {
      const v = this.idle[i];
      const base = IDLE_GLOW[v.symbolId] ?? 0;
      v.glow.alpha = base * (0.65 + 0.35 * Math.sin(this.t * 0.004 + i));
    }
  }
}
