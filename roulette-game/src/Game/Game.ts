import { Application, Container, Ticker } from 'pixi.js';

import { SceneManager } from './SceneManager';
import { AssetLoader, AssetBundle, DEFAULT_BUNDLES } from './AssetLoader';
import { TextureFactory } from './TextureFactory';
import { createConfig, mergeConfig, resolveTheme } from './Config';
import { installFonts, uninstallFonts } from './Fonts';

import { BootScene } from '../Scenes/BootScene';
import { LoadingScene } from '../Scenes/LoadingScene';
import { RouletteScene } from '../Scenes/RouletteScene';
import { GameContext } from '../Scenes/Scene';

import { AnimationManager } from '../Managers/AnimationManager';
import { AudioManager } from '../Managers/AudioManager';
import { ResizeManager } from '../Managers/ResizeManager';
import { InputManager } from '../Managers/InputManager';

import { EventBus } from '../Utilities/EventBus';
import { Logger, LogLevel } from '../Utilities/Logger';
import { clamp } from '../Utilities/Math';
import { Localization } from '../Localization';

import {
  GameConfig,
  GameEvent,
  GameState,
  IRouletteGame,
  PartialGameConfig,
  Theme,
} from '../Types';

export interface GameOptions {
  /** Extra asset bundles to load on top of the defaults. */
  bundles?: readonly AssetBundle[];
}

/**
 * The engine.
 *
 * This class *is* the public API surface described in the README - `init`,
 * `destroy`, `pause`, `resume`, `resize`, `reset`, `updateConfig`, `setTheme`,
 * `setLanguage` - and nothing else is exported for a host to call.
 *
 * ## Framework independence
 *
 * There is no framework code anywhere below this line: no hooks, no JSX, no
 * component model. A host hands over a `HTMLElement` and gets a game inside it.
 * That is the whole contract, which is why the identical build runs standalone
 * from `main.ts` and inside a React application from a twelve-line wrapper.
 *
 * ## Teardown
 *
 * `destroy()` is exhaustive and idempotent: ticker, scenes, tweens, textures,
 * audio graph, DOM listeners and the WebGL context all go. This matters far
 * more in a host application than standalone - a React route that mounts and
 * unmounts the table twenty times must not accumulate twenty WebGL contexts,
 * and browsers hard-cap those at around sixteen.
 */
export class Game implements IRouletteGame {
  private readonly log = Logger.create('Game');
  private readonly bus = new EventBus();

  private config: GameConfig;
  private theme: Theme;
  private localization: Localization;

  private app?: Application;
  private container?: HTMLElement;

  private animations?: AnimationManager;
  private audio?: AudioManager;
  private resizeManager?: ResizeManager;
  private inputManager?: InputManager;
  private textures?: TextureFactory;
  private sceneManager?: SceneManager;
  private assetLoader?: AssetLoader;
  private context?: GameContext;
  private rouletteScene?: RouletteScene;

  private paused = false;
  private initialised = false;
  private destroyed = false;
  /** True while `init()` is in flight - guards against a double mount. */
  private initialising = false;

  public constructor(
    config?: PartialGameConfig,
    private readonly options: GameOptions = {},
  ) {
    this.config = createConfig(config);
    this.theme = resolveTheme(this.config.theme);
    this.localization = new Localization(this.config.language);
    this.applyLogLevel();

    // A throwing listener is contained here rather than propagating into
    // whatever emitted the event.
    this.bus.setErrorHandler((event, error) =>
      this.log.error(`listener for ${event} threw`, error),
    );
  }

  /** The event bus - a host's channel for backend integration. */
  public get events(): EventBus {
    return this.bus;
  }

  public getConfig(): Readonly<GameConfig> {
    return this.config;
  }

  public getState(): GameState {
    return this.rouletteScene?.getGameManager().getState() ?? GameState.BOOT;
  }

  /* --------------------------------------------------------------------- */
  /* Lifecycle                                                             */
  /* --------------------------------------------------------------------- */

  /**
   * Mount the game into a DOM element.
   *
   * @param container element to fill. Its size drives the layout; the engine
   *   observes it, so a host resizing the element is enough - no manual
   *   `resize()` call is required.
   */
  public async init(container: HTMLElement, config?: PartialGameConfig): Promise<void> {
    if (this.destroyed) throw new Error('Game has been destroyed; construct a new instance');
    if (this.initialised || this.initialising) {
      this.log.warn('init() called on an already-initialised game - ignoring');
      return;
    }
    this.initialising = true;

    try {
      if (config) {
        this.config = mergeConfig(this.config, config);
        this.theme = resolveTheme(this.config.theme);
        this.localization.setLanguage(this.config.language);
        this.applyLogLevel();
      }

      this.container = container;
      await this.createApplication(container);
      this.createServices();
      await this.runSceneFlow();

      this.initialised = true;
      this.bus.emit(GameEvent.READY);
      this.log.info('ready');
    } catch (error) {
      this.log.error('init failed', error);
      this.bus.emit(GameEvent.ERROR, {
        message: error instanceof Error ? error.message : String(error),
        fatal: true,
      });
      throw error;
    } finally {
      this.initialising = false;
    }
  }

