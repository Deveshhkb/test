import { Container, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import i18n from '@/i18n';
import { GamePhase } from '@aviator/shared';
import { Scene } from './Scene';
import { SkyBackdrop } from './SkyBackdrop';
import { PlaneActor, PLANE_ANCHORS } from '@/game/entities/PlaneActor';
import { CameraManager } from '@/game/managers/CameraManager';
import { ParticleSystem } from '@/game/fx/ParticleSystem';
import { Trail } from '@/game/fx/Trail';
import { TextureLibrary } from '@/game/fx/textures';
import { flightPosition } from '@/game/flight/FlightPath';
import { PLAYFIELD_CONFIG } from '@/config/flight';
import { clamp, damp } from '@/utils/math';

/**
 * The flight scene: the heart of the game.
 *
 * Composition (each part is its own class — the scene only wires them):
 *   SkyBackdrop      screen-space parallax sky
 *   world Container  camera-transformed: ground, curve, trail, smoke, plane, fire
 *   CameraManager    pans/zooms/shakes the world container
 *   PlaneActor       the aircraft and its living parts
 *   ParticleSystem   pooled exhaust smoke + crash fire
 *   screen-space UI  multiplier readout, countdown, crash flash
 *
 * The scene *reads* round state from the engine (RoundDirector + state
 * machine) and reacts to round events; it never advances game logic itself.
 */

/** Multiplier readout colour buckets — style changes only at bucket edges. */
const MULTIPLIER_COLORS: ReadonlyArray<{ from: number; color: number }> = [
  { from: 50, color: 0xff4d5e },
  { from: 10, color: 0xff8a3c },
  { from: 2, color: 0xffc857 },
  { from: 0, color: 0xf4f6fb },
];

const CRASH_COLOR = 0xff4d5e;

export class FlightScene extends Scene {
  // --- display tree ------------------------------------------------------
  private readonly textures = new TextureLibrary();
  private sky!: SkyBackdrop;
  private readonly world = new Container();
  private readonly ground = new Graphics();
  private readonly curve = new Graphics();
  private trail!: Trail;
  private smoke!: ParticleSystem;
  private fire!: ParticleSystem;
  private plane!: PlaneActor;
  private camera!: CameraManager;
  private readonly flash = new Graphics();
  private multiplierText!: Text;
  private flewAwayText!: Text;
  private countdownText!: Text;

  // --- viewport / playfield ----------------------------------------------
  private width = 0;
  private originX = 0;
  private originY = 0;
  private fieldWidth = 0;
  private fieldHeight = 0;

  // --- flight state -------------------------------------------------------
  private planeX = 0;
  private planeY = 0;
  private planeRotation = 0;
  private velX = 0;
  private velY = 0;
  private crashed = false;
  private crashVelX = 0;
  private crashVelY = 0;
  private smokeAccumulator = 0;
  private currentColor = 0;

  private readonly unsubscribes: Array<() => void> = [];

  async init(): Promise<void> {
    const density = this.engine.quality.particleDensity;

    this.sky = new SkyBackdrop(density);
    this.plane = new PlaneActor(this.textures.soft);
    this.camera = new CameraManager(this.world);
    this.trail = new Trail({
      maxAge: 1.6,
      width: 5,
      color: 0xdde6ff,
      alpha: 0.35,
      minDistance: 6,
    });
    this.smoke = new ParticleSystem({
      texture: this.textures.soft,
      maxParticles: Math.max(24, Math.round(140 * density)),
    });
    this.fire = new ParticleSystem({
      texture: this.textures.soft,
      maxParticles: Math.max(24, Math.round(120 * density)),
      blendMode: 'add',
    });

    this.world.addChild(
      this.ground,
      this.curve,
      this.trail.graphics,
      this.smoke.container,
      this.plane.container,
      this.fire.container,
    );

    this.multiplierText = new Text({
      text: '1.00×',
      style: {
        fontFamily: 'Arial, sans-serif',
        fontWeight: '900',
        fontSize: 92,
        fill: 0xf4f6fb,
        dropShadow: { alpha: 0.6, blur: 16, color: 0x000000, distance: 0 },
      },
    });
    this.multiplierText.anchor.set(0.5);
    this.multiplierText.visible = false;

    this.flewAwayText = new Text({
      text: i18n.t('game.flewAway'),
      style: {
        fontFamily: 'Arial, sans-serif',
        fontWeight: '700',
        fontSize: 26,
        letterSpacing: 6,
        fill: CRASH_COLOR,
      },
    });
    this.flewAwayText.anchor.set(0.5);
    this.flewAwayText.visible = false;

    this.countdownText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial, sans-serif',
        fontWeight: '900',
        fontSize: 140,
        fill: 0xf4f6fb,
        dropShadow: { alpha: 0.8, blur: 22, color: 0x4f8dff, distance: 0 },
      },
    });
    this.countdownText.anchor.set(0.5);
    this.countdownText.visible = false;

    this.flash.rect(0, 0, 4, 4).fill(0xfff1e6);
    this.flash.alpha = 0;

    this.root.addChild(
      this.sky.container,
      this.world,
      this.multiplierText,
      this.flewAwayText,
      this.countdownText,
      this.flash,
    );
  }

  override enter(): void {
    const events = this.engine.events;
    this.unsubscribes.push(
      events.on('round:countdown', (seconds) => this.showCountdown(seconds)),
      events.on('round:takeoff', () => this.onTakeoff()),
      events.on('round:crashed', ({ multiplier }) => this.onCrash(multiplier)),
      events.on('round:reset', () => this.onReset()),
    );
  }

  override exit(): void {
    this.clearSubscriptions();
  }

  update(dt: number, elapsed: number): void {
    const phase = this.engine.state.current;
    const multiplier = this.engine.round.multiplier;
    const flying = phase === GamePhase.Takeoff || phase === GamePhase.Running;
    const speed = flying ? clamp(0.15 + (multiplier - 1) / 8, 0.15, 1) : this.crashed ? 0.6 : 0;

    // --- plane position ---------------------------------------------------
    if (flying) {
      const point = flightPosition(this.engine.round.flightTime);
      const targetX = this.originX + point.fx * this.fieldWidth;
      const targetY = this.originY - point.fy * this.fieldHeight;
      if (dt > 0) {
        this.velX = damp(this.velX, (targetX - this.planeX) / dt, 0.01, dt);
        this.velY = damp(this.velY, (targetY - this.planeY) / dt, 0.01, dt);
      }
      this.planeX = targetX;
      this.planeY = targetY;

      const movingFast = Math.abs(this.velX) + Math.abs(this.velY) > 20;
      const desiredRotation = movingFast ? Math.atan2(this.velY, this.velX) : 0;
      this.planeRotation = damp(this.planeRotation, desiredRotation, 0.005, dt);
    } else if (this.crashed && phase === GamePhase.Crash) {
      // "Flew away": the plane accelerates off-screen along its last heading.
      this.crashVelX *= 1 + 1.8 * dt;
      this.crashVelY *= 1 + 1.8 * dt;
      this.planeX += this.crashVelX * dt;
      this.planeY += this.crashVelY * dt;
      this.planeRotation = damp(this.planeRotation, -0.35, 0.01, dt);
    } else if (!this.crashed) {
      // Parked on the runway between rounds.
      this.planeX = damp(this.planeX, this.originX, 0.001, dt);
      this.planeY = damp(this.planeY, this.originY, 0.001, dt);
      this.planeRotation = damp(this.planeRotation, 0, 0.01, dt);
      this.velX = 0;
      this.velY = 0;
    }

    this.plane.container.position.set(this.planeX, this.planeY);
    this.plane.container.rotation = this.planeRotation;
    this.plane.update({ dt, elapsed, speed, crashed: this.crashed });

    // --- trail, smoke, curve ---------------------------------------------
    if (flying) {
      const contrail = this.anchorWorld(PLANE_ANCHORS.contrail);
      this.trail.addPoint(contrail.x, contrail.y);
      this.emitExhaust(dt, speed);
      this.drawCurve();
    }
    this.trail.update(dt);
    this.smoke.update(dt);
    this.fire.update(dt);

    // --- camera & sky -----------------------------------------------------
    this.camera.update(dt, { x: this.planeX, y: this.planeY }, speed);
    this.sky.update(dt, elapsed, speed, this.camera.currentPanX, this.camera.currentPanY);

    // --- multiplier readout ----------------------------------------------
    const showMultiplier =
      flying || phase === GamePhase.Crash || phase === GamePhase.Result;
    this.multiplierText.visible = showMultiplier;
    if (showMultiplier) {
      this.multiplierText.text = `${multiplier.toFixed(2)}×`;
      if (!this.crashed) this.applyMultiplierColor(multiplier);
    }
  }

  resize(width: number, height: number): void {
    this.width = width;

    const pad = PLAYFIELD_CONFIG;
    this.originX = pad.padLeft;
    this.originY = height - pad.padBottom;
    this.fieldWidth = Math.max(1, width - pad.padLeft - pad.padRight);
    this.fieldHeight = Math.max(1, height - pad.padTop - pad.padBottom);

    this.sky.resize(width, height);
    this.camera.resize(width, height);

    this.ground
      .clear()
      .moveTo(this.originX - 30, this.originY + 26)
      .lineTo(width - pad.padRight + 30, this.originY + 26)
      .stroke({ width: 2, color: 0x2a3558, alpha: 0.9 });
    for (let x = this.originX; x < width - pad.padRight; x += 56) {
      this.ground.circle(x, this.originY + 26, 2.2).fill({ color: 0x3d4d7d, alpha: 0.8 });
    }

    this.plane.container.scale.set(clamp(width / 1400, 0.55, 1.1));

    const uiScale = clamp(width / 1200, 0.6, 1.3);
    this.multiplierText.scale.set(uiScale);
    this.multiplierText.position.set(width / 2, height * 0.3);
    this.flewAwayText.scale.set(uiScale);
    this.flewAwayText.position.set(width / 2, height * 0.3 - 78 * uiScale);
    this.countdownText.scale.set(uiScale);
    this.countdownText.position.set(width / 2, height / 2);

    this.flash.clear().rect(0, 0, width, height).fill(0xfff1e6);

    if (!this.crashed && this.engine.state.current !== GamePhase.Running) {
      this.planeX = this.originX;
      this.planeY = this.originY;
    }
  }

  override destroy(): void {
    this.clearSubscriptions();
    gsap.killTweensOf([
      this.flash,
      this.countdownText,
      this.countdownText.scale,
      this.multiplierText.scale,
      this.flewAwayText,
      this.curve,
    ]);
    this.trail.destroy();
    this.smoke.destroy();
    this.fire.destroy();
    this.plane.destroy();
    this.sky.destroy();
    this.textures.destroy();
    super.destroy();
  }

  // --- round-event handlers ----------------------------------------------

  private onTakeoff(): void {
    this.crashed = false;
    this.trail.clear();
    this.smoke.killAll();
    this.fire.killAll();
    this.curve.clear();
    this.curve.alpha = 1;
    this.flewAwayText.visible = false;
    this.countdownText.visible = false;
    this.applyMultiplierColor(1);
    this.planeX = this.originX;
    this.planeY = this.originY;
    this.velX = 0;
    this.velY = 0;
  }

  private onCrash(finalMultiplier: number): void {
    this.crashed = true;

    // Depart along the last heading, scaled to clear the screen in ~1s.
    const speed = Math.hypot(this.velX, this.velY);
    const scale = Math.max(this.width, 900) * 1.3;
    if (speed > 1) {
      this.crashVelX = (this.velX / speed) * scale;
      this.crashVelY = (this.velY / speed) * scale - scale * 0.18;
    } else {
      this.crashVelX = scale;
      this.crashVelY = -scale * 0.35;
    }

    // Engine blowout burst at the nose.
    const nose = this.anchorWorld(PLANE_ANCHORS.noseFire);
    const density = this.engine.quality.particleDensity;
    this.fire.emit({
      x: nose.x,
      y: nose.y,
      count: Math.round(26 * density),
      speedMin: 120,
      speedMax: 420,
      angleMin: 0,
      angleMax: Math.PI * 2,
      lifeMin: 0.5,
      lifeMax: 1.0,
      scaleStart: 0.55,
      scaleEnd: 0.1,
      alphaStart: 0.9,
      alphaEnd: 0,
      tint: 0xff8a3c,
      gravity: 220,
      drag: 1.2,
    });
    this.fire.emit({
      x: nose.x,
      y: nose.y,
      count: Math.round(16 * density),
      speedMin: 200,
      speedMax: 520,
      angleMin: 0,
      angleMax: Math.PI * 2,
      lifeMin: 0.3,
      lifeMax: 0.7,
      scaleStart: 0.3,
      scaleEnd: 0.05,
      alphaStart: 1,
      alphaEnd: 0,
      tint: 0xffd166,
      gravity: 320,
      drag: 0.8,
    });

    this.camera.addTrauma(0.9);

    gsap.killTweensOf(this.flash);
    gsap.fromTo(this.flash, { alpha: 0.85 }, { alpha: 0, duration: 0.5, ease: 'power2.out' });

    gsap.killTweensOf(this.curve);
    gsap.to(this.curve, { alpha: 0, duration: 0.7, ease: 'power1.out' });

    this.multiplierText.text = `${finalMultiplier.toFixed(2)}×`;
    this.multiplierText.style.fill = CRASH_COLOR;
    this.currentColor = CRASH_COLOR;
    this.flewAwayText.text = i18n.t('game.flewAway');
    this.flewAwayText.visible = true;

    gsap.killTweensOf(this.multiplierText.scale);
    const uiScale = clamp(this.width / 1200, 0.6, 1.3);
    gsap.fromTo(
      this.multiplierText.scale,
      { x: uiScale * 1.35, y: uiScale * 1.35 },
      { x: uiScale, y: uiScale, duration: 0.55, ease: 'elastic.out(1, 0.45)' },
    );
  }

  private onReset(): void {
    this.crashed = false;
    this.curve.clear();
    this.curve.alpha = 1;
    this.trail.clear();
    this.flewAwayText.visible = false;
    this.multiplierText.visible = false;
    this.camera.addTrauma(0);
    this.planeX = this.originX;
    this.planeY = this.originY;
    this.planeRotation = 0;
    this.plane.container.alpha = 0;
    gsap.to(this.plane.container, { alpha: 1, duration: 0.45, ease: 'power2.out' });
  }

  private showCountdown(seconds: number): void {
    this.countdownText.text = String(seconds);
    this.countdownText.visible = true;
    gsap.killTweensOf([this.countdownText, this.countdownText.scale]);
    const uiScale = clamp(this.width / 1200, 0.6, 1.3);
    this.countdownText.alpha = 0;
    gsap.fromTo(
      this.countdownText.scale,
      { x: uiScale * 1.8, y: uiScale * 1.8 },
      { x: uiScale, y: uiScale, duration: 0.4, ease: 'back.out(2)' },
    );
    gsap.to(this.countdownText, { alpha: 1, duration: 0.18 });
    gsap.to(this.countdownText, { alpha: 0, duration: 0.3, delay: 0.6 });
  }

  // --- helpers ------------------------------------------------------------

  private emitExhaust(dt: number, speed: number): void {
    this.smokeAccumulator += (8 + speed * 22) * this.engine.quality.particleDensity * dt;
    const count = Math.floor(this.smokeAccumulator);
    if (count <= 0) return;
    this.smokeAccumulator -= count;

    const exhaust = this.anchorWorld(PLANE_ANCHORS.exhaust);
    const backward = this.planeRotation + Math.PI;
    this.smoke.emit({
      x: exhaust.x,
      y: exhaust.y,
      count,
      speedMin: 30,
      speedMax: 80,
      angleMin: backward - 0.35,
      angleMax: backward + 0.35,
      lifeMin: 0.7,
      lifeMax: 1.5,
      scaleStart: 0.22,
      scaleEnd: 0.85,
      alphaStart: 0.3,
      alphaEnd: 0,
      tint: 0x9aa3b5,
      gravity: -14,
      drag: 0.7,
      spin: 1.5,
    });
  }

  private drawCurve(): void {
    const g = this.curve;
    const controlX = this.originX + (this.planeX - this.originX) * 0.55;

    g.clear();
    // Area fill under the curve.
    g.moveTo(this.originX, this.originY)
      .quadraticCurveTo(controlX, this.originY, this.planeX, this.planeY)
      .lineTo(this.planeX, this.originY)
      .closePath()
      .fill({ color: 0xe0304f, alpha: 0.1 });
    // Outer glow stroke, then the crisp core stroke.
    g.moveTo(this.originX, this.originY)
      .quadraticCurveTo(controlX, this.originY, this.planeX, this.planeY)
      .stroke({ width: 10, color: 0xe0304f, alpha: 0.18, cap: 'round' });
    g.moveTo(this.originX, this.originY)
      .quadraticCurveTo(controlX, this.originY, this.planeX, this.planeY)
      .stroke({ width: 4, color: 0xe0304f, alpha: 0.95, cap: 'round' });
  }

  private applyMultiplierColor(multiplier: number): void {
    const bucket = MULTIPLIER_COLORS.find((b) => multiplier >= b.from);
    const color = bucket ? bucket.color : 0xf4f6fb;
    if (color !== this.currentColor) {
      this.currentColor = color;
      this.multiplierText.style.fill = color;
    }
  }

  private anchorWorld(anchor: { x: number; y: number }): { x: number; y: number } {
    const c = this.plane.container;
    const cos = Math.cos(c.rotation);
    const sin = Math.sin(c.rotation);
    const sx = anchor.x * c.scale.x;
    const sy = anchor.y * c.scale.y;
    return { x: c.x + sx * cos - sy * sin, y: c.y + sx * sin + sy * cos };
  }

  private clearSubscriptions(): void {
    for (const unsubscribe of this.unsubscribes) unsubscribe();
    this.unsubscribes.length = 0;
  }
}
