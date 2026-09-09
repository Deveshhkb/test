import {
  BALL_RADIUS,
  DRUM_INNER_RADIUS,
  DRUM_SPOKE_COUNT,
  GRAVITY,
  SPIN_TARGET_SPEED,
  NUMBER_MAX,
  NUMBER_MIN,
  T_DRAIN,
  T_RETURN,
  T_REVEAL_HOLD,
  T_SETTLE,
  T_SPIN,
} from '../config';
import { Ball } from '../entities/Ball';
import { Drum } from '../entities/Drum';
import { ResultOverlay } from '../entities/ResultOverlay';
import { Particles } from '../effects/Particles';
import { EventBus } from '../utils/EventBus';
import { easeInCubic, easeInOutCubic, easeOutCubic, easeOutQuart } from '../utils/easing';
import { angleDelta, clamp, invLerp, normalizeAngle, TAU } from '../utils/math';
import { Rng } from '../utils/random';
import { GameEvents, GameState } from '../types';
import { CameraSystem } from './CameraSystem';
import { SpinSystem } from './SpinSystem';

/** Per-ball drain bookkeeping, preallocated so the sequence never allocates. */
interface DrainRecord {
  delay: number;
  progress: number;
  draining: boolean;
}

const SETTLE_SPRING = 70;
const SETTLE_DAMPING = 2 * Math.sqrt(SETTLE_SPRING);
const PARK_DISTANCE = 5;
const PARK_SPEED = 90;

/**
 * Directs one draw from spin-up to the camera pulling back out. This is the
 * only place that knows the running order of the reference clip; the camera,
 * spin, physics and overlay systems each stay unaware of the sequence.
 */
export class DrawSequenceSystem {
  private state: GameState = 'idle';
  private elapsed = 0;
  private winner: Ball | null = null;
  private winnerNumber = NUMBER_MIN;
  private parked = false;
  private parkLocalAngle = 0;
  private revealAmount = 0;

  private readonly drain: DrainRecord[] = [];
  private readonly rng = new Rng();
  private readonly history: number[] = [];

  constructor(
    private readonly balls: readonly Ball[],
    private readonly drum: Drum,
    private readonly camera: CameraSystem,
    private readonly spin: SpinSystem,
    private readonly overlay: ResultOverlay,
    private readonly particles: Particles,
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

  get winnerBall(): Ball | null {
    return this.winner;
  }

  get canStart(): boolean {
    return this.state === 'idle';
  }

  /**
   * Loads the drum. `spun` seeds the balls as a rim ring already travelling at
   * the drum's surface speed, which is the state the reference clip opens in;
   * the loader has already brought them up to speed before the shot starts.
   */
  fill(spun = false): void {
    const count = this.balls.length;
    const ringRadius = DRUM_INNER_RADIUS - BALL_RADIUS - 2;
    const scatter = DRUM_INNER_RADIUS * 0.62;
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
      ball.paint(i % 2 === 0 ? 'crimson' : 'onyx');
      ball.setNumber(numbers[i]);
      ball.setVisible(true);

      const record = this.drain[i];
      record.delay = 0;
      record.progress = 0;
      record.draining = false;
    }
    this.winner = null;
    this.parked = false;
    this.particles.reset();
  }

  /** Kicks off a draw. `forced` pins the result, otherwise it is drawn at random. */
  start(forced?: number): boolean {
    if (!this.canStart) return false;

    this.fill(true);

    const index = this.rng.int(0, this.balls.length - 1);
    this.winner = this.balls[index];
    this.winnerNumber =
      forced === undefined
        ? this.rng.int(NUMBER_MIN, NUMBER_MAX)
        : clamp(Math.round(forced), NUMBER_MIN, NUMBER_MAX);

    // The drawn ball carries the result, so the printed face matches the HUD.
    this.winner.paint('onyx');
    this.winner.setNumber(this.winnerNumber);

    // Stagger the losers so the drum empties as a stream, not all at once.
    for (let i = 0; i < this.balls.length; i++) {
      const record = this.drain[i];
      record.delay = this.balls[i] === this.winner ? Number.POSITIVE_INFINITY : this.rng.range(0, T_DRAIN * 0.55);
      record.progress = 0;
      record.draining = false;
    }

    this.overlay.setNumber(this.winnerNumber);
    this.overlay.setReveal(0);
    this.revealAmount = 0;
    this.parked = false;

    this.spin.spinUp();
    // One continuous push-in that runs through the spin and into the drain,
    // matching the uninterrupted dolly in the reference.
    this.camera.dollyToClose(T_SPIN + T_DRAIN, easeInOutCubic);

    this.setState('spinning');
    this.bus.emit('drawStarted', this.winnerNumber);
    return true;
  }

