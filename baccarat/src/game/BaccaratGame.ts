import { Application, type Ticker } from "pixi.js";

import { AssetLoader } from "./AssetLoader";
import { createConfig, mergeConfig, type DeepPartial, type GameConfig } from "./Config";
import { ServiceContainer, createToken } from "./core/ServiceContainer";
import type { GameContext } from "./GameContext";
import type { GameEventMap } from "./events";
import { AnimationManager } from "./managers/AnimationManager";
import { AudioManager } from "./managers/AudioManager";
import { BetManager } from "./managers/BetManager";
import { CardManager } from "./managers/CardManager";
import { GameManager, createRoundStateMachine } from "./managers/GameManager";
import { HistoryManager } from "./managers/HistoryManager";
import { InputManager } from "./managers/InputManager";
import { ResizeManager } from "./managers/ResizeManager";
import { RoadmapManager } from "./managers/RoadmapManager";
import { LocalRngAdapter } from "./net/LocalRngAdapter";
import { SocketAdapter } from "./net/SocketAdapter";
import type { NetworkAdapter } from "./net/protocol";
import { SceneManager } from "./SceneManager";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
import { LoadingScene } from "./scenes/LoadingScene";
import { GameState, type Unsubscribe, type ViewportMetrics } from "./types";
import { EventBus } from "./utils/EventBus";
import { Logger } from "./utils/Logger";
import { devicePixelRatioCapped } from "./utils/Helpers";

/** DI token for the transport, so an integrator can supply their own. */
export const NETWORK_ADAPTER = createToken<NetworkAdapter>("NetworkAdapter");

export interface BaccaratGameOptions {
  /**
   * Replaces the built-in transport. Receives the resolved config; return any
   * `NetworkAdapter`. Without it the engine uses the local RNG table (or a
   * `SocketAdapter` when `config.network.mode` is `remote`).
   */
  readonly createNetworkAdapter?: (config: GameConfig) => NetworkAdapter;
  /** Skips the boot/loading scenes when the host already showed a splash. */
  readonly skipIntro?: boolean;
}

/**
 * The engine's entire public surface.
 *
 * A host application only ever sees this class: construct it, `init()` it into
 * a DOM element, and `destroy()` it on unmount. Nothing about Pixi, GSAP or the
 * internal managers leaks out, which is what keeps the React integration to a
 * dozen lines and stops framework concerns from reaching the game.
 *
 *     const game = new BaccaratGame();
 *     await game.init(hostElement, { currency: "USD" });
 *     game.on("round:settled", ({ netProfit }) => report(netProfit));
 *     // ...
 *     game.destroy();
 */
export class BaccaratGame {
  private readonly log = Logger.create("engine");
  private readonly bus = new EventBus<GameEventMap>();
  private readonly services = new ServiceContainer();

  private config: GameConfig;
  private options: BaccaratGameOptions = {};

  private app: Application | null = null;
  private host: HTMLElement | null = null;
  private ctx: GameContext | null = null;
  private scenes: SceneManager | null = null;
  private game: GameManager | null = null;

  private assets: AssetLoader | null = null;
  private animation: AnimationManager | null = null;
  private audio: AudioManager | null = null;
  private resizeManager: ResizeManager | null = null;
  private input: InputManager | null = null;
  private network: NetworkAdapter | null = null;

  private tickHandler: ((ticker: Ticker) => void) | null = null;
  private booted = false;
  private paused = false;
  private destroyed = false;
  private initPromise: Promise<void> | null = null;

  constructor(config?: DeepPartial<GameConfig>) {
    this.config = createConfig(config);
    Logger.setLevel(this.config.logLevel);
  }

  /* ================================================================ *
   * Public API
   * ================================================================ */

  /**
   * Boots the engine into `container`. Safe to await; calling twice returns the
   * same promise rather than creating a second renderer.
   */
  init(
    container: HTMLElement,
    config?: DeepPartial<GameConfig>,
    options?: BaccaratGameOptions,
  ): Promise<void> {
    if (this.initPromise) return this.initPromise;
    if (this.destroyed) return Promise.reject(new Error("[baccarat] instance already destroyed"));

    this.config = mergeConfig(this.config, config);
    this.options = options ?? {};
    Logger.setLevel(this.config.logLevel);

    this.initPromise = this.boot(container).catch((error) => {
      this.log.error("init failed", error);
      this.bus.emit("game:error", {
        code: "INIT_FAILED",
        message: error instanceof Error ? error.message : String(error),
        fatal: true,
      });
      throw error;
    });
    return this.initPromise;
  }

  /** Freezes rendering, animation, audio and round production. */
  pause(): void {
    if (!this.booted || this.paused || this.destroyed) return;
    this.paused = true;
    this.app?.ticker.stop();
    this.animation?.pause();
    this.audio?.pause();
    this.game?.pause();
    this.input?.setEnabled(false);
    this.bus.emit("game:paused", undefined);
    this.log.info("paused");
  }

