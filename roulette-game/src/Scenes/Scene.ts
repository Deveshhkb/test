import { Application, Container } from 'pixi.js';
import { EventBus } from '../Utilities/EventBus';
import { AnimationManager } from '../Managers/AnimationManager';
import { AudioManager } from '../Managers/AudioManager';
import { ResizeManager } from '../Managers/ResizeManager';
import { TextureFactory } from '../Game/TextureFactory';
import { Localization } from '../Localization';
import { GameConfig, LayoutMetrics, Theme } from '../Types';

/**
 * Services every scene is handed at construction.
 *
 * This is the engine's dependency-injection seam: a scene reaches for nothing
 * global, so it can be instantiated in isolation with stubs for any of these.
 */
export interface GameContext {
  readonly app: Application;
  readonly bus: EventBus;
  readonly animations: AnimationManager;
  readonly audio: AudioManager;
  readonly resize: ResizeManager;
  readonly textures: TextureFactory;
  readonly localization: Localization;
  /** Live config - re-read after `CONFIG_CHANGE` rather than cached. */
  config: GameConfig;
  theme: Theme;
}

/**
 * Base class for scenes.
 *
 * The contract is deliberately small: build in `init`, lay out in `onResize`,
 * step in `update`, release in `destroy`. Scenes own their display objects and
 * their bus subscriptions, and both are torn down together - that pairing is
 * what makes scene switching leak-free.
 */
export abstract class Scene {
  /** Root display object; added to the stage by the SceneManager. */
  public readonly container = new Container();

  protected constructor(protected readonly context: GameContext) {}

  /** Build display objects and subscribe. Awaited before the scene is shown. */
  public abstract init(): Promise<void>;

  /** Re-layout for new metrics. Called once on entry and on every resize. */
  public abstract onResize(metrics: LayoutMetrics): void;

  /** Per-frame step. `deltaSeconds` is already clamped by the Game ticker. */
  public update(_deltaSeconds: number): void {
    /* Optional - scenes without per-frame work leave this alone. */
  }

  /** Theme swap. Scenes re-skin in place rather than rebuilding. */
  public onThemeChange(_theme: Theme): void {
    /* Optional. */
  }

  /** Language swap - re-read every visible string. */
  public onLanguageChange(): void {
    /* Optional. */
  }

  /** Config patch applied at runtime. */
  public onConfigChange(_config: GameConfig): void {
    /* Optional. */
  }

  public onPause(): void {
    /* Optional. */
  }

  public onResume(): void {
    /* Optional. */
  }

  /**
   * Release everything. Implementations must call `super.destroy()` last, and
   * must unsubscribe from the bus with `bus.offAll(this)`.
   */
  public destroy(): void {
    this.context.bus.offAll(this);
    this.container.destroy({ children: true, texture: false });
  }
}