  update(dt: number): void {
    this.elapsed += dt;

    switch (this.state) {
      case 'idle':
        break;
      case 'spinning':
        this.updateBigNumberFade();
        if (this.elapsed >= T_SPIN) {
          this.spin.stop();
          this.setState('draining');
        }
        break;
      case 'draining':
        this.updateBigNumberFade();
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
          // so the sequence can never stall.
          this.forcePark();
          this.setState('revealing');
        }
        break;
      case 'revealing':
        this.updateSettle(dt);
        this.revealAmount = easeOutCubic(clamp(this.elapsed / 0.55, 0, 1));
        this.overlay.setReveal(this.revealAmount);
        if (this.elapsed >= T_REVEAL_HOLD) {
          this.camera.dollyToWide(T_RETURN, easeInOutCubic);
          this.setState('returning');
        }
        break;
      case 'returning': {
        const t = clamp(this.elapsed / T_RETURN, 0, 1);
        this.revealAmount = 1 - easeInCubic(clamp(this.elapsed / (T_RETURN * 0.6), 0, 1));
        this.overlay.setReveal(this.revealAmount);
        this.overlay.setBigNumberAlpha(easeOutQuart(t) * 0.78);
        if (this.elapsed >= T_RETURN) {
          this.setState('idle');
        }
        break;
      }
    }
  }

  /** The red numeral dissolves as the camera buries itself in the glass. */
  private updateBigNumberFade(): void {
    this.overlay.setBigNumberAlpha((1 - this.camera.closeness) * 0.78);
  }

  private updateDrain(dt: number): void {
    for (let i = 0; i < this.balls.length; i++) {
      const record = this.drain[i];
      const ball = this.balls[i];
      if (!ball.view.visible) continue;

      if (!record.draining) {
        record.delay -= dt;
        if (record.delay > 0) continue;
        record.draining = true;
        // Hand the ball to the release gate: it stops colliding and slides out.
        ball.body.active = false;
      }

      record.progress = Math.min(1, record.progress + dt / 0.28);
      const t = record.progress;

      // Carry on toward the release box under the drum while fading out.
      ball.body.position.y += (DRUM_INNER_RADIUS * 1.1 - ball.body.position.y) * Math.min(1, dt * 7);
      ball.body.position.x *= 1 - Math.min(1, dt * 4);
      ball.view.alpha = 1 - t;
      ball.view.scale.set(1 - t * 0.45);
      ball.sync();

      if (t >= 1) ball.setVisible(false);
    }
  }

  private updateSettle(dt: number): void {
    const winner = this.winner;
    if (!winner || this.parked) return;

    const target = this.slotTarget();
    const body = winner.body;

    const dx = target.x - body.position.x;
    const dy = target.y - body.position.y;

    // Critically damped pull into the cup, with gravity cancelled so the ball
    // seats instead of skipping past the slot.
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
    winner.sync();
    this.parked = true;
    this.parkLocalAngle = normalizeAngle(Math.atan2(y, x) - this.getDrumAngle());
    this.particles.burst(x, y, 10, 260);
    this.camera.shake.kick(2.2, 0.22);
  }

  private forcePark(): void {
    const target = this.slotTarget();
    this.park(target.x, target.y);
  }

  /** Reusable target vector; the settle runs every frame so this stays pooled. */
  private readonly targetScratch = { x: 0, y: 0 };

  private slotTarget(): { x: number; y: number } {
    const drumAngle = this.getDrumAngle();
    const radius = this.drum.slotRadius - 2;

    let bestAngle = Math.PI / 2;
    if (this.parked) {
      bestAngle = this.parkLocalAngle + drumAngle;
    } else {
      // Prefer the bottom-most cup so the winner seats in frame during the
      // close-up, but reject cups a stopped spoke is lying across.
      let bestScore = Number.POSITIVE_INFINITY;
      for (const slot of this.drum.slotAngles) {
        const worldAngle = slot + drumAngle;
        const score =
          Math.abs(angleDelta(worldAngle, Math.PI / 2)) +
          this.spokeClearancePenalty(slot);
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
   * Spokes rotate with the drum, so a cup's clearance is fixed in drum-local
   * space. Cups a paddle would sit on top of are pushed down the ranking.
   */
  private spokeClearancePenalty(localSlotAngle: number): number {
    const sector = TAU / DRUM_SPOKE_COUNT;
    const offset = Math.abs(angleDelta(localSlotAngle, Math.round(localSlotAngle / sector) * sector));
    const required = 0.34;
    return offset >= required ? 0 : (required - offset) * 8;
  }

  /** Keeps a parked ball glued to its cup while the drum drifts back to idle. */
  followParkedSlot(): void {
    if (!this.parked || !this.winner) return;
    const target = this.slotTarget();
    this.winner.body.position.set(target.x, target.y);
  }

  private setState(next: GameState): void {
    if (next === this.state) return;
    this.state = next;
    this.elapsed = 0;

    if (next === 'revealing') {
      if (this.history.unshift(this.winnerNumber) > 12) this.history.length = 12;
      this.bus.emit('resultRevealed', this.winnerNumber);
      this.bus.emit('historyChanged', this.history.slice());
    }
    this.bus.emit('stateChanged', next);
  }

  /** Distinct face numbers for the balls currently in the drum. */
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

  /** Used by the debug overlay. */
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
