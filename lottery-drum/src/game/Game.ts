import { Application, Container, TextStyle } from 'pixi.js';
import {
  BACKGROUND_CLEAR_COLOR,
  BALL_COUNT,
  COLOR_RESULT_CYAN,
  DEFAULT_RESULT,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  MACHINE_X,
  MACHINE_Y,
  MAX_DEVICE_PIXEL_RATIO,
} from './GameConfig';
import { GameLoop } from './GameLoop';
import { AudioSystem } from './audio/AudioSystem';
import { AtmosphereLayer } from './effects/AtmosphereLayer';
import { Camera } from './camera/Camera';
import { GlowEffect } from './effects/GlowEffect';
import { Environment } from './environment/Environment';
import { InputManager } from './input/InputManager';
import { RouletteBall } from './roulette/RouletteBall';
import { RouletteMachine } from './roulette/RouletteMachine';
import { RoulettePhysics } from './roulette/RoulettePhysics';
import { DebugSystem } from './systems/DebugSystem';
import { DrawSequenceSystem } from './systems/DrawSequenceSystem';
import { SpinSystem } from './systems/SpinSystem';
import { ResultOverlay } from './ui/ResultOverlay';
import { EventBus } from './utils/EventBus';
import { GameEvents } from './types';
import { PLAYFIELD_RADIUS } from './GameConfig';

const FONT_STACK = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';

/**
 * Owns the Pixi application and wires the systems together.
 *
 * Scene graph, back to front:
 *
 *   root                  letterbox fit of the 1918x980 design space
 *     camera              dolly transform about a world focus point
 *       environment       room, LED wall, light blades, wall monitors, floor
 *       machine           stand, wheel layers, glass, balls, hub, arm
 *       overlay.numeral   large translucent result numeral
 *       overlay.pill      the "Hasil" readout
 *       debug             collision shapes
 *     atmosphere          key wash, depth haze and vignette, frame-locked
 */
export class Game {
  readonly bus = new EventBus<GameEvents>();
  readonly audio = new AudioSystem();

  private readonly app = new Application();
  private readonly root = new Container();
  private readonly cameraLayer = new Container();
  private readonly machineSpace = new Container();

  private loop!: GameLoop;
  private input!: InputManager;
  private environment!: Environment;
  private machine!: RouletteMachine;
  private overlay!: ResultOverlay;
  private atmosphere!: AtmosphereLayer;
  private glow!: GlowEffect;
  private physics!: RoulettePhysics;
  private camera!: Camera;
  private spin!: SpinSystem;
  private sequence!: DrawSequenceSystem;
  private debug!: DebugSystem;

  private readonly balls: RouletteBall[] = [];
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
      width: host.clientWidth || DESIGN_WIDTH,
      height: host.clientHeight || DESIGN_HEIGHT,
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
      // Browsers only allow an AudioContext to start from a gesture.
      this.audio.unlock();
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
    const uiLabel = new TextStyle({
      fontFamily: FONT_STACK,
      fontSize: 20,
      fontWeight: '700',
      fill: 0xdce6f2,
    });
    const pocketLabel = new TextStyle({
      fontFamily: FONT_STACK,
      fontSize: 15,
      fontWeight: '700',
      fill: 0xa8c0d8,
    });
    const ballLabel = new TextStyle({
      fontFamily: FONT_STACK,
      fontSize: 24,
      fontWeight: '800',
      fill: 0x14161a,
    });

    this.environment = new Environment(uiLabel);
    this.machine = new RouletteMachine(pocketLabel);
    this.overlay = new ResultOverlay(FONT_STACK);
    this.glow = new GlowEffect(COLOR_RESULT_CYAN);

    for (let i = 0; i < BALL_COUNT; i++) {
      const ball = new RouletteBall(i, ballLabel);
      this.machine.ballShadowLayer.addChild(ball.shadowView);
      for (const ghost of ball.trailViews) this.machine.ballTrailLayer.addChild(ghost);
      this.machine.ballLayer.addChild(ball.view);
      this.balls.push(ball);
    }

    this.machineSpace.position.set(MACHINE_X, MACHINE_Y);
    this.machineSpace.addChild(this.glow.view);

    this.overlay.numeralLayer.position.set(MACHINE_X, MACHINE_Y);
    this.overlay.pillLayer.position.set(MACHINE_X, MACHINE_Y);
    this.overlay.setNumber(DEFAULT_RESULT);

    this.cameraLayer.addChild(
      this.environment.view,
      this.machine.view,
      this.machineSpace,
      this.overlay.numeralLayer,
      this.overlay.pillLayer,
    );

    // Sits outside the camera transform so it stays locked to the frame while
    // the camera dollies, the way a lens effect would.
    this.atmosphere = new AtmosphereLayer();
    this.root.addChild(this.cameraLayer, this.atmosphere.view);
    this.app.stage.addChild(this.root);
  }

  private buildSystems(): void {
    this.physics = new RoulettePhysics();
    for (const ball of this.balls) this.physics.addBody(ball.body);

    this.camera = new Camera(this.cameraLayer);
    this.spin = new SpinSystem(this.physics);
    this.debug = new DebugSystem(this.physics, this.balls, this.machine.wheel.pocketAngles);
    this.machineSpace.addChild(this.debug.view);

    this.sequence = new DrawSequenceSystem(
      this.balls,
      this.machine,
      this.camera,
      this.spin,
      this.overlay,
      this.glow,
      this.bus,
      () => this.physics.drumAngle,
      () => this.physics.drumOmega,
    );

    this.camera.snapWide();
  }

  private readonly update = (dt: number): void => {
    this.spin.update(dt);
    this.physics.update(dt);
    this.sequence.followParkedPocket();
    this.sequence.update(dt);

    this.machine.update(dt, this.physics.drumAngle, this.physics.drumOmega);

    // Depth is the ball's height in the bowl, -1 at the top and +1 at the
    // bottom; balls low in the bowl are nearer the camera.
    for (const ball of this.balls) {
      if (ball.view.visible) ball.sync(ball.body.position.y / PLAYFIELD_RADIUS, dt);
    }

    this.environment.update(dt);
    this.atmosphere.update(dt);
    this.glow.update(dt);
    this.camera.update(dt);
    this.debug.update();

    this.publishSnapshot(dt);
  };

  /** React hears debug numbers five times a second, never once per frame. */
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
      simDelta: this.loop.simDelta,
      clamped: this.loop.isClamped,
      state: this.sequence.currentState,
      elapsed: this.sequence.elapsedInState,
      progress: this.sequence.progressInPhase,
      drumOmega: this.physics.drumOmega,
      drumAngle: this.physics.drumAngle,
      armAngle: this.machine.arm.currentAngle,
      zoom: this.camera.currentZoom,
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
   * Letterbox fit: the design space is scaled to fill the host while keeping
   * its aspect ratio, so the composition holds at any window size.
   */
  private resize(): void {
    const host = this.host;
    if (!host) return;
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);

    this.app.renderer.resolution = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
    this.app.renderer.resize(width, height);

    const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    this.root.scale.set(scale);
    this.root.x = (width - DESIGN_WIDTH * scale) / 2;
    this.root.y = (height - DESIGN_HEIGHT * scale) / 2;
  }

  startDraw(forced?: number): boolean {
    return this.sequence.start(forced);
  }

  reset(): void {
    this.camera.snapWide();
    this.overlay.setReveal(0);
    this.overlay.setBigNumeralAlpha(0.78);
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
    this.audio.destroy();
    this.bus.clear();
    if (this.app.renderer) this.app.destroy(true, { children: true, texture: true });
    this.host = null;
  }
}
