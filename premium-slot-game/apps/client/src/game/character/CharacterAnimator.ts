import gsap from 'gsap';
import { Container, Sprite, type Texture } from 'pixi.js';
import { HERO_H, HERO_W } from '../assets/art/characters';

const TEX_SCALE = 1.5; // textures are rasterised at 1.5x

/**
 * Left-side heroine: idle breathing, ponytail sway, gadget glow, and reactions to wins,
 * bonus triggers and boss-fight shots.
 */
export class CharacterAnimator extends Container {
  private readonly body: Sprite;
  private readonly ponytail: Sprite;
  private readonly muzzle: Sprite;
  private readonly rig = new Container();
  private t = 0;
  private reacting: gsap.core.Timeline | null = null;
  /** Gun tip in local (unscaled art) coordinates. */
  static readonly GUN_TIP = { x: 336, y: 92 };

  constructor(tex: { body: Texture; ponytail: Texture; muzzle: Texture }) {
    super();
    this.ponytail = new Sprite(tex.ponytail);
    this.body = new Sprite(tex.body);
    this.muzzle = new Sprite(tex.muzzle);
    for (const s of [this.ponytail, this.body]) s.scale.set(1 / TEX_SCALE);
    // pivot points in art space
    this.ponytail.anchor.set(206 / HERO_W, 96 / HERO_H);
    this.ponytail.position.set(206, 96);
    this.body.anchor.set(0.5, 1);
    this.body.position.set(HERO_W / 2, HERO_H);
    this.muzzle.anchor.set(0.5);
    this.muzzle.blendMode = 'add';
    this.muzzle.position.set(CharacterAnimator.GUN_TIP.x, CharacterAnimator.GUN_TIP.y);
    this.muzzle.scale.set(0.6);
    this.muzzle.alpha = 0.5;
    this.rig.addChild(this.ponytail, this.body, this.muzzle);
    // origin at the feet centre
    this.rig.pivot.set(HERO_W / 2, HERO_H);
    this.addChild(this.rig);
  }

  /** Gun tip in this container's coordinate space. */
  gunTip() {
    return this.toGlobal({ x: CharacterAnimator.GUN_TIP.x - HERO_W / 2, y: CharacterAnimator.GUN_TIP.y - HERO_H });
  }

  update(dtMs: number) {
    this.t += dtMs;
    const breathe = Math.sin(this.t * 0.0021);
    this.body.scale.y = (1 / TEX_SCALE) * (1 + breathe * 0.006);
    this.body.scale.x = (1 / TEX_SCALE) * (1 - breathe * 0.002);
    this.ponytail.rotation = Math.sin(this.t * 0.0017) * 0.045 + Math.sin(this.t * 0.0041) * 0.012;
    this.ponytail.y = 96 - breathe * 3;
    if (!this.reacting?.isActive()) this.muzzle.alpha = 0.4 + 0.25 * Math.sin(this.t * 0.005);
  }

  private react(build: (tl: gsap.core.Timeline) => void) {
    this.reacting?.progress(1).kill();
    this.rig.position.set(0, 0);
    this.rig.scale.set(1);
    this.rig.rotation = 0;
    const tl = gsap.timeline();
    build(tl);
    this.reacting = tl;
  }

  /** Small nod for regular wins. */
  smallWin() {
    this.react((tl) => tl.to(this.rig, { y: -12, duration: 0.15, yoyo: true, repeat: 1, ease: 'power1.out' }));
  }

  /** Jump + muzzle flash for big wins. */
  celebrate(level = 1) {
    this.react((tl) => {
      for (let i = 0; i < 1 + level; i++) {
        tl.to(this.rig, { y: -40 - level * 10, duration: 0.22, ease: 'power2.out' })
          .to(this.muzzle, { alpha: 1, duration: 0.1 }, '<')
          .to(this.muzzle.scale, { x: 1.4, y: 1.4, duration: 0.15 }, '<')
          .to(this.rig, { y: 0, duration: 0.25, ease: 'bounce.out' })
          .to(this.muzzle.scale, { x: 0.6, y: 0.6, duration: 0.3 }, '<');
      }
    });
  }

  /** Lean in when a feature triggers. */
  bonusTrigger() {
    this.react((tl) =>
      tl
        .to(this.rig, { rotation: 0.04, duration: 0.2 })
        .to(this.muzzle, { alpha: 1, duration: 0.1 }, '<')
        .to(this.muzzle.scale, { x: 2, y: 2, duration: 0.25, yoyo: true, repeat: 1 })
        .to(this.rig, { rotation: 0, duration: 0.3 }),
    );
  }

  /** Recoil for the boss fight. */
  shoot() {
    this.react((tl) =>
      tl
        .set(this.muzzle, { alpha: 1 })
        .fromTo(this.muzzle.scale, { x: 2.4, y: 2.4 }, { x: 0.6, y: 0.6, duration: 0.25 })
        .fromTo(this.rig, { x: -10, rotation: -0.02 }, { x: 0, rotation: 0, duration: 0.3, ease: 'elastic.out(1, 0.5)' }, 0),
    );
  }

  destroy() {
    this.reacting?.kill();
    super.destroy({ children: true });
  }
}
