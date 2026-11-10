import gsap from 'gsap';
import { Graphics, type Container } from 'pixi.js';

/** Screen shake and flash effects on the stage root. */
export class ScreenFx {
  private readonly flashRect = new Graphics();
  private shakeTl: gsap.core.Timeline | null = null;

  constructor(
    private readonly target: Container,
    overlay: Container,
  ) {
    this.flashRect.rect(-3000, -3000, 9000, 9000).fill(0xffffff);
    this.flashRect.alpha = 0;
    this.flashRect.eventMode = 'none';
    overlay.addChild(this.flashRect);
  }

  shake(intensity = 10, duration = 0.5) {
    this.shakeTl?.kill();
    const ox = this.target.x;
    const oy = this.target.y;
    const tl = gsap.timeline({ onComplete: () => this.target.position.set(ox, oy) });
    const steps = Math.round(duration / 0.04);
    for (let i = 0; i < steps; i++) {
      const k = intensity * (1 - i / steps);
      tl.to(this.target, { x: ox + (Math.random() - 0.5) * 2 * k, y: oy + (Math.random() - 0.5) * 2 * k, duration: 0.04, ease: 'none' });
    }
    tl.to(this.target, { x: ox, y: oy, duration: 0.04 });
    this.shakeTl = tl;
  }

  flash(color = 0xffffff, alpha = 0.6, duration = 0.45) {
    this.flashRect.tint = color;
    gsap.fromTo(this.flashRect, { alpha }, { alpha: 0, duration, ease: 'power2.out' });
  }

  destroy() {
    this.shakeTl?.kill();
    gsap.killTweensOf(this.flashRect);
  }
}
