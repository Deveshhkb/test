import {
  BALL_RADIUS,
  CAM_CLOSE_FOCUS_Y,
  CAM_CLOSE_ZOOM,
  DEFAULT_RESULT,
  MACHINE_X,
  GRAVITY,
  NUMBER_MAX,
  NUMBER_MIN,
  PLAYFIELD_RADIUS,
  SPIN_TARGET_SPEED,
  SPOKE_COUNT,
  T_ARM_SWING,
  T_DRAIN,
  T_RETURN,
  T_REVEAL_HOLD,
  T_SETTLE,
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

const SETTLE_SPRING = 70;
const SETTLE_DAMPING = 2 * Math.sqrt(SETTLE_SPRING);
const PARK_DISTANCE = 5;
const PARK_SPEED = 90;
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

  private readonly drain: DrainRecord[] = [];
  private readonly rng = new Rng();
  private readonly history: number[] = [];
  private readonly targetScratch = { x: 0, y: 0 };

  constructor(
    private readonly balls: readonly RouletteBall[],
    private readonly machine: RouletteMachine,
    private readonly camera: Camera,
    private readonly spin: SpinSystem,
    private readonly overlay: ResultOverlay,
    private readonly glow: GlowEffect,
    private readonly bus: EventBus<GameEvents>,
    private readonly getDrumAngle: () => number,
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
    this.machine.particles.reset();
    this.machine.seatGlow.reset();
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
        if (this.elapsed >= T_DRAIN) this.setState('settling');
        break;

      case 'settling':
        this.updateDrain(dt);
        this.updateSettle(dt);
        if (this.parked) {
          this.setState('revealing');
        } else if (this.elapsed >= T_SETTLE * 2.5) {
          // Safety net: if the ball never physically seated, force the reveal
          // so the sequence can never wedge.
          this.forcePark();
          this.setState('revealing');
        }
        break;

      case 'revealing':
        this.overlay.setReveal(easeOutCubic(clamp(this.elapsed / REVEAL_MORPH, 0, 1)));
        if (this.elapsed >= T_REVEAL_HOLD) {
          this.camera.dollyToWide(T_RETURN, easeInOutCubic);
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

  private updateSettle(dt: number): void {
    const winner = this.winner;
    if (!winner || this.parked) return;

    const target = this.pocketTarget();
    const body = winner.body;
    const dx = target.x - body.position.x;
    const dy = target.y - body.position.y;

    // Critically damped pull into the pocket, with gravity cancelled so the
    // ball seats instead of skipping past it.
    body.velocity.x += (SETTLE_SPRING * dx - SETTLE_DAMPING * body.velocity.x) * dt;
    body.velocity.y += (SETTLE_SPRING * dy - SETTLE_DAMPING * body.velocity.y - GRAVITY) * dt;

    if (Math.hypot(dx, dy) < PARK_DISTANCE && body.speed < PARK_SPEED) {
      this.park(target.x, target.y);
    }
  }

  private park(x: number, y: number): void {
    const winner = this.winner;
    if (!winner) return;

    winner.body.position.set(x, y);
    winner.body.velocity.set(0, 0);
    winner.body.invMass = 0;
    winner.sync(y / PLAYFIELD_RADIUS);

    this.parked = true;
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

  private forcePark(): void {
    const target = this.pocketTarget();
    this.park(target.x, target.y);
  }

  /**
   * Where the winner should seat. Prefers the pocket nearest the bottom of the
   * wheel so it lands inside the close-up framing, and rejects pockets a
   * stopped spoke is lying across.
   */
  private pocketTarget(): { x: number; y: number } {
    const drumAngle = this.getDrumAngle();
    const radius = this.machine.wheel.pocketRadius;

    let bestAngle = Math.PI / 2;
    if (this.parked) {
      bestAngle = this.parkLocalAngle + drumAngle;
    } else {
      let bestScore = Number.POSITIVE_INFINITY;
      for (const pocket of this.machine.wheel.pocketAngles) {
        const worldAngle = pocket + drumAngle;
        // Weighted toward the bottom of the wheel so the winner lands inside
        // the close-up framing rather than off at the side.
        const score =
          Math.abs(angleDelta(worldAngle, Math.PI / 2)) * 2.2 +
          this.spokeClearancePenalty(pocket);
        if (score < bestScore) {
          bestScore = score;
          bestAngle = worldAngle;
        }
      }
    }

    this.targetScratch.x = Math.cos(bestAngle) * radius;
    this.targetScratch.y = Math.sin(bestAngle) * radius;
    return this.targetScratch;
  }

  /**
   * Spokes turn with the wheel, so a pocket's clearance is fixed in wheel-local
   * space. Pockets a paddle would sit on top of are pushed down the ranking.
   */
  private spokeClearancePenalty(localPocketAngle: number): number {
    const sector = TAU / SPOKE_COUNT;
    const offset = Math.abs(
      angleDelta(localPocketAngle, Math.round(localPocketAngle / sector) * sector),
    );
    const required = 0.3;
    return offset >= required ? 0 : (required - offset) * 8;
  }

  /** Holds a parked ball and the arm on their pocket as the wheel drifts. */
  followParkedPocket(): void {
    if (!this.parked || !this.winner) return;
    const target = this.pocketTarget();
    this.winner.body.position.set(target.x, target.y);
    this.machine.arm.swingTo(Math.atan2(target.y, target.x), 0.08);
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
        return invLerp(0, T_SETTLE, this.elapsed);
      case 'revealing':
        return invLerp(0, T_REVEAL_HOLD, this.elapsed);
      case 'returning':
        return invLerp(0, T_RETURN, this.elapsed);
      default:
        return 0;
    }
  }
}
