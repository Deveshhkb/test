import { Application } from 'pixi.js';
import { LoadingScene } from './LoadingScene';
import { GameScene } from './GameScene';
import { assetManager } from '@/services/AssetManager';
import { animations } from '@/animations/AnimationManager';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '@/constants';
import { gameController } from '@/services/GameController';

/**
 * Pixi application shell: boot sequence, scene switching and responsive
 * scaling. The stage renders a fixed design space (1280x720) scaled to fit
 * the viewport — works for desktop, tablet, landscape and portrait.
 */
export class SlotGame {
  private app: Application | null = null;
  private loadingScene: LoadingScene | null = null;
  private gameScene: GameScene | null = null;
  private host: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private destroyed = false;

  async boot(host: HTMLElement): Promise<void> {
    this.host = host;
    const app = new Application();
    const quality = useSettingsStore.getState().quality;
    await app.init({
      background: 0x0b0716,
      resolution: quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      antialias: quality !== 'low',
      width: host.clientWidth || DESIGN_WIDTH,
      height: host.clientHeight || DESIGN_HEIGHT,
    });
    if (this.destroyed) {
      // Unmounted while awaiting init (React StrictMode double-invoke).
      // The app is only exposed on `this` once fully initialised, so
      // destroy() never touches a half-constructed Application.
      app.destroy(true);
      return;
    }
    this.app = app;
    host.appendChild(app.canvas);
    app.canvas.style.width = '100%';
    app.canvas.style.height = '100%';
    app.canvas.style.display = 'block';

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();

    // --- Preload ---
    this.loadingScene = new LoadingScene();
    app.stage.addChild(this.loadingScene.container);
    const setProgress = useGameStore.getState().setLoadingProgress;
    await assetManager.load(app.renderer, (p) => {
      this.loadingScene?.setProgress(p);
      setProgress(p);
    });
    if (this.destroyed) return;

    // --- Main scene ---
    this.gameScene = new GameScene();
    this.gameScene.init(app.ticker);
    app.stage.addChildAt(this.gameScene.container, 0);
    this.loadingScene.destroy();
    this.loadingScene = null;

    await gameController.start(this.gameScene);
  }

  /** Fit the design space into the host element, centred and letterboxed. */
  private resize(): void {
    if (!this.app || !this.host) return;
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (w === 0 || h === 0) return;
    this.app.renderer.resize(w, h);
    const scale = Math.min(w / DESIGN_WIDTH, h / DESIGN_HEIGHT);
    this.app.stage.scale.set(scale);
    this.app.stage.position.set(
      (w - DESIGN_WIDTH * scale) / 2,
      (h - DESIGN_HEIGHT * scale) / 2,
    );
  }

  destroy(): void {
    this.destroyed = true;
    gameController.stop();
    animations.killAll();
    this.resizeObserver?.disconnect();
    this.gameScene?.destroy();
    this.loadingScene?.destroy();
    assetManager.destroy();
    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = null;
    }
  }
}