  private async createApplication(container: HTMLElement): Promise<void> {
    const app = new Application();
    const render = this.config.render;

    await app.init({
      // Sized from the container; the ResizeManager takes over immediately.
      width: Math.max(1, container.clientWidth || window.innerWidth),
      height: Math.max(1, container.clientHeight || window.innerHeight),
      backgroundColor: this.theme.backgroundBottom,
      backgroundAlpha: render.backgroundAlpha,
      antialias: render.antialias,
      resolution: render.resolution ?? clamp(window.devicePixelRatio || 1, 1, render.maxResolution),
      autoDensity: true,
      powerPreference: render.highPerformance ? 'high-performance' : 'low-power',
      // The engine drives its own ticker so pause/resume is exact.
      sharedTicker: false,
      preference: 'webgl',
    });

    app.canvas.style.display = 'block';
    app.canvas.style.width = '100%';
    app.canvas.style.height = '100%';
    // Removes the browser's default touch gestures over the table.
    app.canvas.style.touchAction = 'none';

    container.appendChild(app.canvas);
    this.app = app;
  }

  private createServices(): void {
    const app = this.app;
    const container = this.container;
    if (!app || !container) throw new Error('application not created');

    // Bitmap fonts are global to Pixi and reference counted, so several engine
    // instances can share one page without one's teardown blanking another's text.
    installFonts();

    this.animations = new AnimationManager();
    this.audio = new AudioManager(this.config.audio);
    this.textures = new TextureFactory(app.renderer, this.theme);
    this.resizeManager = new ResizeManager(app, container, this.bus, this.config.render);
    this.inputManager = new InputManager(app);
    this.assetLoader = new AssetLoader(this.bus, this.config.assetBaseUrl);
    // Wired before anything bakes, so operator artwork wins wherever it exists.
    this.textures.setAssetLoader(this.assetLoader);
    this.sceneManager = new SceneManager(app.stage as Container, this.animations, this.theme);

    this.context = {
      app,
      bus: this.bus,
      animations: this.animations,
      audio: this.audio,
      resize: this.resizeManager,
      textures: this.textures,
      localization: this.localization,
      config: this.config,
      theme: this.theme,
    };

    // Auto-pause when the tab is hidden: a throttled rAF would otherwise hand
    // the simulation a multi-second delta on return.
    this.inputManager.onVisibilityChange = (visible) => {
      if (visible) this.resume();
      else this.pause();
    };
    this.inputManager.onAction = (action) => this.rouletteScene?.handleInputAction(action);

    this.bus.on(GameEvent.RESIZE, (metrics) => this.sceneManager?.resize(metrics), this);

    app.ticker.maxFPS = this.config.render.maxFPS;
    app.ticker.add(this.tick);
  }

  /** Boot -> Loading -> Table. */
  private async runSceneFlow(): Promise<void> {
    const context = this.context;
    const sceneManager = this.sceneManager;
    const assetLoader = this.assetLoader;
    if (!context || !sceneManager || !assetLoader) throw new Error('services not created');

    // Seed every scene with correct metrics before the first frame.
    sceneManager.resize(this.resizeManager!.getMetrics());

    await sceneManager.switchTo(() => new BootScene(context), 'BootScene', 0);

    const bundles = [...DEFAULT_BUNDLES, ...(this.options.bundles ?? [])];
    await new Promise<void>((resolve) => {
      void sceneManager.switchTo(
        () => {
          const scene = new LoadingScene(context, assetLoader, bundles);
          scene.onComplete = resolve;
          return scene;
        },
        'LoadingScene',
        0.25,
      );
    });

    await sceneManager.switchTo(() => {
      const scene = new RouletteScene(context);
      this.rouletteScene = scene;
      return scene;
    }, 'RouletteScene', 0.4);
  }

  /* --------------------------------------------------------------------- */
  /* Frame                                                                 */
  /* --------------------------------------------------------------------- */

  /**
   * The single ticker callback.
   *
   * `deltaMS` is clamped to 50ms (20fps). Beyond that the browser has stalled -
   * a garbage collection, a tab switch, a blocked main thread - and integrating
   * the real delta would teleport the ball rather than animate it. Slowing down
   * is always preferable to a discontinuity.
   */
  private readonly tick = (ticker: Ticker): void => {
    if (this.paused || this.destroyed) return;
    const deltaSeconds = Math.min(ticker.deltaMS, 50) / 1000;
    this.sceneManager?.update(deltaSeconds);
  };

