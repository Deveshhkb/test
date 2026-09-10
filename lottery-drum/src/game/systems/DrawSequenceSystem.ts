import {
  BALL_RADIUS,
  CAM_CLOSE_FOCUS_Y,
  CAM_CLOSE_ZOOM,
  DEFAULT_RESULT,
  CORE_ENTRY_DEPTH,
  MACHINE_X,
  NUMBER_MAX,
  NUMBER_MIN,
  PLAYFIELD_RADIUS,
  RELEASE_ANGLE,
  RELEASE_ARC,
  RELEASE_OMEGA,
  LIFT_ACCELERATION,
  LIFT_MAX_SPEED,
  LIFT_SPINUP_SPIN,
  LIFT_SPINUP_TIME,
  LIFT_SPIN,
  LIFT_VIBRATION,
  LIFT_VIBRATION_RATE,
  RELEASE_OMEGA_FORCE,
  SPIN_TARGET_SPEED,
  T_ARM_SWING,
  T_DRAIN,
  T_RETURN,
  T_REVEAL_HOLD,
  REST_ANGULAR,
  REST_HOLD,
  REST_SPEED,
  T_SETTLE_MAX,
  T_SPIN,
} from '../GameConfig';
import { canTransition } from '../GameState';
import { Camera } from '../camera/Camera';
import { GlowEffect } from '../effects/GlowEffect';
import { RouletteBall } from '../roulette/RouletteBall';
import { RouletteMachine } from '../roulette/RouletteMachine';
import { GameEvents, GameState } from '../types';
import { EventBus } from '../utils/EventBus';
import { easeInCubic, easeInOutCubic, easeOutCubic, easeOutQuart } from '../utils/easing';
import { angleDelta, clamp, invLerp, normalizeAngle, TAU } from '../utils/math';
import { Rng } from '../utils/random';
import { ResultOverlay } from '../ui/ResultOverlay';
import { SpinSystem } from './SpinSystem';

/** Per-ball drain bookkeeping, preallocated so a draw never allocates. */
interface DrainRecord {
  delay: number;
  progress: number;
  draining: boolean;
}

const DRAIN_DURATION = 0.3;
const REVEAL_MORPH = 0.55;

/**
 * Directs one draw, from spin-up through to the camera pulling back out.
 *
 * This is the only module that knows the running order. The camera, spin,
 * physics, machine and overlay each stay unaware of the sequence and simply do
 * what they are told, which is what lets any of them be retimed on its own.
 *
 * The drawn number is deliberately withheld: the pill and the big numeral keep
 * showing the *previous* result for the whole spin and only flip over at the
 * reveal, so pressing the button never gives the answer away.
 */
export class DrawSequenceSystem {
  private state: GameState = 'idle';
  private elapsed = 0;

  private winner: RouletteBall | null = null;
  private pendingNumber = DEFAULT_RESULT;
  private displayedNumber = DEFAULT_RESULT;
  private parked = false;
  private parkLocalAngle = 0;
  private parkLocalRadius = 0;
  /** Seconds since the return mechanism engaged; negative while it has not. */
  private liftElapsed = -1;
  /** Seconds the mechanism has been spinning the ball up in its holder. */
  private engageElapsed = -1;
  /** Fixed axis of the return channel, captured when the lift begins. */
  private liftDirX = 0;
  private liftDirY = -1;

  private readonly drain: DrainRecord[] = [];
  private readonly rng = new Rng();
  private readonly history: number[] = [];

  constructor(
    private readonly balls: readonly RouletteBall[],
    private readonly machine: RouletteMachine,
    private readonly camera: Camera,
    private readonly spin: SpinSystem,
    private readonly overlay: ResultOverlay,
    private readonly glow: GlowEffect,
    private readonly bus: EventBus<GameEvents>,
    private readonly getDrumAngle: () => number,
    private readonly getDrumOmega: () => number,
  ) {
    for (let i = 0; i < balls.length; i++) {
      this.drain.push({ delay: 0, progress: 0, draining: false });
    }
  }

  get currentState(): GameState {
    return this.state;
  }

  get elapsedInState(): number {
    return this.elapsed;
  }

  get result(): number | null {
    return this.history.length > 0 ? this.history[0] : null;
  }

  get winnerBall(): RouletteBall | null {
    return this.winner;
  }

  get canStart(): boolean {
    return this.state === 'idle';
  }

