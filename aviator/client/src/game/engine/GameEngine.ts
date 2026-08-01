import { Application, type Ticker } from 'pixi.js';
import type { GamePhase } from '@aviator/shared';
import { EventBus } from './EventBus';
import { createGameStateMachine } from './GameStateMachine';
import type { StateMachine } from './StateMachine';
import { SceneManager } from '@/game/scenes/SceneManager';
import { PreviewScene } from '@/game/scenes/PreviewScene';
import {
  detectQualityTier,
  getQualitySettings,
  type QualitySettings,
  type QualityTier,
} from '@/config/quality';
import { ENGINE_CONFIG } from '@/config/engine';

/** Events the engine publishes to the outside world (React, audio, …). */
export interface EngineEvents extends Record<string, unknown> {
  'engine:ready': undefined;
  'engine:fps': number;
  'engine:resize': { width: number; height: number };
  'phase:changed': { from: GamePhase; to: GamePhase };
}

export interface GameEngineOptions {
  /** DOM element the canvas fills. The engine tracks its size. */
  parent: HTMLElement;
  /** Override auto-detected quality (used by the settings panel later). */
  quality?: QualityTier;
}

/**
 * Composition root of the rendering side of the game.
 *
 * The engine owns the Pixi Application, the frame loop, the scene manager
 * and the round state machine — and nothing else. Rendering details live in
 * scenes; game rules live on the server; React talks to the engine only
 * through `events` and the state machine. That separation is what keeps
 * this class small as the game grows.
 */
export class GameEngine {
  readonly events = new EventBus<EngineEvents>();
  readonly state: StateMachine<GamePhase>;
  readonly quality: QualitySettings;
  readonly scenes: SceneManager;

  private readonly app: Application;
  private elapsed = 0;
  private fpsAccumulatorMs = 0;
  private frameCount = 0;
  private destroyed = false;

  private constructor(app: Application, quality: QualitySettings) {
    this.app = app;
    this.quality = quality;
    this.state = createGameStateMachine();
    this.scenes = new SceneManager();

    this.app.stage.addChild(this.scenes.container);

    this.state.onChange((change) => this.events.emit('phase:changed', change));
    this.app.renderer.on('resize', this.handleResize, this);
    this.app.ticker.add(this.update, this);
    if (quality.targetFPS > 0) {
      this.app.ticker.maxFPS = quality.targetFPS;
    }
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

    const engine = new GameEngine(app, quality);
    await engine.scenes.changeScene(new PreviewScene(engine));
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

  /** Full teardown: safe to call once, idempotent afterwards. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.app.ticker.remove(this.update, this);
    this.app.renderer.off('resize', this.handleResize, this);
    this.scenes.destroy();
    this.state.destroy();
    this.events.clear();
    this.app.destroy(
      { removeView: true },
      { children: true, texture: true, textureSource: true },
    );
  }
}
