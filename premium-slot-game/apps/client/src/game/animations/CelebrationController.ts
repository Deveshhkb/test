import gsap from 'gsap';
import { Container, Graphics, Sprite, type Text, type Texture } from 'pixi.js';
import type { WinTier } from '@neon/game-math';
import type { AudioManager } from '../audio/AudioManager';
import type { CharacterAnimator } from '../character/CharacterAnimator';
import type { ParticleManager } from '../particles/ParticleManager';
import { OverlayScene, gradient, titleText } from './OverlayScene';
import type { ScreenFx } from './ScreenFx';

interface Deps {
  particles: ParticleManager;
  audio: AudioManager;
  character: CharacterAnimator;
  fx: ScreenFx;
  tex: { coin: Texture; spark: Texture; star: Texture; glow: Texture; bolt: Texture; ring: Texture };
}

type Tier = Exclude<WinTier, 'NONE' | 'NORMAL'>;

/** Big / Mega / Epic win celebrations – each tier has its own look, intensity and timing. */
export class CelebrationController extends OverlayScene {
  private readonly deco = new Container();
  private readonly fxLayer = new Container();
  private title: Text | null = null;
  private plate = new Graphics();
  private spinners: Container[] = [];
  viewW = 1920;
  viewH = 1080;

  constructor(private readonly d: Deps) {
    super();
    this.content.addChild(this.deco, this.plate, this.fxLayer);
  }

  private makeAmount(stroke: string, glow: string) {
    const t = titleText('0.00', 92, gradient(['#ffffff', '#ffe38a', '#ffb020']), stroke, glow, { fontStyle: 'normal' });
    t.position.set(0, 210);
    this.amountText = t;
    this.content.addChild(t);
  }

  private makePlate(color: number, w = 640) {
    this.plate.clear();
    this.plate.roundRect(-w / 2, 150, w, 120, 30).fill({ color: 0x12052a, alpha: 0.92 });
    this.plate.roundRect(-w / 2, 150, w, 120, 30).stroke({ width: 6, color });
    this.plate.roundRect(-w / 2 - 10, 140, w + 20, 140, 36).stroke({ width: 3, color: 0xffd23a, alpha: 0.8 });
  }