  /**
   * Loads the machine. `spun` seeds the balls as a band already travelling at
   * the drum's surface speed, which is how a draw begins once the loader has
   * brought them up to speed.
   */
  fill(spun = false): void {
    const count = this.balls.length;
    const ringRadius = PLAYFIELD_RADIUS - BALL_RADIUS - 2;
    const scatter = PLAYFIELD_RADIUS * 0.6;
    const numbers = this.pickNumbers(count);

    for (let i = 0; i < count; i++) {
      const ball = this.balls[i];
      const angle = (i / count) * TAU + this.rng.range(-0.05, 0.05);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      if (spun) {
        ball.reset(cos * ringRadius, sin * ringRadius);
        const speed = SPIN_TARGET_SPEED * ringRadius;
        ball.body.velocity.set(-sin * speed, cos * speed);
      } else {
        const radius = scatter * (0.45 + this.rng.next() * 0.55);
        ball.reset(cos * radius, sin * radius * 0.8);
        ball.body.velocity.set(this.rng.range(-120, 120), this.rng.range(-60, 60));
      }

      ball.paint(i % 2 === 0 ? 'red' : 'black');
      ball.setNumber(numbers[i]);
      ball.setVisible(true);

      const record = this.drain[i];
      record.delay = 0;
      record.progress = 0;
      record.draining = false;
    }

    this.winner = null;
    this.parked = false;
    this.liftElapsed = -1;
    this.engageElapsed = -1;
    this.machine.particles.reset();
    this.machine.seatGlow.reset();
    this.machine.returnGlow.reset();
    this.glow.reset();
    this.machine.arm.stow(0.35);
  }

  /** Starts a draw. `forced` pins the result; otherwise it is drawn at random. */
  start(forced?: number): boolean {
    if (!this.canStart) return false;

    this.fill(true);

    const index = this.rng.int(0, this.balls.length - 1);
    this.winner = this.balls[index];
    this.pendingNumber =
      forced === undefined
        ? this.rng.int(NUMBER_MIN, NUMBER_MAX)
        : clamp(Math.round(forced), NUMBER_MIN, NUMBER_MAX);

    // The drawn ball carries the result so its printed face matches the HUD,
    // but the overlay keeps displaying the previous result until the reveal.
    this.winner.paint('black');
    this.winner.setNumber(this.pendingNumber);

    // Stagger the losers so the machine empties as a stream, not all at once.
    for (let i = 0; i < this.balls.length; i++) {
      const record = this.drain[i];
      record.delay =
        this.balls[i] === this.winner
          ? Number.POSITIVE_INFINITY
          : this.rng.range(0, T_DRAIN * 0.55);
      record.progress = 0;
      record.draining = false;
    }

    this.overlay.setReveal(0);
    this.parked = false;

    this.spin.spinUp();
    this.machine.arm.stow(0.4);
    // One continuous push-in through the spin and into the drain.
    this.camera.dollyToClose(T_SPIN + T_DRAIN, easeInOutCubic);

    this.setState('spinning');
    this.bus.emit('drawStarted', this.displayedNumber);
    return true;
  }

  update(dt: number): void {
    this.elapsed += dt;

    switch (this.state) {
      case 'idle':
        break;

      case 'spinning':
        this.fadeBigNumeral();
        if (this.elapsed >= T_SPIN) {
          this.spin.stop();
          this.setState('draining');
        }
        break;

      case 'draining':
        this.fadeBigNumeral();
        this.updateDrain(dt);
        this.tryReleaseWinner();
        if (this.elapsed >= T_DRAIN) this.setState('settling');
        break;

      case 'settling':
        this.updateDrain(dt);
        this.tryReleaseWinner();
        this.updateSettle(dt);
        if (this.parked) {
          this.setState('revealing');
        } else if (this.elapsed >= T_SETTLE_MAX) {
          // Safety net: if the ball is somehow still moving, accept wherever it
          // is rather than letting the sequence wedge. It is not repositioned.
          this.parkInPlace();
          this.setState('revealing');
        }
        break;

      case 'revealing':
        this.overlay.setReveal(easeOutCubic(clamp(this.elapsed / REVEAL_MORPH, 0, 1)));
        // The mechanism takes hold while the result is still up, so the ball is
        // already spinning by the time the camera starts pulling back.
        if (this.elapsed >= T_REVEAL_HOLD - LIFT_SPINUP_TIME) this.updateMechanismEngage(dt);
        if (this.elapsed >= T_REVEAL_HOLD) {
          this.camera.dollyToWide(T_RETURN, easeInOutCubic);
          this.beginReturnLift();
          // The arm stays on the drawn pocket and only dims: it marks the
          // result until the next draw stows it. Calling stow() here would be
          // undone every frame by followParkedPocket, which owns the angle
          // while a ball is parked.
          this.machine.arm.setLit(false);
          this.setState('returning');
        }
        break;

      case 'returning': {
        const t = clamp(this.elapsed / T_RETURN, 0, 1);
        this.overlay.setReveal(1 - easeInCubic(clamp(this.elapsed / (T_RETURN * 0.6), 0, 1)));
        this.overlay.setBigNumeralAlpha(easeOutQuart(t) * 0.78);
        this.updateReturnLift(dt);
        if (this.elapsed >= T_RETURN) this.setState('idle');
        break;
      }
    }
  }

