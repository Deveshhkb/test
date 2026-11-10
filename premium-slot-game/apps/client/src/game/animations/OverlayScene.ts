import gsap from 'gsap';
import { Container, FillGradient, Graphics, Text, type TextStyleOptions } from 'pixi.js';
import { FONT_DISPLAY } from '../assets/AssetFactory';
import { formatCredits } from '../../services/format';

export function gradient(stops: string[]) {
  return new FillGradient({
    type: 'linear',
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: stops.map((color, i) => ({ offset: i / (stops.length - 1), color })),
    textureSpace: 'local',
  });
}

export function titleText(text: string, size: number, fill: FillGradient | string, stroke: string, glow: string, extra: Partial<TextStyleOptions> = {}) {
  const t = new Text({
    text,
    style: {
      fontFamily: FONT_DISPLAY,
      fontWeight: '900',
      fontSize: size,
      fill,
      stroke: { color: stroke, width: Math.round(size * 0.09), join: 'round' },
      dropShadow: { color: glow, blur: size * 0.18, distance: 0, alpha: 1 },
      align: 'center',
      lineHeight: size * 0.92,
      letterSpacing: size * 0.02,
      fontStyle: 'italic',
      ...extra,
    },
  });
  t.anchor.set(0.5);
  return t;
}

/** Pointed-end plate (reference win plates). */
export function chamferPlate(g: Graphics, w: number, h: number, y: number, border: number, accent = 0xffd23a) {
  const pts = (o: number) => [-w / 2 + h / 2 - o, y - o, w / 2 - h / 2 + o, y - o, w / 2 + o, y + h / 2, w / 2 - h / 2 + o, y + h + o, -w / 2 + h / 2 - o, y + h + o, -w / 2 - o, y + h / 2];
  g.poly(pts(12)).stroke({ width: 3, color: accent, alpha: 0.9 });
  g.poly(pts(0)).fill(gradient(['#2a0a50', '#12052a', '#0a0320'])).stroke({ width: 7, color: border });
  g.poly(pts(0)).stroke({ width: 22, color: border, alpha: 0.18 });
  g.moveTo(-w / 2 + h / 2 + 10, y + 8).lineTo(w / 2 - h / 2 - 10, y + 8).stroke({ width: 2, color: 0xffffff, alpha: 0.25 });
  return g;
}

/**
 * Base class for full-screen presentations (win tiers, lucky win, free spins banners).
 * Handles dimming, tap-to-skip, a counting payout and complete cleanup.
 */
export abstract class OverlayScene extends Container {
  protected readonly dim = new Graphics();
  protected readonly content = new Container();
  protected tl: gsap.core.Timeline | null = null;
  protected counter = { v: 0 };
  protected countTween: gsap.core.Tween | null = null;
  private intervals: number[] = [];
  private resolve: (() => void) | null = null;
  private skipLevel = 0;
  protected amountText: Text | null = null;

  constructor() {
    super();
    this.dim.rect(-4000, -4000, 12000, 12000).fill(0x000000);
    this.dim.alpha = 0;
    this.addChild(this.dim, this.content);
    this.visible = false;
    this.eventMode = 'static';
    this.on('pointertap', () => this.skip());
  }

  center(x: number, y: number) {
    this.content.position.set(x, y);
  }

  protected every(ms: number, fn: () => void) {
    this.intervals.push(window.setInterval(fn, ms));
  }

  protected startCount(target: number, duration: number) {
    if (!this.amountText) return;
    this.counter.v = 0;
    this.countTween = gsap.to(this.counter, {
      v: target,
      duration,
      ease: 'power1.out',
      onUpdate: () => {
        this.amountText!.text = formatCredits(Math.floor(this.counter.v));
      },
    });
  }

  /** First tap completes the count, second tap closes. */
  skip() {
    if (!this.visible) return;
    this.skipLevel++;
    if (this.skipLevel === 1 && this.countTween?.isActive()) {
      this.countTween.progress(1);
      this.tl?.timeScale(3);
    } else this.finish();
  }

  protected run(build: (tl: gsap.core.Timeline) => void, holdMs: number): Promise<void> {
    this.visible = true;
    this.skipLevel = 0;
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.tl = gsap.timeline();
      build(this.tl);
      this.tl.call(() => this.finish(), [], `+=${holdMs / 1000}`);
    });
  }

  protected finish() {
    if (!this.resolve) return;
    const done = this.resolve;
    this.resolve = null;
    this.intervals.forEach((i) => clearInterval(i));
    this.intervals = [];
    this.countTween?.progress(1);
    this.tl?.kill();
    gsap.to(this, {
      alpha: 0,
      duration: 0.35,
      onComplete: () => {
        this.visible = false;
        this.alpha = 1;
        this.cleanup();
        done();
      },
    });
  }

  protected abstract cleanup(): void;

  destroy() {
    this.intervals.forEach((i) => clearInterval(i));
    this.tl?.kill();
    this.countTween?.kill();
    super.destroy({ children: true });
  }
}
