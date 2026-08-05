import { Container, type Application } from "pixi.js";

import type { GameContext } from "./GameContext";
import type { Scene } from "./scenes/Scene";
import type { ViewportMetrics } from "./types";
import { Logger } from "./utils/Logger";

export type SceneFactory = (ctx: GameContext) => Scene;

/**
 * Owns the active scene and the cross-fade between scenes.
 *
 * Only one scene exists at a time apart from the moment of transition, and the
 * outgoing scene is destroyed the instant its fade completes — scenes are cheap
 * to rebuild and expensive to leak.
 */
export class SceneManager {
  private readonly log = Logger.create("scenes");
  private readonly app: Application;
  private readonly root = new Container();
  private ctx: GameContext | null = null;

  private active: Scene | null = null;
  private transitioning = false;
  private destroyed = false;

  constructor(app: Application) {
    this.app = app;
    this.root.label = "scene-root";
    this.app.stage.addChild(this.root);
  }

  bind(ctx: GameContext): void {
    this.ctx = ctx;
  }

  get current(): Scene | null {
    return this.active;
  }

  /**
   * Swaps in a new scene. Awaits the incoming scene's `enter()` before the old
   * one is torn down, so the player never sees an empty frame.
   */
  async switchTo(factory: SceneFactory, fadeSeconds = 0.35): Promise<Scene | null> {
    if (this.destroyed || !this.ctx) return null;
    if (this.transitioning) {
      this.log.warn("switchTo() during a transition — ignored");
      return this.active;
    }
    this.transitioning = true;

    const outgoing = this.active;
    const incoming = factory(this.ctx);
    incoming.alpha = 0;
    this.root.addChild(incoming);

    await incoming.enter();
    this.active = incoming;

    await new Promise<void>((resolve) => {
      const animation = this.ctx!.animation.timeline({ onComplete: resolve });
      animation.to(incoming, { alpha: 1, duration: fadeSeconds });
      if (outgoing) animation.to(outgoing, { alpha: 0, duration: fadeSeconds }, 0);
    });

    if (outgoing) {
      await outgoing.exit();
      outgoing.destroy();
    }

    this.transitioning = false;
    this.log.info(`entered ${incoming.label}`);
    return incoming;
  }

  layout(metrics: ViewportMetrics): void {
    this.active?.layout(metrics);
  }

  update(deltaSeconds: number): void {
    this.active?.update(deltaSeconds);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.active) {
      void this.active.exit();
      this.active.destroy();
      this.active = null;
    }
    this.root.destroy({ children: true });
    this.ctx = null;
  }
}