  /** The red numeral dissolves as the camera buries itself in the glass. */
  private fadeBigNumeral(): void {
    this.overlay.setBigNumeralAlpha((1 - this.camera.closeness) * 0.78);
  }

  /**
   * Losing balls are released through the gate under the wheel: each drops out
   * of the simulation, accelerates toward the gate mouth and shrinks away.
   */
  private updateDrain(dt: number): void {
    const gateY = PLAYFIELD_RADIUS * 1.12;

    for (let i = 0; i < this.balls.length; i++) {
      const record = this.drain[i];
      const ball = this.balls[i];
      if (!ball.view.visible) continue;

      if (!record.draining) {
        record.delay -= dt;
        if (record.delay > 0) continue;
        record.draining = true;
        ball.body.active = false;
      }

      record.progress = Math.min(1, record.progress + dt / DRAIN_DURATION);
      const t = record.progress;

      // Funnel toward the gate mouth, converging in x and falling in y.
      const body = ball.body;
      const pull = Math.min(1, dt * 8);
      body.position.x += (0 - body.position.x) * pull * 0.8;
      body.position.y += (gateY - body.position.y) * pull;
      body.rotation += dt * 9;

      ball.view.alpha = 1 - t * t;
      ball.view.scale.set(1 - t * 0.55);
      ball.sync(body.position.y / PLAYFIELD_RADIUS);

      if (t >= 1) ball.setVisible(false);
    }
  }

  /**
   * Hands the drawn ball over to the solver, once the wheel has wound down far
   * enough and the ball has come round to the release window on the descending
   * side of the track.
   *
   * Nothing steers it after this. It leaves the track, falls, lands back on the
   * curved lower track, bounces, rolls, climbs frets until it runs out of
   * energy and comes to rest in a pocket. Which pocket that is is whichever one
   * it reaches; the result is carried on the ball's printed face, so there is
   * nothing to aim at.
   *
   * The forced release covers the case where the wheel stops before the ball
   * reaches the window - it then simply rolls down from wherever it is.
   */
  private tryReleaseWinner(): void {
    const winner = this.winner;
    if (!winner || winner.body.settling) return;

    const omega = Math.abs(this.getDrumOmega());
    if (omega > RELEASE_OMEGA) return;

    const angle = Math.atan2(winner.body.position.y, winner.body.position.x);
    const inWindow = Math.abs(angleDelta(angle, RELEASE_ANGLE)) < RELEASE_ARC;
    if (!inWindow && omega > RELEASE_OMEGA_FORCE) return;

    winner.body.settling = true;
    winner.body.restTimer = 0;
  }

  /** Watches for the ball coming to rest. It is never moved or steered. */
  private updateSettle(dt: number): void {
    const winner = this.winner;
    if (!winner || this.parked) return;

    const body = winner.body;

    // The ball must be somewhere the track can actually hold it. On the upper
    // wall it is momentarily slow at the apex of an arc but still accelerating,
    // and without this it latches there and freezes halfway up the bowl.
    const supported = body.position.y > body.radius;
    const slow = body.speed < REST_SPEED && Math.abs(body.angularVelocity) < REST_ANGULAR;

    // The thresholds have to hold for a moment, so the reversal at the top of a
    // bounce is not mistaken for the ball having settled.
    body.restTimer = supported && slow ? body.restTimer + dt : 0;
    if (body.restTimer >= REST_HOLD) this.parkInPlace();
  }

