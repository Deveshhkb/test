import { Application, Container, TextStyle } from 'pixi.js';
import {
  BACKGROUND_CLEAR_COLOR,
  BALL_COUNT,
  DEFAULT_RESULT,
  DRUM_CENTER_X,
  DRUM_CENTER_Y,
  MAX_DEVICE_PIXEL_RATIO,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './config';
import { GameLoop } from './GameLoop';
import { Ball } from './entities/Ball';
import { Drum } from './entities/Drum';
import { ResultOverlay } from './entities/ResultOverlay';
import { Studio } from './entities/Studio';
import { Particles } from './effects/Particles';
import { InputManager } from './input/InputManager';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { CameraSystem } from './systems/CameraSystem';
import { DebugSystem } from './systems/DebugSystem';
import { DrawSequenceSystem } from './systems/DrawSequenceSystem';
import { SpinSystem } from './systems/SpinSystem';
import { EventBus } from './utils/EventBus';
import { GameEvents } from './types';

const FONT_STACK = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';

/**
 * Owns the Pixi application and wires the systems together.
 *
 * Scene graph, back to front:
 *   root (letterbox fit)
 *     camera            - dolly transform
 *       studio          - set, monitors, floor
 *       overlay.back    - large translucent result numeral
 *       drum.behind     - pedestal, drum interior, rotating rim cups
 *       drum.ballLayer  - motion-blur ghosts, then balls
 *       drum.agitator   - spokes and hub, over the balls
 *       drum.front      - near glass wall and highlights
 *       particles
 *       overlay.front   - the "Hasil" pill
 *       debug
 */
export class Game {
  readonly bus = new EventBus<GameEvents>();

  private readonly app = new Application();
  private readonly root = new Container();
  private readonly camera = new Container();
  private readonly drumSpace = new Container();
  private readonly trailLayer = new Container();
  private readonly ballContainer = new Container();

  private loop!: GameLoop;
  private input!: InputManager;
  private studio!: Studio;
  private drum!: Drum;
  private overlay!: ResultOverlay;
  private particles!: Particles;
  private physics!: PhysicsWorld;
  private cameraSystem!: CameraSystem;
  private spin!: SpinSystem;
  private sequence!: DrawSequenceSystem;
  private debug!: DebugSystem;

  private readonly balls: Ball[] = [];
  private host: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private debugEnabled = false;
  private snapshotTimer = 0;
  private destroyed = false;

  async init(host: HTMLElement): Promise<void> {
    this.host = host;

    await this.app.init({
      backgroundColor: BACKGROUND_CLEAR_COLOR,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO),
      powerPreference: 'high-performance',
      width: host.clientWidth || WORLD_WIDTH,
      height: host.clientHeight || WORLD_HEIGHT,
    });

    if (this.destroyed) {
      this.app.destroy(true, { children: true });
      return;
    }

    host.appendChild(this.app.canvas);
    this.app.canvas.style.display = 'block';
    this.app.canvas.style.touchAction = 'manipulation';

    this.buildScene();
    this.buildSystems();

    this.loop = new GameLoop(this.app.ticker);
    this.loop.add(this.update);

    this.input = new InputManager(this.app.canvas);
    this.input.on((action) => {
      if (action === 'draw') this.startDraw();
      else if (action === 'toggleDebug') this.setDebug(!this.debugEnabled);
      else if (action === 'reset') this.reset();
    });

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();

    this.sequence.fill();
    this.bus.emit('stateChanged', 'idle');
  }

  private buildScene(): void {
    const labelStyle = new TextStyle({
      fontFamily: FONT_STACK,
      fontSize: 20,
      fontWeight: '700',
      fill: 0xdce6f2,
    });
    const ballLabelStyle = new TextStyle({
      fontFamily: FONT_STACK,
      fontSize: 26,
      fontWeight: '800',
      fill: 0x14161a,
    });

    this.studio = new Studio(labelStyle);
    this.drum = new Drum();
    this.overlay = new ResultOverlay(FONT_STACK);
    this.particles = new Particles();

    this.drum.view.position.set(DRUM_CENTER_X, DRUM_CENTER_Y);
    this.drumSpace.position.set(DRUM_CENTER_X, DRUM_CENTER_Y);

    for (let i = 0; i < BALL_COUNT; i++) {
      const ball = new Ball(i, ballLabelStyle);
      for (const ghost of ball.trailViews) this.trailLayer.addChild(ghost);
      this.ballContainer.addChild(ball.view);
      this.balls.push(ball);
    }
    this.drum.ballLayer.addChild(this.trailLayer, this.ballContainer, this.particles.view);

    this.overlay.numeralLayer.position.set(DRUM_CENTER_X, DRUM_CENTER_Y);
    this.overlay.pillLayer.position.set(DRUM_CENTER_X, DRUM_CENTER_Y);
    this.overlay.setNumber(DEFAULT_RESULT);

    this.camera.addChild(
      this.studio.view,
      this.drum.view,
      this.overlay.numeralLayer,
      this.drumSpace,
      this.overlay.pillLayer,
    );

    this.root.addChild(this.camera);
    this.app.stage.addChild(this.root);
  }

  private buildSystems(): void {
    this.physics = new PhysicsWorld();
    for (const ball of this.balls) this.physics.addBody(ball.body);

    this.cameraSystem = new CameraSystem(this.camera);
    this.spin = new SpinSystem(this.physics);
    this.debug = new DebugSystem(this.physics, this.balls);
    this.drumSpace.addChild(this.debug.view);

    this.sequence = new DrawSequenceSystem(
      this.balls,
      this.drum,
      this.cameraSystem,
      this.spin,
      this.overlay,
      this.particles,
      this.bus,
      () => this.physics.drumAngle,
    );

    this.cameraSystem.snapWide();
  }

  private readonly update = (dt: number): void => {
    this.spin.update(dt);
    this.physics.update(dt);
    this.sequence.followParkedSlot();
    this.sequence.update(dt);

    this.drum.setAngle(this.physics.drumAngle);
    for (const ball of this.balls) {
      if (ball.view.visible) ball.sync();
    }

    this.studio.update(dt);
    this.particles.update(dt);
    this.cameraSystem.update(dt);
    this.debug.update();

    this.publishSnapshot(dt);
  };

  /** React only hears about debug numbers a few times a second, never per frame. */
  private publishSnapshot(dt: number): void {
    if (!this.debugEnabled) return;
    this.snapshotTimer += dt;
    if (this.snapshotTimer < 0.2) return;
    this.snapshotTimer = 0;

    const winner = this.sequence.winnerBall;
    let activeBalls = 0;
    for (const ball of this.balls) if (ball.view.visible) activeBalls++;

    this.bus.emit('debugSnapshot', {
      fps: this.loop.fps,
      state: this.sequence.currentState,
      elapsed: this.sequence.elapsedInState,
      drumOmega: this.physics.drumOmega,
      zoom: this.cameraSystem.currentZoom,
      activeBalls,
      contacts: this.physics.lastContactCount,
      subSteps: this.physics.lastSubStepCount,
      winnerNumber: this.sequence.result,
      winnerX: winner ? winner.body.position.x : 0,
      winnerY: winner ? winner.body.position.y : 0,
      winnerVx: winner ? winner.body.velocity.x : 0,
      winnerVy: winner ? winner.body.velocity.y : 0,
    });
  }

  /**
   * Letterbox fit: the 1920x1080 stage is scaled to fill the host while keeping
   * its aspect ratio, so the framing matches the reference at any window size.
   */
  private resize(): void {
    const host = this.host;
    if (!host) return;
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);

    this.app.renderer.resolution = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
    this.app.renderer.resize(width, height);

    const scale = Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT);
    this.root.scale.set(scale);
    this.root.x = (width - WORLD_WIDTH * scale) / 2;
    this.root.y = (height - WORLD_HEIGHT * scale) / 2;
  }

  startDraw(forced?: number): boolean {
    return this.sequence.start(forced);
  }

  reset(): void {
    this.cameraSystem.snapWide();
    this.overlay.setReveal(0);
    this.overlay.setBigNumberAlpha(0.78);
    this.sequence.fill();
  }

  setDebug(enabled: boolean): void {
    this.debugEnabled = enabled;
    this.debug.setEnabled(enabled);
  }

  get isDebugEnabled(): boolean {
    return this.debugEnabled;
  }

  destroy(): void {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.input?.destroy();
    this.loop?.destroy();
    this.bus.clear();
    if (this.app.renderer) this.app.destroy(true, { children: true, texture: true });
    this.host = null;
  }
}
