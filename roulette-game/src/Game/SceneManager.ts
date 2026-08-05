import { Container, Graphics } from 'pixi.js';
import { Scene } from '../Scenes/Scene';
import { AnimationManager } from '../Managers/AnimationManager';
import { GameConfig, LayoutMetrics, Theme } from '../Types';
import { Logger } from '../Utilities/Logger';

/** Factory so a scene is only constructed at the moment it is needed. */
export type SceneFactory = () => Scene;

/**
 * Owns the active scene and the transition between scenes.
 *
 * Only one scene is live at a time. A switch fades to an opaque curtain,
 * destroys the outgoing scene *behind* it, builds and lays out the incoming
 * one, then fades back. Doing the teardown under cover means a heavy `init()`
 * never shows as a stutter or a flash of empty stage.
 *
 * Switches are serialised: a request that arrives mid-transition is queued
 * rather than interleaved, which removes the entire class of "two scenes
 * briefly both alive" bugs.
 */
export class SceneManager {
  private readonly log = Logger.create('SceneManager');
  private readonly root = new Container();
  private readonly curtain = new Graphics();

  private current?: Scene;
  private transitioning = false;
  private queued?: { factory: SceneFactory; name: string };
  private metrics?: LayoutMetrics;
  private destroyed = false;

  public constructor(
    stage: Container,
    private readonly animations: AnimationManager,
    private theme: Theme,
  ) {
    stage.addChild(this.root);
    this.curtain.eventMode = 'none';
    this.curtain.alpha = 0;
    this.curtain.visible = false;
    stage.addChild(this.curtain);
  }

  public getCurrent(): Scene | undefined {
    return this.current;
  }

  /* --------------------------------------------------------------------- */
  /* Transitions                                                           */
  /* --------------------------------------------------------------------- */

  /**
   * Switch to a new scene.
   *
   * @param fadeSeconds 0 performs an immediate swap (used for the very first
   *   scene, where there is nothing to fade from).
   */
  public async switchTo(factory: SceneFactory, name: string, fadeSeconds = 0.35): Promise<void> {
    if (this.destroyed) return;

    if (this.transitioning) {
      // Last request wins - an intermediate scene nobody ever saw is pointless.
      this.queued = { factory, name };
      return;
    }

    this.transitioning = true;
    this.log.debug(`switching to ${name}`);

    try {
      if (this.current && fadeSeconds > 0) await this.fadeCurtain(1, fadeSeconds);

      this.current?.destroy();
      this.current = undefined;

      const scene = factory();
      await scene.init();

      // A destroy() racing our await must not leave an orphan scene on screen.
      if (this.destroyed) {
        scene.destroy();
        return;
      }

      this.root.addChild(scene.container);
      this.current = scene;
      if (this.metrics) scene.onResize(this.metrics);

      if (fadeSeconds > 0) await this.fadeCurtain(0, fadeSeconds);
    } catch (error) {
      this.log.error(`failed to switch to ${name}`, error);
      await this.fadeCurtain(0, 0.2);
    } finally {
      this.transitioning = false;

      const next = this.queued;
      this.queued = undefined;
      if (next) void this.switchTo(next.factory, next.name, fadeSeconds);
    }
  }

  private fadeCurtain(to: number, seconds: number): Promise<void> {
    this.drawCurtain();
    this.curtain.visible = true;

    return new Promise((resolve) => {
      this.animations.to(this.curtain, {
        alpha: to,
        duration: seconds,
        ease: to > 0 ? AnimationManager.EASE_UI_OUT : AnimationManager.EASE_UI_IN,
        overwrite: 'auto',
        onComplete: () => {
          if (to === 0) this.curtain.visible = false;
          resolve();
        },
      });
    });
  }

  private drawCurtain(): void {
    const width = this.metrics?.width ?? 0;
    const height = this.metrics?.height ?? 0;

    this.curtain.clear();
    this.curtain.rect(0, 0, width, height).fill({ color: this.theme.backgroundBottom });
  }

  /* --------------------------------------------------------------------- */
  /* Forwarding                                                            */
  /* --------------------------------------------------------------------- */

  public update(deltaSeconds: number): void {
    this.current?.update(deltaSeconds);
  }

  public resize(metrics: LayoutMetrics): void {
    this.metrics = metrics;
    this.drawCurtain();
    this.current?.onResize(metrics);
  }

  public setTheme(theme: Theme): void {
    this.theme = theme;
    this.drawCurtain();
    this.current?.onThemeChange(theme);
  }

  public setLanguage(): void {
    this.current?.onLanguageChange();
  }

  public setConfig(config: GameConfig): void {
    this.current?.onConfigChange(config);
  }

  public pause(): void {
    this.current?.onPause();
  }

  public resume(): void {
    this.current?.onResume();
  }

  public destroy(): void {
    this.destroyed = true;
    this.current?.destroy();
    this.current = undefined;
    this.queued = undefined;
    this.animations.killTweensOf(this.curtain);
    this.curtain.destroy();
    this.root.destroy({ children: true, texture: false });
  }
}
