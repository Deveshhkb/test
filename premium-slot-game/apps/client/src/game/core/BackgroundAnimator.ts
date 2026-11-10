import gsap from 'gsap';
import { Container, Sprite, type Texture } from 'pixi.js';
import type { BackgroundVariant } from '../assets/art/background';

/**
 * Cover-scaled city backdrop with restrained ambient motion: neon sign flicker, drifting
 * dust, sweeping searchlights and passing air-car lights. Variants crossfade.
 */
export class BackgroundAnimator extends Container {
  private readonly scene = new Container();
  private readonly layers: Record<BackgroundVariant, Sprite>;
  private readonly signs: Sprite[] = [];
  private readonly dust: { s: Sprite; vx: number; vy: number }[] = [];
  private readonly beams: Sprite[] = [];
  private readonly cars: { s: Sprite; v: number }[] = [];
  private variant: BackgroundVariant = 'base';
  private t = 0;
  private flickerAt = 0;

  constructor(tex: { backgrounds: Record<BackgroundVariant, Texture>; signs: Texture[]; glow: Texture; spark: Texture }) {
    super();
    this.layers = {
      base: new Sprite(tex.backgrounds.base),
      free: new Sprite(tex.backgrounds.free),
      boss: new Sprite(tex.backgrounds.boss),
    };
    Object.values(this.layers).forEach((s, i) => {
      s.alpha = i === 0 ? 1 : 0;
      s.visible = i === 0;
      this.scene.addChild(s);
    });
    // searchlights
    for (let i = 0; i < 2; i++) {
      const b = new Sprite(tex.glow);
      b.anchor.set(0.5, 1);
      b.width = 160;
      b.height = 1300;
      b.position.set(600 + i * 800, 1000);
      b.blendMode = 'add';
      b.alpha = 0.07;
      b.tint = i ? 0x29e6ff : 0xff2bd6;
      this.beams.push(b);
      this.scene.addChild(b);
    }
    const signPos = [
      [1560, 230, 0.55],
      [140, 300, 0.5],
      [980, 140, 0.45],
    ];
    tex.signs.forEach((t, i) => {
      const s = new Sprite(t);
      s.anchor.set(0.5);
      s.position.set(signPos[i][0], signPos[i][1]);
      s.scale.set(signPos[i][2]);
      s.blendMode = 'add';
      s.alpha = 0.85;
      this.signs.push(s);
      this.scene.addChild(s);
    });
    for (let i = 0; i < 36; i++) {
      const s = new Sprite(tex.spark);
      s.anchor.set(0.5);
      s.scale.set(0.05 + Math.random() * 0.08);
      s.position.set(Math.random() * 1920, Math.random() * 1080);
      s.blendMode = 'add';
      s.alpha = 0.25 + Math.random() * 0.4;
      s.tint = [0xff2bd6, 0x29e6ff, 0xffffff][i % 3];
      this.dust.push({ s, vx: (Math.random() - 0.5) * 0.01, vy: -0.006 - Math.random() * 0.014 });
      this.scene.addChild(s);
    }
    for (let i = 0; i < 4; i++) {
      const s = new Sprite(tex.glow);
      s.anchor.set(0.5);
      s.scale.set(0.35, 0.12);
      s.blendMode = 'add';
      s.tint = i % 2 ? 0xff3355 : 0xfff0c0;
      s.position.set(Math.random() * 1920, 180 + i * 90);
      this.cars.push({ s, v: (i % 2 ? -1 : 1) * (0.08 + Math.random() * 0.08) });
      this.scene.addChild(s);
    }
    this.addChild(this.scene);
  }

  /** Cover-fit the 1920x1080 scene to the viewport. */
  resize(vw: number, vh: number) {
    const s = Math.max(vw / 1920, vh / 1080);
    this.scene.scale.set(s);
    this.scene.position.set((vw - 1920 * s) / 2, (vh - 1080 * s) / 2);
  }

  setVariant(v: BackgroundVariant, duration = 0.8) {
    if (v === this.variant) return;
    this.variant = v;
    (Object.keys(this.layers) as BackgroundVariant[]).forEach((k) => {
      const layer = this.layers[k];
      if (k === v) layer.visible = true;
      gsap.to(layer, { alpha: k === v ? 1 : 0, duration, onComplete: () => (layer.visible = k === v) });
    });
  }

  update(dtMs: number) {
    this.t += dtMs;
    this.beams.forEach((b, i) => (b.rotation = Math.sin(this.t * 0.00025 + i * 2) * 0.5));
    if (this.t > this.flickerAt) {
      const s = this.signs[(Math.random() * this.signs.length) | 0];
      if (s) gsap.fromTo(s, { alpha: 0.2 }, { alpha: 0.85, duration: 0.08, repeat: 3, yoyo: true, ease: 'steps(1)' });
      this.flickerAt = this.t + 2500 + Math.random() * 4000;
    }
    for (const d of this.dust) {
      d.s.x += d.vx * dtMs;
      d.s.y += d.vy * dtMs;
      if (d.s.y < -20) {
        d.s.y = 1100;
        d.s.x = Math.random() * 1920;
      }
    }
    for (const c of this.cars) {
      c.s.x += c.v * dtMs;
      if (c.s.x > 2000) c.s.x = -80;
      if (c.s.x < -80) c.s.x = 2000;
    }
  }

  destroy() {
    this.signs.forEach((s) => gsap.killTweensOf(s));
    Object.values(this.layers).forEach((s) => gsap.killTweensOf(s));
    super.destroy({ children: true });
  }
}
