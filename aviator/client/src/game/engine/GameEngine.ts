import { Application, type Ticker } from 'pixi.js';
import type { GamePhase } from '@aviator/shared';
import { EventBus } from './EventBus';
import type { EngineEvents } from './events';
import { createGameStateMachine } from './GameStateMachine';
import type { StateMachine } from './StateMachine';
import { SceneManager } from '@/game/scenes/SceneManager';
import { FlightScene } from '@/game/scenes/FlightScene';
import { RoundDirector } from '@/game/managers/RoundDirector';
import {
  detectQualityTier,
  getQualitySettings,
  type QualitySettings,
  type QualityTier,
} from '@/config/quality';
import { ENGINE_CONFIG } from '@/config/engine';

export interface GameEngineOptions {
  /** DOM element the canvas fills. The engine tracks its size. */
  parent: HTMLElement;
  /** Override auto-detected quality (used by the settings panel later). */
  quality?: QualityTier;
}

/**
 * Composition root of the rendering side of the game.
 *
 * The engine owns the Pixi Application, the frame loop, the scene manager,
 * the round state machine and the round director — and nothing else.
 *
 * Resize pipeline (three independent triggers, one sink):
 *   • ResizeObserver on the host element — catches window resizes,
 *     orientation changes, foldable posture changes and layout-driven size
 *     changes that never fire a window resize event.
 *   • A re-arming DPR media query — catches browser zoom and moving the
 *     window between monitors, updating the renderer resolution live so
 *     the canvas stays retina-sharp without a reload.
 *   • Pixi's own resizeTo plumbing as the baseline.
 * All converge on renderer.resize → the renderer's 'resize' event →
 * scenes.resize, so scenes see exactly one authoritative signal.
 */
export class GameEngine {
  readonly events = new EventBus<EngineEvents>();
  readonly state: StateMachine<GamePhase>;
  readonly quality: QualitySettings;
  readonly scenes: SceneManager;
  readonly round: RoundDirector;

  private readonly app: Application;
  private resizeObserver: ResizeObserver | null = null;
  private dprQuery: MediaQueryList | null = null;
  private dprDisposed = false;
  private elapsed = 0;
  private fpsAccumulatorMs = 0;
  private frameCount = 0;
  private destroyed = false;

  private constructor(app: Application, quality: QualitySettings, parent: HTMLElement) {
    this.app = app;
    this.quality = quality;
    this.state = createGameStateMachine();
    this.scenes = new SceneManager();
    this.round = new RoundDirector({ state: this.state, events: this.events });

    this.app.stage.addChild(this.scenes.container);

    this.state.onChange((change) => this.events.emit('phase:changed', change));
    this.app.renderer.on('resize', this.handleResize, this);
    this.app.ticker.add(this.update, this);
    if (quality.targetFPS > 0) {
      this.app.ticker.maxFPS = quality.targetFPS;
    }

    // ResizeObserver catches host-element size changes that never fire a
    // window resize (orientation change on some browsers, flex/grid
    // reflows, foldable posture changes).
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (!this.destroyed) this.app.resize();
      });
      this.resizeObserver.observe(parent);
    }

    this.armDprWatcher();
  }

  /**
   * Async factory — Pixi v8 initialises its renderer asynchronously, and a
   * half-initialised engine must never be observable, hence no public
   * constructor.
   */
  static async create(options: GameEngineOptions): Promise<GameEngine> {
    const quality = getQualitySettings(options.quality ?? detectQualityTier());

    const app = new Application();
    await app.init({
      resizeTo: options.parent,
      background: ENGINE_CONFIG.backgroundColor,
      antialias: quality.antialias,
      resolution: Math.min(window.devicePixelRatio || 1, quality.maxResolution),
      autoDensity: true,
    });

    options.parent.appendChild(app.canvas);

    const engine = new GameEngine(app, quality, options.parent);
    await engine.scenes.changeScene(new FlightScene(engine));
    engine.handleResize();
    engine.events.emit('engine:ready', undefined);
    return engine;
  }

  get viewWidth(): number {
    return this.app.renderer.width / this.app.renderer.resolution;
  }

  get viewHeight(): number {
    return this.app.renderer.height / this.app.renderer.resolution;
  }

  private update(ticker: Ticker): void {
    const dt = Math.min(ticker.deltaMS / 1000, ENGINE_CONFIG.maxDeltaSeconds);
    this.elapsed += dt;
    // Game logic advances before rendering so scenes always draw the
    // freshest state within the same frame.
    this.round.update(dt);
    this.scenes.update(dt, this.elapsed);
    this.reportFPS(ticker.deltaMS);
  }

  /** Throttled FPS reporting so the React HUD re-renders 2×/s, not 120×/s. */
  private reportFPS(deltaMS: number): void {
    this.fpsAccumulatorMs += deltaMS;
    this.frameCount++;
    if (this.fpsAccumulatorMs >= ENGINE_CONFIG.fpsReportIntervalMs) {
      const fps = Math.round((this.frameCount * 1000) / this.fpsAccumulatorMs);
      this.events.emit('engine:fps', fps);
      this.fpsAccumulatorMs = 0;
      this.frameCount = 0;
    }
  }

  private handleResize(): void {
    const width = this.viewWidth;
    const height = this.viewHeight;
    this.scenes.resize(width, height);
    this.events.emit('engine:resize', { width, height });
  }

  /**
   * Watch for devicePixelRatio changes (browser zoom, monitor moves). The
   * media query matches only the *current* DPR, so each firing re-arms a
   * fresh query for the new value — the standard pattern for continuous
   * DPR observation.
   */
  private armDprWatcher(): void {
    if (this.dprDisposed || typeof window.matchMedia !== 'function') return;
    this.dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    this.dprQuery.addEventListener('change', this.handleDprChange, { once: true });
  }

  private readonly handleDprChange = (): void => {
    if (this.destroyed) return;
    const resolution = Math.min(window.devicePixelRatio || 1, this.quality.maxResolution);
    if (this.app.renderer.resolution !== resolution) {
      this.app.renderer.resolution = resolution;
      // autoDensity re-syncs the canvas CSS size on the next resize.
      this.app.resize();
    }
    this.armDprWatcher();
  };

  /** Full teardown: safe to call once, idempotent afterwards. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.dprDisposed = true;
    this.dprQuery?.removeEventListener('change', this.handleDprChange);
    this.dprQuery = null;

    this.app.ticker.remove(this.update, this);
    this.app.renderer.off('resize', this.handleResize, this);
    this.round.destroy();
    this.scenes.destroy();
    this.state.destroy();
    this.events.clear();
    this.app.destroy(
      { removeView: true },
      { children: true, texture: true, textureSource: true },
    );
  }
}
