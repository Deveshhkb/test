import { Container, TextStyle } from 'pixi.js';
import { MACHINE_X, MACHINE_Y } from '../GameConfig';
import { GlowEffect } from '../effects/GlowEffect';
import { ParticleSystem } from '../effects/ParticleSystem';
import { CentralHub } from './CentralHub';
import { GlassHousing } from './GlassHousing';
import { MachineStand } from './MachineStand';
import { MechanicalArm } from './MechanicalArm';
import { RouletteWheel } from './RouletteWheel';

/**
 * Composes the machine from its independent parts and fixes the draw order.
 * Everything below lives in machine-local space, with the origin at the wheel
 * centre, which is also the space the physics solves in.
 *
 *   stand           - yoke, column, plinth, floor shadow
 *   wheel.static    - chassis frame, collar, playfield floor
 *   glass.back      - far wall of the dome
 *   wheel.rotating  - pocket band and metal rings
 *   ballShadows     - contact shadows, under every ball
 *   ballTrails      - motion-blur ghosts
 *   balls           - the balls themselves
 *   hub             - agitator spokes and paddles, over the balls
 *   arm             - indicator arm, over the agitator
 *   particles       - seat dust
 *   glass.front     - near wall, specular sweeps, fresnel
 */
export class RouletteMachine {
  readonly view = new Container();

  readonly stand = new MachineStand();
  readonly wheel: RouletteWheel;
  readonly glass = new GlassHousing();
  readonly hub = new CentralHub();
  readonly arm = new MechanicalArm();
  readonly particles = new ParticleSystem();
  /** Soft light under a seating ball; sits below the balls so it never veils one. */
  readonly seatGlow = new GlowEffect(0x9fe4ff);

  readonly ballShadowLayer = new Container();
  readonly ballTrailLayer = new Container();
  readonly ballLayer = new Container();

  constructor(pocketLabelStyle: TextStyle) {
    this.wheel = new RouletteWheel(pocketLabelStyle);

    this.view.position.set(MACHINE_X, MACHINE_Y);
    this.view.addChild(
      this.stand.view,
      this.wheel.staticLayer,
      this.glass.back,
      this.wheel.rotatingLayer,
      this.seatGlow.view,
      this.ballShadowLayer,
      this.ballTrailLayer,
      this.ballLayer,
      this.hub.view,
      this.arm.view,
      this.particles.view,
      this.glass.front,
    );
  }

  /**
   * Drives the parts that follow the drum. The arm is deliberately excluded:
   * it is aimed by the draw sequence, not carried round by the agitator.
   */
  update(dt: number, drumAngle: number, drumOmega: number): void {
    this.wheel.setRotation(drumAngle);
    this.hub.setRotation(drumAngle);
    this.hub.update(dt, Math.min(Math.abs(drumOmega) / 8, 1));
    this.arm.update(dt);
    this.glass.update(dt);
    this.stand.update(dt);
    this.particles.update(dt);
    this.seatGlow.update(dt);
  }
}