  /**
   * Freezes the ball exactly where the simulation left it. There is no target
   * position and no snap: the pocket it rests in is the one it rolled into.
   */
  private parkInPlace(): void {
    const winner = this.winner;
    if (!winner) return;

    const x = winner.body.position.x;
    const y = winner.body.position.y;
    winner.body.velocity.set(0, 0);
    winner.body.angularVelocity = 0;
    winner.body.invMass = 0;
    winner.sync(y / PLAYFIELD_RADIUS);
    winner.alignFaceUpright();

    this.parked = true;
    this.parkLocalRadius = Math.hypot(x, y);
    this.parkLocalAngle = normalizeAngle(Math.atan2(y, x) - this.getDrumAngle());

    this.machine.particles.burst(x, y, 12, 280);
    this.machine.seatGlow.pulse(x, y, 50, 190, 0.55);
    this.camera.shake.kick(2.2, 0.22);

    // The indicator arm swings across and lights on the seated ball.
    this.machine.arm.swingTo(Math.atan2(y, x), T_ARM_SWING);
    this.machine.arm.setLit(true);

    // Ease the framing onto the pocket. Only part of the way in x, so the move
    // reads as the operator re-framing rather than a snap.
    this.camera.focusOn(MACHINE_X + x * 0.55, CAM_CLOSE_FOCUS_Y, CAM_CLOSE_ZOOM, 0.5);
  }

  /**
   * Holds the settled ball on the spot it came to rest as the wheel drifts.
   * The position is stored in wheel-local polar form at the moment it parked,
   * so this reproduces where the ball actually stopped rather than moving it.
   */
  followParkedPocket(): void {
    if (!this.parked || !this.winner || this.winner.body.lifting) return;
    const angle = this.parkLocalAngle + this.getDrumAngle();
    const x = Math.cos(angle) * this.parkLocalRadius;
    const y = Math.sin(angle) * this.parkLocalRadius;
    this.winner.body.position.set(x, y);
    this.machine.arm.swingTo(angle, 0.08);
  }

  /**
   * Hands the settled ball to the return mechanism.
   *
   * In the reference the ball sits in its pocket for about 2.2 seconds and then
   * leaves it as the camera begins pulling back, drawn up into the machine's
   * core and out of sight roughly two thirds of a second later. It is taken off
   * the track here - the solver stops touching it - and driven by the lift
   * below, so none of the fall or settle behaviour is affected.
   */
  /**
   * The mechanism closing on the seated ball.
   *
   * The ball does not move: it is spun up on the spot, which is what the
   * reference shows over the frames before it rises - the printed number whirls
   * and blurs while the ball stays in its holder. The spin carries into the
   * lift, so the ball is already turning when it leaves.
   */
  private updateMechanismEngage(dt: number): void {
    const winner = this.winner;
    if (!winner || !this.parked) return;

    if (this.engageElapsed < 0) this.engageElapsed = 0;
    this.engageElapsed += dt;

    const t = clamp(this.engageElapsed / LIFT_SPINUP_TIME, 0, 1);
    const body = winner.body;

    // Spin ramps in rather than snapping on, so the take-up reads mechanical.
    body.angularVelocity = LIFT_SPINUP_SPIN * easeOutCubic(t);
    body.rotation += body.angularVelocity * dt;

    // The holder shakes very slightly as the drive engages. Applied to the body
    // so the ball's own sync carries it; the pocket follower re-pins the ball
    // each frame, which is what keeps the shake from accumulating into drift.
    const shake = Math.sin(this.engageElapsed * LIFT_VIBRATION_RATE) * LIFT_VIBRATION * t * 0.6;
    body.position.add(shake, 0);
  }

  private beginReturnLift(): void {
    const winner = this.winner;
    if (!winner) return;

    const body = winner.body;
    // The channel is a fixed part of the machine, so its axis is captured once
    // here rather than re-derived from the ball's position every frame. Re-aiming
    // each frame makes the ball oscillate about the centre instead of leaving.
    const distance = Math.hypot(body.position.x, body.position.y) || 1;
    this.liftDirX = -body.position.x / distance;
    this.liftDirY = -body.position.y / distance;

    body.lifting = true;
    body.invMass = 1;
    body.velocity.set(0, 0);
    this.liftElapsed = 0;
    this.engageElapsed = -1;

    // The release port lights as the mechanism takes the ball: a wide blue
    // bloom over the lower drum, ramping in over the first frames of the rise
    // and gone a quarter of a second later, as in reference frames 051-056.
    this.machine.returnGlow.pulse(body.position.x, body.position.y, 150, 520, 0.34, {
      intensity: 0.9,
      attack: 0.08,
    });
    this.machine.arm.setLit(false);
  }

