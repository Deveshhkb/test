import { Container } from 'pixi.js';
import type { GameEngine } from '@/game/engine/GameEngine';

/**
 * Base class for everything the SceneManager can show (boot/loading screen,
 * the flight scene, …).
 *
 * Lifecycle: `init` (async asset work, once) → `enter` → `update` every
 * frame + `resize` on viewport change → `exit` → `destroy`.
 */
export abstract class Scene {
  /** Root display object; the SceneManager attaches/detaches and fades it. */
  readonly root = new Container();

  protected readonly engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  /** Load assets / build the display tree. Runs before the scene is shown. */
  abstract init(): Promise<void>;

  /** The scene has been attached and its fade-in has started. */
  enter(): void {}

  /** The scene is about to fade out. Stop spawning, keep animating. */
  exit(): void {}

  /**
   * Per-frame update.
   * @param dt      clamped delta time in seconds
   * @param elapsed total engine time in seconds
   */
  abstract update(dt: number, elapsed: number): void;

  /** Viewport changed (resize / rotation). Sizes are CSS pixels. */
  abstract resize(width: number, height: number): void;

  /** Release everything. The scene is never reused afterwards. */
  destroy(): void {
    this.root.destroy({ children: true });
  }
}
