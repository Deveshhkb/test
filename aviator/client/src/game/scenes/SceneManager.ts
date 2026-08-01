import { Container } from 'pixi.js';
import gsap from 'gsap';
import type { Scene } from './Scene';
import { ENGINE_CONFIG } from '@/config/engine';

/**
 * Owns the active scene and orchestrates GSAP-crossfaded transitions
 * between scenes. Exactly one scene receives updates at a time; during a
 * crossfade both are attached but only the incoming one updates, so the
 * outgoing scene freezes gracefully instead of double-simulating.
 */
export class SceneManager {
  /** Attach this to the Pixi stage. */
  readonly container = new Container();

  private activeScene: Scene | null = null;
  private width = 0;
  private height = 0;
  private destroyed = false;

  async changeScene(next: Scene): Promise<void> {
    await next.init();
    if (this.destroyed) {
      next.destroy();
      return;
    }

    const previous = this.activeScene;
    next.root.alpha = 0;
    next.resize(this.width, this.height);
    this.container.addChild(next.root);
    this.activeScene = next;
    next.enter();

    const duration = ENGINE_CONFIG.sceneTransitionSeconds;
    gsap.to(next.root, { alpha: 1, duration, ease: 'power2.out' });

    if (previous) {
      previous.exit();
      gsap.to(previous.root, {
        alpha: 0,
        duration,
        ease: 'power2.in',
        onComplete: () => {
          gsap.killTweensOf(previous.root);
          previous.destroy();
        },
      });
    }
  }

  update(dt: number, elapsed: number): void {
    this.activeScene?.update(dt, elapsed);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.activeScene?.resize(width, height);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.activeScene) {
      gsap.killTweensOf(this.activeScene.root);
      this.activeScene.destroy();
      this.activeScene = null;
    }
    this.container.destroy({ children: true });
  }
}
