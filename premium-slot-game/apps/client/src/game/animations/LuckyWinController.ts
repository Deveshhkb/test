import gsap from 'gsap';
import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { AudioManager } from '../audio/AudioManager';
import type { CharacterAnimator } from '../character/CharacterAnimator';
import type { ParticleManager } from '../particles/ParticleManager';
import { OverlayScene, chamferPlate, gradient, titleText } from './OverlayScene';

/** Dedicated LUCKY WIN presentation: neon star, energy rings, clovers and coins. */
export class LuckyWinController extends OverlayScene {
  private readonly deco = new Container();
  private readonly fxLayer = new Container();

  constructor(
    private readonly particles: ParticleManager,
    private readonly audio: AudioManager,
    private readonly character: CharacterAnimator,
    private readonly tex: { coin: Texture; clover: Texture; star: Texture; glow: Texture; spark: Texture },
  ) {
    super();
    this.content.addChild(this.deco, this.fxLayer);
  }

  private star(radius: number) {
    const g = new Graphics();
    const pts: number[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? radius : radius * 0.45;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      pts.push(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.poly(pts).fill(gradient(['#fff6c0', '#ffd23a', '#ff7a1a'])).stroke({ width: 8, color: 0xff2bd6 });
    g.poly(pts).stroke({ width: 22, color: 0xff2bd6, alpha: 0.25 });
    return g;
  }

  play(amount: number, turbo: boolean): Promise<void> {
    this.audio.play('luckyWin');
    this.character.celebrate(1);
    const glow = new Sprite(this.tex.glow);
    glow.anchor.set(0.5);
    glow.scale.set(8, 5);
    glow.tint = 0x8b3dff;
    glow.blendMode = 'add';
    this.deco.addChild(glow);

    const rings: Graphics[] = [];
    [[420, 0xff2bd6], [470, 0x8b3dff], [380, 0x29e6ff]].forEach(([r, c], i) => {
      const g = new Graphics().ellipse(0, 0, r as number, (r as number) * 0.32).stroke({ width: 7, color: c as number, alpha: 0.95 });
      g.blendMode = 'add';
      g.rotation = (i - 1) * 0.25;
      g.y = 20;
      this.deco.addChild(g);
      rings.push(g);
      gsap.to(g, { rotation: g.rotation + (i % 2 ? -0.3 : 0.3), duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      gsap.fromTo(g.scale, { x: 0.2, y: 0.2 }, { x: 1, y: 1, duration: 0.6, ease: 'back.out(1.7)', delay: 0.1 * i });
    });

    const star = this.star(80);
    star.y = -230;
    this.deco.addChild(star);
    gsap.fromTo(star.scale, { x: 0, y: 0 }, { x: 1, y: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)', delay: 0.2 });
    gsap.to(star, { rotation: 0.2, duration: 0.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });

    const title = titleText('LUCKY\nWIN', 170, gradient(['#ffffff', '#7fb8ff', '#8b3dff', '#ffd23a']), '#14002a', '#8b3dff');
    title.y = 10;
    this.content.addChild(title);

    const plate = new Graphics();
    chamferPlate(plate, 640, 118, 150, 0xff2bd6);
    this.deco.addChild(plate);
    this.amountText = titleText('0.00', 84, gradient(['#ffffff', '#ffe38a', '#ffb020']), '#14002a', '#ff2bd6', { fontStyle: 'normal' });
    this.amountText.y = 208;
    this.content.addChild(this.amountText);

    const k = turbo ? 0.6 : 1;
    return this.run((tl) => {
      tl.to(this.dim, { alpha: 0.6, duration: 0.3 }, 0)
        .fromTo(title.scale, { x: 0.2, y: 0.2 }, { x: 1, y: 1, duration: 0.55, ease: 'back.out(2)' }, 0.15)
        .call(() => {
          this.startCount(amount, 2.2 * k);
          this.particles.emit({ texture: this.tex.clover, x: 0, y: -40, count: 18, container: this.fxLayer, speed: [0.2, 0.6], life: [900, 1500], scale: [0.25, 0.5], spin: 0.01, gravity: 0.0005 });
          this.every(120, () => {
            this.particles.emit({ texture: this.tex.coin, x: (Math.random() - 0.5) * 900, y: -420, count: 1, container: this.fxLayer, speed: [0.05, 0.15], angle: [Math.PI * 0.45, Math.PI * 0.55], gravity: 0.001, life: [1500, 2000], scale: [0.3, 0.5], scaleEnd: 1, flip: true });
            this.particles.emit({ texture: this.tex.clover, x: (Math.random() - 0.5) * 1000, y: (Math.random() - 0.5) * 500, count: 1, container: this.fxLayer, speed: [0.02, 0.06], life: [800, 1200], scale: [0.15, 0.3], spin: 0.006 });
            this.particles.emit({ texture: this.tex.spark, x: (Math.random() - 0.5) * 900, y: (Math.random() - 0.5) * 400, count: 1, container: this.fxLayer, speed: [0, 0.03], life: [400, 700], scale: [0.1, 0.25], tint: [0x2cff6a, 0xffd23a], additive: true });
          });
        }, [], 0.3)
        .to(title.scale, { x: 1.05, y: 1.05, duration: 0.4, yoyo: true, repeat: 5 }, 0.8);
    }, 3200 * k);
  }

  protected cleanup() {
    for (const c of [...this.deco.children, ...this.content.children]) {
      if (c === this.deco || c === this.fxLayer) continue;
      gsap.killTweensOf(c);
      gsap.killTweensOf(c.scale);
    }
    this.deco.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.content.children.filter((c) => c !== this.deco && c !== this.fxLayer).forEach((c) => c.destroy());
    this.amountText = null;
    this.dim.alpha = 0;
    this.particles.clear();
  }
}
