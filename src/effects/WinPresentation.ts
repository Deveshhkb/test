import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import gsap from 'gsap';
import type { PaylineWin } from '@/types';
import { PAYLINES } from '@/config/gameConfig';
import { animations } from '@/animations/AnimationManager';
import type { ReelManager } from '@/reels/ReelManager';
import type { ParticleSystem } from './ParticleSystem';
import { PARTICLE_PRESETS } from './particlePresets';
import { formatCredits } from '@/utils/format';
import { REEL_AREA_HEIGHT, REEL_AREA_WIDTH, REEL_WIDTH, SYMBOL_SIZE } from '@/constants';
import { soundManager } from '@/services/SoundManager';

const LINE_COLORS = [
  0xffc93c, 0xff6ec7, 0x4dd6ff, 0x9d5cff, 0x67e05a, 0xff7a2e, 0xf4e04d, 0xff4d4d,
];

/**
 * Win celebration layer positioned over the reel area: payline traces,
 * symbol glow/scale pulses, particle bursts and a floating win amount.
 */
export class WinPresentation {
  readonly container = new Container();
  private lines = new Graphics();
  private floatLayer = new Container();

  constructor() {
    this.container.addChild(this.lines);
    this.container.addChild(this.floatLayer);
  }

  private cellCenter(reel: number, row: number): { x: number; y: number } {
    return {
      x: reel * REEL_WIDTH + SYMBOL_SIZE / 2,
      y: row * SYMBOL_SIZE + SYMBOL_SIZE / 2,
    };
  }

  /** Particles live in scene space; offset local cell coords by this
   *  container's position. */
  private cellGlobal(reel: number, row: number): { x: number; y: number } {
    const { x, y } = this.cellCenter(reel, row);
    return { x: x + this.container.x, y: y + this.container.y };
  }

  /**
   * Present a batch of line wins simultaneously. Resolves when the
   * celebration completes (about 1.4s, shorter in turbo).
   */
  async show(
    wins: PaylineWin[],
    totalWin: number,
    reelManager: ReelManager,
    particles: ParticleSystem,
    fast = false,
  ): Promise<void> {
    if (wins.length === 0) return;
    soundManager.play('win');

    // Payline traces.
    this.lines.clear();
    this.lines.alpha = 1;
    for (const win of wins) {
      if (win.lineIndex < 0) continue; // scatter has no line
      const color = LINE_COLORS[win.lineIndex % LINE_COLORS.length];
      const rows = PAYLINES[win.lineIndex];
      const start = this.cellCenter(0, rows[0]);
      this.lines.moveTo(start.x - SYMBOL_SIZE * 0.45, start.y);
      for (let reel = 0; reel < rows.length; reel++) {
        const { x, y } = this.cellCenter(reel, rows[reel]);
        this.lines.lineTo(x, y);
      }
      this.lines.stroke({ color, width: 6, alpha: 0.85, cap: 'round', join: 'round' });
    }

    // Symbol pulses, glow and per-cell sparkles.
    const seen = new Set<string>();
    for (const win of wins) {
      for (const [reel, row] of win.positions) {
        const key = `${reel},${row}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const symbol = reelManager.reelAt(reel).symbolAt(row);
        symbol.showGlow(true);
        animations.winPulse(symbol);
        const { x, y } = this.cellGlobal(reel, row);
        particles.emit({ ...PARTICLE_PRESETS.sparkle, x, y });
        particles.emit({ ...PARTICLE_PRESETS.starBurst, count: 10, x, y });
      }
    }

    // Floating total win amount.
    const amount = new Text({
      text: `+${formatCredits(totalWin)}`,
      style: new TextStyle({
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontWeight: '900',
        fontSize: 56,
        fill: 0xffe066,
        stroke: { color: 0x140a00, width: 6 },
        dropShadow: { color: 0x000000, blur: 6, distance: 4, alpha: 0.7 },
      }),
    });
    amount.anchor.set(0.5);
    amount.position.set(REEL_AREA_WIDTH / 2, REEL_AREA_HEIGHT / 2);
    this.floatLayer.addChild(amount);
    const float = animations.floatUp(amount, 70);

    await animations.delay(fast ? 0.7 : 1.5);

    // Teardown.
    gsap.to(this.lines, { alpha: 0, duration: 0.25 });
    for (const win of wins) {
      for (const [reel, row] of win.positions) {
        reelManager.reelAt(reel).symbolAt(row).showGlow(false);
      }
    }
    float.kill(); // may still be mid-flight on fast spins
    amount.removeFromParent();
    amount.destroy();
  }

  clear(): void {
    this.lines.clear();
    this.floatLayer.removeChildren().forEach((c) => c.destroy());
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