  /* --------------------------------------------------------------------- */
  /* Public API                                                            */
  /* --------------------------------------------------------------------- */

  public pause(): void {
    if (this.paused || !this.initialised) return;
    this.paused = true;

    this.app?.ticker.stop();
    this.animations?.pause();
    this.audio?.suspend();
    this.sceneManager?.pause();

    this.bus.emit(GameEvent.PAUSED);
    this.log.debug('paused');
  }

  public resume(): void {
    if (!this.paused || !this.initialised) return;
    this.paused = false;

    this.app?.ticker.start();
    this.animations?.resume();
    this.audio?.resume();
    this.sceneManager?.resume();

    this.bus.emit(GameEvent.RESUMED);
    this.log.debug('resumed');
  }

  public isPaused(): boolean {
    return this.paused;
  }

  /**
   * Explicit sizing.
   *
   * Optional: the engine observes its container. Call this only when the host
   * wants to drive the size directly - doing so switches the ResizeManager out
   * of container-observation mode.
   */
  public resize(width: number, height: number): void {
    this.resizeManager?.setSize(width, height);
  }

  /** Abandon the round in progress and return the table to a fresh state. */
  public reset(): void {
    if (!this.initialised) return;
    this.rouletteScene?.resetTable();
    this.log.debug('reset');
  }

  /**
   * Patch the configuration at runtime.
   *
   * Deep-merged, so `{ timing: { bettingDuration: 15 } }` leaves every other
   * timing value alone. A change to `wheel.type` needs a `reset()` to take
   * effect, since the pocket ring and the felt are built from it.
   */
  public updateConfig(config: PartialGameConfig): void {
    this.config = mergeConfig(this.config, config);
    this.applyLogLevel();

    if (this.context) this.context.config = this.config;
    this.audio?.updateConfig(this.config.audio);
    this.resizeManager?.updateRenderConfig(this.config.render);
    this.assetLoader?.setBaseUrl(this.config.assetBaseUrl);
    if (this.app) this.app.ticker.maxFPS = this.config.render.maxFPS;

    if (config.theme !== undefined) this.setTheme(this.config.theme);
    if (config.language !== undefined) this.setLanguage(this.config.language);

    this.sceneManager?.setConfig(this.config);
    this.bus.emit(GameEvent.CONFIG_CHANGE, { config: this.config });
  }

  /**
   * Swap the palette.
   *
   * Every baked texture carries its colours, so the factory's cache is dropped
   * and re-baked. That is a visible cost (a frame or two), which is why theming
   * is an explicit call rather than something the engine does speculatively.
   */
  public setTheme(theme: string | Theme): void {
    this.theme = resolveTheme(theme);
    this.config.theme = typeof theme === 'string' ? theme : theme.name;

    if (this.context) this.context.theme = this.theme;
    this.textures?.setTheme(this.theme);
    this.sceneManager?.setTheme(this.theme);

    if (this.app) this.app.renderer.background.color = this.theme.backgroundBottom;
    this.bus.emit(GameEvent.THEME_CHANGE, { theme: this.theme });
  }

  public setLanguage(language: string): void {
    if (!this.localization.setLanguage(language)) {
      this.log.warn(`unknown language "${language}" - keeping ${this.localization.getLanguage()}`);
      return;
    }
    this.config.language = language;

    this.sceneManager?.setLanguage();
    this.bus.emit(GameEvent.LANGUAGE_CHANGE, { language });
  }

  /**
   * Release everything.
   *
   * Order matters: scenes first (they hold references to managers), then
   * managers, then textures, then the renderer. Reversing that would destroy a
   * texture a scene is still holding.
   */
  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.app?.ticker.remove(this.tick);

    this.sceneManager?.destroy();
    this.rouletteScene = undefined;

    this.inputManager?.destroy();
    this.resizeManager?.destroy();
    this.audio?.destroy();
    this.animations?.destroy();
    void this.assetLoader?.destroy();
    this.textures?.destroy();

    this.bus.emit(GameEvent.DESTROYED);
    this.bus.clear();

    // `removeView` takes the canvas out of the host's DOM; `destroy(true)` on
    // the renderer releases the WebGL context, which browsers cap per page.
    this.app?.destroy({ removeView: true }, { children: true, texture: true });
    this.app = undefined;

    // Drops this instance's reference; the atlases are only released once the
    // last live engine on the page has let go.
    uninstallFonts();

    this.container = undefined;
    this.context = undefined;
    this.initialised = false;
    this.log.info('destroyed');
  }

  private applyLogLevel(): void {
    Logger.setLevel(this.config.debug ? LogLevel.DEBUG : LogLevel.WARN);
  }
}
