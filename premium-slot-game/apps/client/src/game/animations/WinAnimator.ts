import gsap from 'gsap';
import { Container, FillGradient, Graphics, Text } from 'pixi.js';
import type { Position, WaysWin } from '@neon/game-math';
import { FONT_DISPLAY } from '../assets/AssetFactory';
import { CELL_H, CELL_W, GRID_H, GRID_W } from '../core/constants';
import { formatCredits } from '../../services/format';
import type { ReelManager } from '../reels/ReelManager';
import type { SymbolAnimator } from '../symbols/SymbolAnimator';
import type { SymbolView } from '../symbols/SymbolView';

const key = (p: Position) => `${p.reel}:${p.row}`;

/**
 * Winning symbol presentation: dims non-winners, draws animated neon frames on winners,
 * pulses them and pops the win amount.
 */
export class WinAnimator {
  readonly layer = new Container();
  private readonly framePool: Graphics[] = [];
  private readonly activeFrames: Graphics[] = [];
  private readonly amount: Text;
  private readonly sub: Text;
  private tweens: gsap.core.Animation[] = [];

  constructor(
    private readonly reels: ReelManager,
    private readonly symbols: SymbolAnimator,
  ) {
    const gold = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: '#fffbe0' },
        { offset: 0.45, color: '#ffd23a' },
        { offset: 1, color: '#ff7a1a' },
      ],
      textureSpace: 'local',
    });
    this.amount = new Text({
      text: '',
      style: {
        fontFamily: FONT_DISPLAY,
        fontWeight: '900',
        fontSize: 92,
        fill: gold,
        stroke: { color: '#2a0636', width: 10, join: 'round' },
        dropShadow: { color: '#ff2bd6', blur: 18, distance: 0, alpha: 0.9 },
        letterSpacing: 2,
      },
    });
    this.amount.anchor.set(0.5);
    this.amount.position.set(GRID_W / 2, GRID_H / 2);
    this.amount.visible = false;
    this.sub = new Text({
      text: '',
      style: { fontFamily: FONT_DISPLAY, fontWeight: '700', fontSize: 30, fill: '#29e6ff', stroke: { color: '#06021a', width: 6 }, letterSpacing: 3 },
    });
    this.sub.anchor.set(0.5);
    this.sub.position.set(GRID_W / 2, GRID_H / 2 + 72);
    this.sub.visible = false;
    this.layer.addChild(this.amount, this.sub);
  }

  private frame(): Graphics {
    const g = this.framePool.pop() ?? new Graphics();
    this.layer.addChildAt(g, 0);
    this.activeFrames.push(g);
    return g;
  }

  /** Highlights all winning positions of a cascade step. */
  highlight(wins: WaysWin[], stepWin: number, multiplier: number, durationMs: number, big = false) {
    this.clear(false);
    const winning = new Set<string>();
    wins.forEach((w) => w.positions.forEach((p) => winning.add(key(p))));
    const winViews: SymbolView[] = [];
    for (const reel of this.reels.reels) {
      reel.visibleViews().forEach((v, row) => {
        const isWin = winning.has(`${reel.index}:${row}`);
        if (isWin) winViews.push(v);
        this.tweens.push(gsap.to(v, { alpha: isWin ? 1 : 0.28, duration: 0.2 }));
        if (isWin) {
          const g = this.frame();
          const special = v.symbolId === 'WILD';
          const color = special ? 0x29e6ff : big ? 0xffb020 : 0xff7a1a;
          g.clear();
          g.roundRect(-CELL_W / 2 + 6, -CELL_H / 2 + 4, CELL_W - 12, CELL_H - 8, 16).stroke({ width: 14, color, alpha: 0.25 });
          g.roundRect(-CELL_W / 2 + 6, -CELL_H / 2 + 4, CELL_W - 12, CELL_H - 8, 16).stroke({ width: 4, color: 0xfff1a0, alpha: 1 });
          g.position.set(reel.index * CELL_W + CELL_W / 2, row * CELL_H + CELL_H / 2);
          g.blendMode = 'add';
          g.alpha = 0;
          this.tweens.push(gsap.to(g, { alpha: 1, duration: 0.15 }));
          this.tweens.push(gsap.to(g, { alpha: 0.45, duration: 0.3, yoyo: true, repeat: -1, delay: 0.15, ease: 'sine.inOut' }));
        }
      });
    }
    this.symbols.pulseWin(winViews, durationMs);
    if (stepWin > 0) {
      this.amount.text = formatCredits(stepWin);
      this.amount.visible = true;
      this.amount.alpha = 0;
      this.tweens.push(gsap.fromTo(this.amount, { alpha: 0 }, { alpha: 1, duration: 0.2 }));
      this.tweens.push(gsap.fromTo(this.amount.scale, { x: 0.4, y: 0.4 }, { x: 1, y: 1, duration: 0.45, ease: 'back.out(2.2)' }));
      const ways = wins.reduce((a, w) => a + w.ways, 0);
      this.sub.text = multiplier > 1 ? `x${multiplier} MULTIPLIER  •  ${ways} WAYS` : `${ways} WAY${ways === 1 ? '' : 'S'}`;
      this.sub.visible = true;
      this.tweens.push(gsap.fromTo(this.sub, { alpha: 0 }, { alpha: 1, duration: 0.3, delay: 0.15 }));
    }
  }

  /** Highlights scatter/bonus positions (no amount). */
  highlightPositions(positions: Position[], color: number) {
    this.clear(false);
    const set = new Set(positions.map(key));
    for (const reel of this.reels.reels)
      reel.visibleViews().forEach((v, row) => {
        const on = set.has(`${reel.index}:${row}`);
        this.tweens.push(gsap.to(v, { alpha: on ? 1 : 0.3, duration: 0.2 }));
        if (on) {
          const g = this.frame();
          g.clear();
          g.circle(0, 0, CELL_H * 0.55).stroke({ width: 16, color, alpha: 0.3 });
          g.circle(0, 0, CELL_H * 0.55).stroke({ width: 4, color: 0xffffff });
          g.position.set(reel.index * CELL_W + CELL_W / 2, row * CELL_H + CELL_H / 2);
          g.blendMode = 'add';
          this.tweens.push(gsap.fromTo(g.scale, { x: 0.6, y: 0.6 }, { x: 1, y: 1, duration: 0.4, ease: 'back.out(2)' }));
          this.tweens.push(gsap.fromTo(v.scale, { x: 1, y: 1 }, { x: 1.18, y: 1.18, duration: 0.3, yoyo: true, repeat: 3 }));
        }
      });
  }

  clear(restore = true) {
    this.tweens.forEach((t) => t.kill());
    this.tweens = [];
    while (this.activeFrames.length) {
      const g = this.activeFrames.pop()!;
      g.removeFromParent();
      this.framePool.push(g);
    }
    this.amount.visible = false;
    this.sub.visible = false;
    if (restore)
      for (const reel of this.reels.reels)
        reel.visibleViews().forEach((v) => {
          gsap.to(v, { alpha: 1, duration: 0.2 });
          v.scale.set(1);
        });
  }

  destroy() {
    this.clear(false);
    this.framePool.forEach((g) => g.destroy());
    this.layer.destroy({ children: true });
  }
}