  resume(): void {
    if (!this.booted || !this.paused || this.destroyed) return;
    this.paused = false;
    this.app?.ticker.start();
    this.animation?.resume();
    this.audio?.resume();
    this.game?.resume();
    this.input?.setEnabled(true);
    this.resize();
    this.bus.emit("game:resumed", undefined);
    this.log.info("resumed");
  }

  /** Forces an immediate layout pass. The engine also does this automatically. */
  resize(): void {
    this.resizeManager?.update(true);
  }

  /**
   * Abandons the current round and clears the table, keeping the connection and
   * the shoe. Use it when a host app changes context (a seat change, say).
   */
  reset(): void {
    if (!this.booted) return;
    this.animation?.killAll();
    this.game?.reset();
    this.ctx?.bets.reset();
    this.ctx?.roadmaps.clear();
    this.ctx?.history.clear();
    this.bus.emit("round:reset", undefined);
    this.log.info("reset");
  }

  /**
   * Applies a partial config at runtime. Visual changes (theme, chips, atlas
   * resolution) trigger an atlas rebuild and a full relayout; everything else
   * takes effect on the next round.
   */
  updateConfig(partial: DeepPartial<GameConfig>): void {
    const previous = this.config;
    this.config = mergeConfig(this.config, partial);
    Logger.setLevel(this.config.logLevel);

    if (this.ctx) this.ctx.config = this.config;
    this.animation?.updateConfig(this.config);
    this.audio?.updateConfig(this.config);
    this.resizeManager?.updateConfig(this.config);
    this.ctx?.bets.updateConfig(this.config);
    if (this.network instanceof LocalRngAdapter) this.network.updateConfig(this.config);

    if (this.app) this.app.ticker.maxFPS = this.config.renderer.targetFps;

    const artworkChanged =
      previous.chips !== this.config.chips ||
      previous.theme !== this.config.theme ||
      previous.assets !== this.config.assets;

    const finish = (): void => {
      const scene = this.scenes?.current;
      if (scene instanceof GameScene) scene.applyConfig();
      this.resize();
      // Every sprite now points at the new atlas, so the old one can go.
      this.assets?.disposeStale();
    };

    if (artworkChanged && this.assets) {
      void this.assets.rebuild(this.config).then(finish);
    } else {
      finish();
    }
  }

  /* ---------------------------------------------------------------- *
   * Introspection
   * ---------------------------------------------------------------- */

  on<K extends keyof GameEventMap>(
    event: K,
    handler: (payload: GameEventMap[K]) => void,
  ): Unsubscribe {
    return this.bus.on(event, handler);
  }

  once<K extends keyof GameEventMap>(
    event: K,
    handler: (payload: GameEventMap[K]) => void,
  ): Unsubscribe {
    return this.bus.once(event, handler);
  }

  off<K extends keyof GameEventMap>(event: K, handler: (payload: GameEventMap[K]) => void): void {
    this.bus.off(event, handler);
  }

  get state(): GameState {
    return this.ctx?.state.state ?? GameState.Boot;
  }

  get balance(): number {
    return this.ctx?.bets.currentBalance ?? this.config.startingBalance;
  }

  get metrics(): ViewportMetrics | null {
    return this.ctx?.metrics ?? null;
  }

  get currentConfig(): GameConfig {
    return this.config;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get isReady(): boolean {
    return this.booted;
  }

  /** Escape hatch for advanced hosts. Prefer the events above. */
  get context(): GameContext | null {
    return this.ctx;
  }

  /* ---------------------------------------------------------------- *
   * Teardown
   * ---------------------------------------------------------------- */

  /**
   * Releases everything: tweens, listeners, WebGL context, audio graph, DOM
   * node. The instance cannot be re-initialised afterwards — construct a new
   * one, which is cheap.
   */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.booted = false;

    try {
      this.game?.destroy();
      this.network?.destroy();
      // Cards live inside the scene's display list: return them to the pool
      // before the scene destroys its children out from under them.
      this.ctx?.cards.destroy();
      this.scenes?.destroy();

      if (this.app && this.tickHandler) this.app.ticker.remove(this.tickHandler);
      this.tickHandler = null;

      this.ctx?.bets.destroy();
      this.ctx?.history.destroy();
      this.ctx?.roadmaps.destroy();
      this.ctx?.state.destroy();

      this.input?.destroy();
      this.resizeManager?.destroy();
      this.animation?.destroy();
      this.audio?.destroy();
      this.assets?.destroy();
      this.services.destroy();

      this.bus.emit("game:destroyed", undefined);
      this.bus.setMuted(true);
      this.bus.clear();

      // Destroy the renderer last: everything above may still touch textures.
      this.app?.destroy({ removeView: true }, { children: true, texture: false });
    } catch (error) {
      this.log.error("destroy encountered an error", error);
    } finally {
      this.app = null;
      this.ctx = null;
      this.scenes = null;
      this.game = null;
      this.assets = null;
      this.animation = null;
      this.audio = null;
      this.resizeManager = null;
      this.input = null;
      this.network = null;
      this.host = null;
      this.log.info("destroyed");
    }
  }

