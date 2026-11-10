import gsap from 'gsap';
import { Container, Graphics, type Text, type Texture } from 'pixi.js';
import type { AudioManager } from '../audio/AudioManager';
import type { ParticleManager } from '../particles/ParticleManager';
import { OverlayScene, gradient, titleText } from '../animations/OverlayScene';

/** FREE SPINS intro (spins awarded), retrigger banner and completion (total win) screens. */
export class FreeSpinsPresenter extends OverlayScene {
  private readonly deco = new Container();
  private readonly fxLayer = new Container();
  private texts: Text[] = [];

  constructor(
    private readonly particles: ParticleManager,
    private readonly audio: AudioManager,
    private readonly tex: { spark: Texture; star: Texture; coin: Texture },
  ) {
    super();
    this.content.addChild(this.deco, this.fxLayer);
  }

  private frame(color: number) {
    const g = new Graphics();
    g.roundRect(-520, -260, 1040, 520, 40).fill({ color: 0x0b0628, alpha: 0.92 });
    g.roundRect(-520, -260, 1040, 520, 40).stroke({ width: 8, color });
    g.roundRect(-540, -280, 1080, 560, 50).stroke({ width: 3, color: 0x29e6ff, alpha: 0.8 });
    this.deco.addChild(g);
    gsap.fromTo(g.scale, { x: 0.6, y: 0.6 }, { x: 1, y: 1, duration: 0.45, ease: 'back.out(1.8)' });
  }

  private add(t: Text, y: number) {
    t.y = y;
    this.content.addChild(t);
    this.texts.push(t);
    return t;
  }

  intro(spins: number, isRetrigger = false): Promise<void> {
    this.audio.play('freeSpins');
    this.frame(0xff2bd6);
    const title = this.add(titleText(isRetrigger ? 'RETRIGGER!' : 'FREE SPINS', 130, gradient(['#ffffff', '#ff7ae6', '#8b3dff']), '#14002a', '#ff2bd6'), -120);
    const count = this.add(titleText(`${spins}`, 180, gradient(['#ffffff', '#7fe8ff', '#29a8ff']), '#06123a', '#29e6ff', { fontStyle: 'normal' }), 50);
    this.add(titleText(isRetrigger ? 'EXTRA SPINS AWARDED' : 'SPINS AWARDED • MULTIPLIER GROWS WITH EVERY WIN', 30, '#ffffff', '#14002a', '#8b3dff', { fontStyle: 'normal', letterSpacing: 3 }), 190);
    return this.run((tl) => {
      tl.to(this.dim, { alpha: 0.7, duration: 0.3 }, 0)
        .fromTo(title.scale, { x: 0.2, y: 0.2 }, { x: 1, y: 1, duration: 0.6, ease: 'back.out(2)' }, 0.1)
        .fromTo(count.scale, { x: 3, y: 3 }, { x: 1, y: 1, duration: 0.5, ease: 'expo.out' }, 0.45)
        .call(() => {
          this.particles.emit({ texture: this.tex.star, x: 0, y: 40, count: 50, container: this.fxLayer, speed: [0.2, 0.8], life: [700, 1300], scale: [0.2, 0.45], tint: [0xff2bd6, 0x29e6ff, 0xffffff], additive: true, spin: 0.01, drag: 0.002 });
        }, [], 0.5);
    }, 2200);
  }

  outro(totalWin: number, spins: number): Promise<void> {
    this.audio.play('bigWin');
    this.frame(0x29e6ff);
    this.add(titleText('FREE SPINS\nCOMPLETE', 96, gradient(['#ffffff', '#7fe8ff', '#8b3dff']), '#06123a', '#29e6ff'), -130);
    this.add(titleText(`${spins} SPINS PLAYED`, 30, '#ff7ae6', '#14002a', '#ff2bd6', { fontStyle: 'normal', letterSpacing: 4 }), 0);
    this.add(titleText('TOTAL WIN', 40, '#ffffff', '#14002a', '#8b3dff', { fontStyle: 'normal' }), 70);
    this.amountText = this.add(titleText('0.00', 110, gradient(['#ffffff', '#ffe38a', '#ffb020']), '#2a0636', '#ff2bd6', { fontStyle: 'normal' }), 160);
    return this.run((tl) => {
      tl.to(this.dim, { alpha: 0.75, duration: 0.3 }, 0).call(() => {
        this.startCount(totalWin, 2.2);
        this.every(90, () =>
          this.particles.emit({ texture: this.tex.coin, x: (Math.random() - 0.5) * 1000, y: -320, count: 1, container: this.fxLayer, speed: [0.05, 0.15], angle: [Math.PI * 0.45, Math.PI * 0.55], gravity: 0.001, life: [1300, 1800], scale: [0.3, 0.5], scaleEnd: 1, flip: true }),
        );
      }, [], 0.3);
    }, 3400);
  }

  protected cleanup() {
    this.deco.children.forEach((c) => gsap.killTweensOf(c.scale));
    this.deco.removeChildren().forEach((c) => c.destroy());
    this.texts.forEach((t) => {
      gsap.killTweensOf(t.scale);
      t.destroy();
    });
    this.texts = [];
    this.amountText = null;
    this.dim.alpha = 0;
    this.particles.clear();
  }
}