  private beams(count: number, colors: number[], length: number, width: number, speed: number) {
    const c = new Container();
    const g = new Graphics();
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const a1 = a - width / 2;
      const a2 = a + width / 2;
      g.moveTo(0, 0)
        .lineTo(Math.cos(a1) * length, Math.sin(a1) * length)
        .lineTo(Math.cos(a2) * length, Math.sin(a2) * length)
        .closePath()
        .fill({ color: colors[i % colors.length], alpha: 0.22 });
    }
    g.blendMode = 'add';
    c.addChild(g);
    this.deco.addChild(c);
    this.spinners.push(c);
    gsap.to(c, { rotation: Math.PI * 2 * Math.sign(speed), duration: Math.abs(1 / speed), repeat: -1, ease: 'none' });
    return c;
  }

  private wing(side: 1 | -1) {
    const g = new Graphics();
    for (let i = 0; i < 5; i++) {
      const y = -60 + i * 26;
      const len = 260 - i * 36;
      g.moveTo(0, y).lineTo(side * len, y - 40 + i * 6).lineTo(side * (len - 30), y + 18).lineTo(0, y + 22).closePath();
      g.fill({ color: i % 2 ? 0xffb020 : 0xffe38a });
      g.stroke({ width: 3, color: 0xff2bd6 });
    }
    g.position.set(side * 210, -40);
    this.deco.addChild(g);
    gsap.fromTo(g.scale, { x: 0.2 }, { x: 1, duration: 0.5, ease: 'back.out(2)', delay: 0.2 });
    gsap.to(g, { rotation: side * -0.08, duration: 0.45, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.7 });
  }

  private coinFountain(intensity: number, fromTop = false) {
    const { particles, tex } = this.d;
    this.every(70, () => {
      if (fromTop) {
        particles.emit({ texture: tex.coin, x: (Math.random() - 0.5) * this.viewW, y: -this.viewH / 2 - 60, count: intensity, container: this.fxLayer, speed: [0.05, 0.2], angle: [Math.PI * 0.4, Math.PI * 0.6], gravity: 0.0012, life: [1800, 2600], scale: [0.35, 0.6], scaleEnd: 1, spin: 0.01, flip: true });
      } else {
        particles.emit({ texture: tex.coin, x: 0, y: 330, count: intensity, container: this.fxLayer, speed: [0.7, 1.25], angle: [-Math.PI * 0.82, -Math.PI * 0.18], gravity: 0.0021, life: [1400, 2000], scale: [0.3, 0.55], scaleEnd: 1, flip: true });
      }
    });
  }

  private burst(count: number, colors: number[], power = 1) {
    const { particles, tex } = this.d;
    particles.emit({ texture: tex.spark, x: 0, y: 0, count, container: this.fxLayer, speed: [0.3 * power, 1.1 * power], life: [500, 1100], scale: [0.2, 0.5], tint: colors, additive: true, drag: 0.002 });
    particles.emit({ texture: tex.star, x: 0, y: 0, count: Math.round(count / 3), container: this.fxLayer, speed: [0.2 * power, 0.8 * power], life: [700, 1300], scale: [0.2, 0.45], tint: colors, additive: true, spin: 0.01 });
  }

  async play(tier: Tier, amount: number, turbo: boolean): Promise<void> {
    const { audio, character, fx, tex } = this.d;
    this.deco.removeChildren();
    this.spinners = [];
    this.alpha = 1;
    character.celebrate(tier === 'EPIC' ? 2 : 1);
    const k = turbo ? 0.6 : 1;

    if (tier === 'BIG') {
      audio.play('bigWin');
      const glow = new Sprite(tex.glow);
      glow.anchor.set(0.5);
      glow.scale.set(9, 6);
      glow.tint = 0xff2bd6;
      glow.blendMode = 'add';
      glow.alpha = 0.6;
      this.deco.addChild(glow);
      this.wing(-1);
      this.wing(1);
      this.title = titleText('BIG\nWIN', 170, gradient(['#fffbe0', '#ffd23a', '#ff8a1a', '#ff2bd6']), '#3a0636', '#ff2bd6');
      this.makePlate(0xff2bd6);
      this.makeAmount('#3a0636', '#ff2bd6');
      this.content.addChild(this.title);
      return this.run((tl) => {
        tl.to(this.dim, { alpha: 0.62, duration: 0.3 }, 0)
          .fromTo(this.title!.scale, { x: 3, y: 3 }, { x: 1, y: 1, duration: 0.5, ease: 'back.out(1.6)' }, 0.05)
          .fromTo(this.title!, { alpha: 0 }, { alpha: 1, duration: 0.25 }, 0.05)
          .call(() => {
            this.burst(40, [0xffd23a, 0xff2bd6, 0xffffff]);
            this.coinFountain(2);
            this.startCount(amount, 2.6 * k);
          }, [], 0.35)
          .to(this.title!.scale, { x: 1.06, y: 1.06, duration: 0.5, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 0.6);
      }, 3600 * k);
    }

    if (tier === 'MEGA') {
      audio.play('megaWin');
      this.beams(12, [0x8b3dff, 0x29e6ff], 1400, 0.16, 0.08);
      const ring = new Graphics().circle(0, 0, 300).stroke({ width: 10, color: 0x29e6ff, alpha: 0.9 }).circle(0, 0, 330).stroke({ width: 3, color: 0xff2bd6 });
      ring.blendMode = 'add';
      ring.scale.set(0.6, 0.6);
      this.deco.addChild(ring);
      gsap.to(ring.scale, { x: 1.05, y: 0.75, duration: 0.6, ease: 'back.out(2)' });
      gsap.to(ring, { alpha: 0.5, duration: 0.4, yoyo: true, repeat: -1 });
      this.title = titleText('MEGA\nWIN', 190, gradient(['#ffffff', '#ff7ae6', '#8b3dff', '#29e6ff']), '#0a0630', '#29e6ff');
      this.makePlate(0x29e6ff, 700);
      this.makeAmount('#0a0630', '#29e6ff');
      this.content.addChild(this.title);
      return this.run((tl) => {
        tl.to(this.dim, { alpha: 0.72, duration: 0.3 }, 0)
          .fromTo(this.title!.scale, { x: 0.1, y: 0.1 }, { x: 1, y: 1, duration: 0.6, ease: 'elastic.out(1, 0.55)' }, 0.1)
          .call(() => {
            fx.shake(16, 0.6);
            fx.flash(0x29e6ff, 0.5);
            this.burst(70, [0x29e6ff, 0x8b3dff, 0xff2bd6, 0xffffff], 1.3);
            this.d.particles.emit({ texture: tex.bolt, x: 0, y: 0, count: 10, container: this.fxLayer, speed: [0.4, 0.9], life: [400, 700], scale: [0.4, 0.8], tint: 0x29e6ff, additive: true, spin: 0.02 });
            this.coinFountain(3);
            this.startCount(amount, 3.6 * k);
          }, [], 0.3)
          .to(this.title!, { rotation: 0.03, duration: 0.25, yoyo: true, repeat: 11, ease: 'sine.inOut' }, 0.8);
      }, 5000 * k);
    }

    // EPIC
    audio.play('epicWin');
    this.beams(18, [0xff2bd6, 0xffd23a, 0x29e6ff], 2200, 0.12, 0.05);
    this.beams(10, [0xffffff, 0x8b3dff], 2200, 0.05, -0.09);
    const halo = new Sprite(tex.glow);
    halo.anchor.set(0.5);
    halo.scale.set(14);
    halo.tint = 0xffd23a;
    halo.blendMode = 'add';
    halo.alpha = 0.5;
    this.deco.addChild(halo);
    gsap.to(halo, { alpha: 0.9, duration: 0.6, yoyo: true, repeat: -1 });
    this.title = titleText('EPIC\nWIN', 220, gradient(['#ffffff', '#ffd23a', '#ff2bd6', '#8b3dff', '#29e6ff']), '#14002a', '#ffd23a');
    this.makePlate(0xffd23a, 760);
    this.makeAmount('#14002a', '#ffd23a');
    this.content.addChild(this.title);
    return this.run((tl) => {
      tl.to(this.dim, { alpha: 0.85, duration: 0.4 }, 0)
        .call(() => fx.flash(0xffffff, 0.9, 0.7), [], 0.1)
        .fromTo(this.title!.scale, { x: 5, y: 5 }, { x: 1, y: 1, duration: 0.7, ease: 'expo.out' }, 0.15)
        .fromTo(this.title!, { alpha: 0 }, { alpha: 1, duration: 0.3 }, 0.15)
        .call(() => {
          fx.shake(24, 0.9);
          this.burst(120, [0xffd23a, 0xff2bd6, 0x29e6ff, 0xffffff], 1.6);
          this.d.particles.emit({ texture: tex.ring, x: 0, y: 0, count: 3, container: this.fxLayer, speed: [0, 0], life: [700, 900], scale: [0.5, 1], scaleEnd: 8, tint: [0xffd23a, 0xff2bd6], additive: true });
          this.coinFountain(3, true);
          this.coinFountain(2);
          this.every(900, () => {
            const x = (Math.random() - 0.5) * this.viewW * 0.8;
            const y = (Math.random() - 0.5) * this.viewH * 0.6;
            this.d.particles.emit({ texture: tex.spark, x, y, count: 30, container: this.fxLayer, speed: [0.2, 0.6], life: [500, 900], scale: [0.15, 0.35], tint: [0xff2bd6, 0x29e6ff, 0xffd23a], additive: true, gravity: 0.0004 });
            audio.play('firework', { volume: 0.4 });
          });
          this.startCount(amount, 5 * k);
        }, [], 0.45)
        .to(this.title!.scale, { x: 1.08, y: 1.08, duration: 0.35, yoyo: true, repeat: 15, ease: 'sine.inOut' }, 1);
    }, 6800 * k);
  }

  protected cleanup() {
    this.spinners.forEach((s) => gsap.killTweensOf(s));
    this.deco.children.forEach((c) => {
      gsap.killTweensOf(c);
      gsap.killTweensOf(c.scale);
    });
    this.deco.removeChildren().forEach((c) => c.destroy({ children: true }));
    if (this.title) {
      gsap.killTweensOf(this.title);
      gsap.killTweensOf(this.title.scale);
      this.title.destroy();
      this.title = null;
    }
    if (this.amountText) {
      this.amountText.destroy();
      this.amountText = null;
    }
    this.dim.alpha = 0;
    this.d.particles.clear();
  }
}