  /**
   * Drives the ball up the return channel.
   *
   * Velocity based and delta timed throughout: the mechanism takes up its slack
   * as a slow creep, then accelerates the ball along the channel toward the
   * machine's core, adding the shake of a driven part and the spin the channel
   * imparts. Nothing here interpolates between two points.
   */
  private updateReturnLift(dt: number): void {
    const winner = this.winner;
    if (!winner || this.liftElapsed < 0) return;

    const body = winner.body;
    if (!body.lifting) return;

    this.liftElapsed += dt;

    const dirX = this.liftDirX;
    const dirY = this.liftDirY;

    // The mechanism already has the ball and has spun it up, so the rise begins
    // straight into acceleration rather than with another take-up.
    body.velocity.x += dirX * LIFT_ACCELERATION * dt;
    body.velocity.y += dirY * LIFT_ACCELERATION * dt;

    const speed = body.speed;
    if (speed > LIFT_MAX_SPEED) {
      const scale = LIFT_MAX_SPEED / speed;
      body.velocity.x *= scale;
      body.velocity.y *= scale;
    }

    body.position.addScaled(body.velocity, dt);

    // Shake of a driven mechanism, across the channel rather than along it.
    const wobble = Math.sin(this.liftElapsed * LIFT_VIBRATION_RATE) * LIFT_VIBRATION;
    body.position.add(-dirY * wobble, dirX * wobble);

    // The spin the mechanism put on the ball carries up the channel.
    body.angularVelocity = Math.max(body.angularVelocity, LIFT_SPIN);
    body.rotation += body.angularVelocity * dt;

    // It disappears because the hub covers it, not because it is switched off:
    // the agitator draws over the ball layer, so once the ball is far enough in
    // for the boss to cover it completely there is nothing left to see. Tested
    // against the position after the move, and against the ball's whole
    // silhouette rather than its centre - hiding it as soon as its centre
    // reached the boss would pop, because most of the ball is still outside it.
    // Progress is measured along the channel axis, not as a radius: a radius
    // window small enough to mean "covered by the boss" is smaller than one
    // frame's travel at lift speed, so the ball steps straight over it and
    // oscillates about the centre instead of arriving. Projecting onto the axis
    // also catches an overshoot, and does so at any frame rate.
    const along = body.position.x * dirX + body.position.y * dirY;

    // Over the last stretch the ball passes behind the boss and on into the
    // core, so it recedes rather than vanishing: it shrinks and dims as the
    // mechanism takes it in, and is only dropped once there is nothing left.
    const recession = clamp((along + CORE_ENTRY_DEPTH) / CORE_ENTRY_DEPTH, 0, 1);
    winner.setRecession(recession);

    if (along >= 0) {
      winner.setVisible(false);
      body.lifting = false;
      this.liftElapsed = -1;
      // The ball has left the drum, so it leaves the simulation too: parked
      // would let the pocket follower drag it back down, and leaving it active
      // would have an invisible ball falling around inside the empty machine.
      this.parked = false;
      body.active = false;
      body.velocity.set(0, 0);
      body.angularVelocity = 0;
    }
  }

  private setState(next: GameState): void {
    if (next === this.state) return;
    if (!canTransition(this.state, next)) {
      throw new Error(`Illegal draw transition: ${this.state} -> ${next}`);
    }

    this.state = next;
    this.elapsed = 0;

    if (next === 'revealing') {
      // This is the moment the result becomes public.
      this.displayedNumber = this.pendingNumber;
      this.overlay.setNumber(this.displayedNumber);
      if (this.history.unshift(this.displayedNumber) > 12) this.history.length = 12;
      this.bus.emit('resultRevealed', this.displayedNumber);
      this.bus.emit('historyChanged', this.history.slice());
    }
    this.bus.emit('stateChanged', next);
  }

  /** Distinct printed numbers for the balls currently loaded. */
  private pickNumbers(count: number): number[] {
    const pool: number[] = [];
    for (let n = NUMBER_MIN; n <= NUMBER_MAX; n++) pool.push(n);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = this.rng.int(0, i);
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    return pool.slice(0, count);
  }

  get progressInPhase(): number {
    switch (this.state) {
      case 'spinning':
        return invLerp(0, T_SPIN, this.elapsed);
      case 'draining':
        return invLerp(0, T_DRAIN, this.elapsed);
      case 'settling':
        return invLerp(0, T_SETTLE_MAX, this.elapsed);
      case 'revealing':
        return invLerp(0, T_REVEAL_HOLD, this.elapsed);
      case 'returning':
        return invLerp(0, T_RETURN, this.elapsed);
      default:
        return 0;
    }
  }
}