  /* ================================================================ *
   * Boot sequence
   * ================================================================ */

  private async boot(container: HTMLElement): Promise<void> {
    this.host = container;

    const app = new Application();
    await app.init({
      width: Math.max(1, container.clientWidth),
      height: Math.max(1, container.clientHeight),
      background: this.config.theme.feltDeep,
      antialias: this.config.renderer.antialias,
      // Pixi only accepts the two GPU hints; "default" means "no hint".
      ...(this.config.renderer.powerPreference === "default"
        ? {}
        : { powerPreference: this.config.renderer.powerPreference }),
      resolution: devicePixelRatioCapped(this.config.renderer.maxResolution),
      autoDensity: true,
      preference: this.config.renderer.preferWebGPU ? "webgpu" : "webgl",
      // The engine drives its own render loop through the ticker below.
      autoStart: false,
    });
    if (this.destroyed) {
      app.destroy({ removeView: true });
      return;
    }

    this.app = app;
    app.ticker.maxFPS = this.config.renderer.targetFps;
    container.appendChild(app.canvas);

    // --- Managers ------------------------------------------------------
    this.animation = new AnimationManager(this.config);
    this.audio = new AudioManager(this.config);
    this.assets = new AssetLoader(app.renderer, this.config);
    this.resizeManager = new ResizeManager(app, this.bus, this.config);
    this.input = new InputManager(app, this.bus, this.audio);
    this.network = this.createNetwork();
    this.services.registerValue(NETWORK_ADAPTER, this.network);

    const state = createRoundStateMachine();
    const bets = new BetManager(this.config, this.bus, this.network);
    const history = new HistoryManager(this.bus);
    const roadmaps = new RoadmapManager(this.bus);

    // The context is assembled in two steps because `CardManager` needs it.
    const ctx = {
      config: this.config,
      metrics: this.resizeManager.current,
      app,
      bus: this.bus,
      services: this.services,
      assets: this.assets,
      state,
      animation: this.animation,
      audio: this.audio,
      bets,
      history,
      roadmaps,
      resize: this.resizeManager,
      input: this.input,
      network: this.network,
    } as GameContext;
    (ctx as { cards: CardManager }).cards = new CardManager(ctx);
    this.ctx = ctx;

    this.scenes = new SceneManager(app);
    this.scenes.bind(ctx);

    // --- Frame loop ----------------------------------------------------
    this.tickHandler = (ticker: Ticker): void => {
      this.scenes?.update(ticker.deltaMS / 1000);
    };
    app.ticker.add(this.tickHandler);
    app.ticker.start();

    // --- Wiring --------------------------------------------------------
    this.bus.on("view:resized", ({ metrics }) => {
      ctx.metrics = metrics;
      this.scenes?.layout(metrics);
    });
    state.onChange((change) => this.bus.emit("state:changed", change));

    this.input.attach(container);
    this.resizeManager.attach(container);

    // --- Scenes --------------------------------------------------------
    this.booted = true;
    this.bus.emit("game:booted", undefined);

    if (!this.options.skipIntro) {
      await this.scenes.switchTo((c) => new BootScene(c), 0.2);
    }

    state.transitionTo(GameState.Loading);
    if (!this.options.skipIntro) {
      await this.scenes.switchTo((c) => new LoadingScene(c), 0.25);
    }

    await this.assets.load((progress) => {
      this.bus.emit("assets:progress", progress);
    });
    if (this.destroyed) return;
    this.bus.emit("assets:complete", undefined);

    state.transitionTo(GameState.Waiting);
    await this.scenes.switchTo((c) => new GameScene(c), 0.4);
    if (this.destroyed) return;

    this.game = new GameManager(ctx);
    await this.game.start();
    if (this.destroyed) return;

    this.resize();
    this.bus.emit("game:ready", undefined);
    this.log.info("ready");
  }

  private createNetwork(): NetworkAdapter {
    if (this.options.createNetworkAdapter) return this.options.createNetworkAdapter(this.config);
    if (this.config.network.mode === "remote") return SocketAdapter.fromConfig(this.config);
    return new LocalRngAdapter(this.config);
  }

  /** The element the canvas was mounted into. */
  get container(): HTMLElement | null {
    return this.host;
  }
}
