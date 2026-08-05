import { Container } from "pixi.js";

import type { GameContext } from "../GameContext";
import type { ViewportMetrics } from "../types";

/**
 * Base class for every scene.
 *
 * A scene owns a slice of the display list and the subscriptions that feed it.
 * `track()` is the important part of the contract: anything registered there is
 * disposed in `destroy()`, which is how the engine guarantees that switching
 * scenes — or unmounting from React — leaves nothing behind.
 */
export abstract class Scene extends Container {
  protected readonly ctx: GameContext;
  private readonly disposers: Array<() => void> = [];
  private entered = false;

  constructor(ctx: GameContext) {
    super();
    this.ctx = ctx;
    this.label = this.constructor.name;
  }

  get isEntered(): boolean {
    return this.entered;
  }

  /** Registers a subscription/teardown to run when the scene is destroyed. */
  protected track(disposer: () => void): void {
    this.disposers.push(disposer);
  }

  async enter(): Promise<void> {
    if (this.entered) return;
    this.entered = true;
    await this.onEnter();
    this.layout(this.ctx.metrics);
  }

  async exit(): Promise<void> {
    if (!this.entered) return;
    this.entered = false;
    await this.onExit();
  }

  protected onEnter(): void | Promise<void> {}
  protected onExit(): void | Promise<void> {}

  /** Called on every viewport change and once on enter. */
  abstract layout(metrics: ViewportMetrics): void;

  /** Optional per-frame hook. Keep it allocation-free. */
  update(_deltaSeconds: number): void {}

  override destroy(): void {
    for (const dispose of this.disposers.splice(0)) {
      try {
        dispose();
      } catch {
        // A failing disposer must not prevent the rest from running.
      }
    }
    super.destroy({ children: true });
  }
}
