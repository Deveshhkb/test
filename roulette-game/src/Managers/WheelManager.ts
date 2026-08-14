import { Wheel } from '../Objects/Wheel';
import { Ball } from '../Objects/Ball';
import { AnimationManager } from './AnimationManager';
import { AudioManager } from './AudioManager';
import { EventBus } from '../Utilities/EventBus';
import { Logger } from '../Utilities/Logger';
import { getNumberColor, getWheelOrder, WHEEL_GEOMETRY } from '../Game/Constants';
import { GameEvent, Pocket, RouletteNumber, SoundId, WheelConfig } from '../Types';
import {
  bounceEnvelope,
  clamp,
  createRandom,
  normalizeAngle,
  randomRange,
  TAU,
} from '../Utilities/Math';

/** Phase of the wheel/ball simulation. */
export enum SpinPhase {
  /** Wheel turning slowly, no ball on the track. */
  IDLE = 'IDLE',
  /** Wheel spinning up before the launch. */
  ACCELERATING = 'ACCELERATING',
  /** Ball circling the rim, losing speed. */
  TRACK = 'TRACK',
  /** Ball falling through the deflectors toward its pocket. */
  DROP = 'DROP',
  /** Ball seated - rides with the wheel head. */
  LOCKED = 'LOCKED',
}

/**
 * Wheel and ball simulation.
 *
 * ## How a deterministic result is reached without looking scripted
 *
 * The outcome is known before the ball is launched (that is how every real
 * money game works - the RNG or the live wheel is authoritative, the client
 * animates toward a known answer). The trick is landing on it exactly while
 * every frame still looks like free physics.
 *
 * The simulation therefore splits into two regimes:
 *
 * - **Track phase** - the ball's angle is *integrated* from a decaying angular
 *   velocity. Nothing about it is solved or constrained; it is free motion, and
 *   where it ends up does not matter.
 *
 * - **Drop phase** - the ball's angle is expressed *relative to the wheel head*:
 *   `ballAngle = wheelAngle + pocketAngle + offset`, where `offset` is tweened
 *   from wherever the ball happens to be down to exactly zero. Because the
 *   offset is measured at the moment the drop begins, the two phases join with
 *   no discontinuity, and because it ends at zero the ball is guaranteed to be
 *   dead-centre in the winning pocket.
 *
 * The pay-off is that the wheel's own motion never has to be predicted or held
 * constant: the drop tracks the live wheel angle every frame, so the croupier
 * can spin the head at any speed, accelerate it mid-drop, or have it fight a
 * dropped frame, and the ball still lands correctly.
 *
 * The initial offset is sized from the ball's *actual* relative velocity so the
 * hand-over also matches in speed, not just position - that is what stops the
 * drop from reading as a snap.
 */
export class WheelManager {
  private readonly log = Logger.create('WheelManager');
  private readonly pockets: readonly Pocket[];
  private readonly random: () => number;

  private phase = SpinPhase.IDLE;

  /* Live simulation state - written by the ticker, tweened via proxies. */
  private wheelAngle = 0;
  /** Wheel angular speed in revolutions/second (negative = counter-clockwise). */
  private readonly wheelMotion = { speed: 0 };
  private ballAngle = 0;
  /** Ball angular speed in revolutions/second (opposite sign to the wheel). */
  private readonly ballMotion = { speed: 0 };
  /** Ball angle relative to its destination pocket - driven during the drop. */
  private readonly dropMotion = { offset: 0, progress: 0 };
  private ballRadius: number = WHEEL_GEOMETRY.BALL_TRACK;
  /** Accumulated roll of the ball about its own centre. */
  private ballRoll = 0;
  /**
   * Per-spin randomisation.
   *
   * Re-drawn at every launch so no two spins are frame-identical. Without this
   * the rim phase is the same arc every round, which is the clearest tell that
   * an animation is canned - players notice the repetition long before they can
   * say what it is they are noticing.
   */
  private variation = { launchScale: 1, wobblePhase: 0, wobbleRate: 3, scatterPhase: 0 };

  /** Pocket the current spin is committed to. */
  private targetPocket?: Pocket;
  /** Cancellation flag so a `reset()` mid-spin cannot resolve stale promises. */
  private spinToken = 0;

  public constructor(
    private readonly wheel: Wheel,
    private readonly ball: Ball,
    private config: WheelConfig,
    private readonly animations: AnimationManager,
    private readonly audio: AudioManager,
    private readonly bus: EventBus,
    seed = 0x9e3779b9,
  ) {
    this.pockets = WheelManager.buildPockets(config);
    this.random = createRandom(seed);
    this.wheelMotion.speed = config.wheelSpeed;
    this.ball.hide();
  }

  /** Build the pocket ring: value, colour, index and centre angle. */
  public static buildPockets(config: WheelConfig): readonly Pocket[] {
    const order = getWheelOrder(config.type);
    const step = TAU / order.length;

    return order.map((value, index) => ({
      value,
      color: getNumberColor(value),
      index,
      // Index 0 sits at 12 o'clock; the sequence runs clockwise, matching the
      // baked head texture.
      angle: index * step,
    }));
  }

  public getPockets(): readonly Pocket[] {
    return this.pockets;
  }

  public updateConfig(config: WheelConfig): void {
    this.config = config;
    if (this.phase === SpinPhase.IDLE) this.wheelMotion.speed = config.wheelSpeed;
  }

  /* --------------------------------------------------------------------- */
  /* Per-frame simulation                                                  */
  /* --------------------------------------------------------------------- */

  /**
   * Advance the simulation. Called once per frame with the elapsed seconds.
   *
   * Allocation-free by construction: every value it touches is a number on a
   * pre-existing object. This is the hottest function in the engine.
   */
  public update(deltaSeconds: number): void {
    // The wheel head never stops - a live wheel turns between rounds too.
    this.wheelAngle += this.wheelMotion.speed * TAU * deltaSeconds;

    // Roll without slipping: arc length travelled divided by the ball's radius.
    // Both are fractions of the wheel radius, so it cancels to a pure ratio and
    // holds at any wheel size.
    if (this.phase === SpinPhase.TRACK || this.phase === SpinPhase.DROP) {
      const arc = this.ballMotion.speed * TAU * deltaSeconds * this.ballRadius;
      this.ballRoll += arc / WHEEL_GEOMETRY.BALL;
    }

    switch (this.phase) {
      case SpinPhase.TRACK: {
        // Free integration: no constraint, no target.
        this.ballAngle += this.ballMotion.speed * TAU * deltaSeconds;

        // The rim is not a perfect circle and the ball is not perfectly round.
        // A shallow radial oscillation, decaying as the ball loses speed, stops
        // the track phase looking like a point on a mathematical circle.
        const energy = clamp(Math.abs(this.ballMotion.speed) / this.config.ballSpeed, 0, 1);
        this.variation.wobblePhase += deltaSeconds * this.variation.wobbleRate;
        this.ballRadius =
          WHEEL_GEOMETRY.BALL_TRACK +
          Math.sin(this.variation.wobblePhase) * 0.006 * energy;
        break;
      }

      case SpinPhase.DROP:
        this.applyDropMotion();
        break;

      case SpinPhase.LOCKED:
        // Seated in the pocket: the ball is now part of the head.
        if (this.targetPocket) {
          this.ballAngle = this.wheelAngle + this.targetPocket.angle;
        }
        break;

      case SpinPhase.IDLE:
      case SpinPhase.ACCELERATING:
      default:
        break;
    }

    this.render();
  }

  /**
   * Drop-phase positioning.
   *
   * The offset closes to zero under GSAP's control; the bounce term rides on
   * top and is itself forced to zero at the end of the drop, so the landing is
   * exact no matter how violent the bounces look on the way down.
   */
  private applyDropMotion(): void {
    const pocket = this.targetPocket;
    if (!pocket) return;

    const progress = this.dropMotion.progress;

    // Angular scatter as the ball clatters off deflectors and frets. Amplitude
    // is roughly one pocket width and decays quadratically to nothing.
    // Scatter as the ball clatters off deflectors and frets. The phase offset
    // is re-drawn per spin, so the bounce pattern differs every round instead
    // of replaying the same symmetric wobble.
    const scatterAmplitude = this.wheel.getPocketStep() * 1.6;
    const scatter =
      Math.sin(this.variation.scatterPhase + progress * this.config.ballBounces * Math.PI) *
      scatterAmplitude *
      (1 - progress) *
      (1 - progress);

    this.ballAngle = this.wheelAngle + pocket.angle + this.dropMotion.offset + scatter;

    // Radial fall: a smooth descent with decaying hops off the deflectors.
    const fall = 1 - Math.pow(1 - progress, 2.4);
    const base =
      WHEEL_GEOMETRY.BALL_TRACK +
      (WHEEL_GEOMETRY.POCKET - WHEEL_GEOMETRY.BALL_TRACK) * fall;
    const hop =
      bounceEnvelope(progress, this.config.ballBounces, 2.6) *
      (WHEEL_GEOMETRY.BALL_TRACK - WHEEL_GEOMETRY.POCKET) *
      0.34;

    this.ballRadius = base + hop;
  }

  /** Push simulation state into the display objects. */
  private render(): void {
    this.wheel.setRotation(this.wheelAngle);
    this.wheel.setMotionBlur(this.wheelMotion.speed);
    this.ball.setPolar(this.ballAngle, this.ballRadius);
    this.ball.setRoll(this.ballRoll);

    // Trail intensity tracks ball speed, and dies as it settles.
    const speed = Math.abs(this.ballMotion.speed);
    this.ball.updateTrail(this.phase === SpinPhase.TRACK ? clamp(speed / 2, 0, 1) : 0);

    if (this.targetPocket && this.phase === SpinPhase.LOCKED) {
      this.wheel.positionPocketGlow(this.wheelAngle + this.targetPocket.angle);
    }
  }

  /* --------------------------------------------------------------------- */
  /* Spin sequence                                                         */
  /* --------------------------------------------------------------------- */

  /**
   * Run a complete spin, resolving once the ball is seated.
   *
   * @param winningNumber the outcome to land on - from the server in a live
   *   deployment, from the local RNG otherwise.
   * @param roundId echoed on the `BALL_DROP` event for correlation.
   */
  public async spin(winningNumber: RouletteNumber, roundId: string): Promise<void> {
    const pocket = this.pockets.find((candidate) => candidate.value === winningNumber);
    if (!pocket) {
      this.log.error(`no pocket for ${String(winningNumber)} - aborting spin`);
      throw new Error(`Invalid winning number: ${String(winningNumber)}`);
    }

    const token = ++this.spinToken;
    this.targetPocket = pocket;
    this.wheel.setPocketGlow(0, 0xffffff);

    await this.accelerate(token);
    if (token !== this.spinToken) return;

    await this.runTrack(token);
    if (token !== this.spinToken) return;

    this.bus.emit(GameEvent.BALL_DROP, { roundId });
    await this.runDrop(token);
    if (token !== this.spinToken) return;

    this.settle();
  }

  /** Spin the head up to speed before the ball is launched. */
  private accelerate(token: number): Promise<void> {
    this.phase = SpinPhase.ACCELERATING;
    this.audio.playLoop(SoundId.WHEEL_SPIN, 0.5);

    return new Promise((resolve) => {
      this.animations.to(this.wheelMotion, {
        speed: this.config.wheelSpinSpeed,
        duration: this.config.wheelAccelerationTime,
        ease: AnimationManager.EASE_WHEEL_ACCEL,
        onComplete: () => {
          if (token === this.spinToken) resolve();
        },
      });
    });
  }

  /**
   * Launch the ball and let it lose speed on the rim.
   *
   * The launch point is randomised around the wheel so consecutive spins do not
   * start from an identical frame - the single most obvious tell of a canned
   * animation.
   */
  private runTrack(token: number): Promise<void> {
    this.phase = SpinPhase.TRACK;

    // Fresh randomisation for this spin.
    this.variation = {
      // +/-12% on the launch, so the ball does not complete the same number of
      // laps every round.
      launchScale: randomRange(this.random, 0.88, 1.12),
      wobblePhase: randomRange(this.random, 0, TAU),
      wobbleRate: randomRange(this.random, 2.2, 4.1),
      scatterPhase: randomRange(this.random, 0, Math.PI),
    };

    // Ball runs against the wheel, as it must.
    const direction = this.config.wheelSpinSpeed >= 0 ? -1 : 1;
    this.ballMotion.speed = this.config.ballSpeed * this.variation.launchScale * direction;
    this.ballAngle = this.wheelAngle + randomRange(this.random, 0, TAU);
    this.ballRadius = WHEEL_GEOMETRY.BALL_TRACK;
    this.ballRoll = randomRange(this.random, 0, TAU);

    this.ball.show();
    // Trail deliberately off. It was tuned when the ball was twice this size;
    // at the reference's actual scale the tail segments stop reading as motion
    // blur and start reading as dirt on the wheel. The roll rotation carries
    // the sense of speed instead. `Ball.setTrailEnabled(true)` re-enables it
    // for a deployment that wants a larger ball.
    this.ball.setTrailEnabled(false);
    this.audio.playLoop(SoundId.BALL_ROLL, 0.55);

    return new Promise((resolve) => {
      this.animations.to(this.ballMotion, {
        // The ball still carries real speed when it leaves the track - it falls
        // because it drops below the speed the rim can hold it at, not because
        // it stopped.
        // Still carrying real speed when it leaves the rim - it falls because it
        // drops below the speed the track can hold it at, not because it stopped.
        // Varied per spin so the hand-off to the drop is never identical.
        speed:
          this.config.ballSpeed *
          direction *
          randomRange(this.random, 0.32, 0.46),
        duration: this.config.ballTrackDuration * randomRange(this.random, 0.9, 1.12),
        ease: AnimationManager.EASE_BALL_TRACK,
        onUpdate: () => {
          // Pitch and level of the rolling bed follow the ball's speed.
          const normalised = clamp(Math.abs(this.ballMotion.speed) / this.config.ballSpeed, 0, 1);
          this.audio.setLoopRate(SoundId.BALL_ROLL, 0.55 + normalised * 0.85, 0.08);
          this.audio.setLoopVolume(SoundId.BALL_ROLL, 0.2 + normalised * 0.35, 0.08);
        },
        onComplete: () => {
          if (token === this.spinToken) resolve();
        },
      });
    });
  }

  /**
   * Drop through the deflectors into the target pocket.
   *
   * `offset` is seeded from the ball's live position so the transition is
   * seamless, and from its live *relative velocity* so the number of extra
   * relative revolutions matches the energy the ball actually has left.
   */
  private runDrop(token: number): Promise<void> {
    const pocket = this.targetPocket;
    if (!pocket) return Promise.resolve();

    // Where the ball is right now, relative to its destination pocket.
    const gap = normalizeAngle(this.ballAngle - this.wheelAngle - pocket.angle);

    // Relative angular velocity, radians/second. Ball and wheel run opposite
    // ways, so these subtract into a large number.
    const relativeVelocity = Math.abs(
      (this.ballMotion.speed - this.wheelMotion.speed) * TAU,
    );

    // For an ease of the form 1-(1-t)^k the initial slope is k, so travelling
    // `d` in `T` seconds starts at `d*k/T`. Inverting gives the distance whose
    // opening speed matches what the ball actually has.
    const easeSlope = 3.4;
    const matchedDistance =
      (relativeVelocity * this.config.ballDropDuration) / easeSlope;
    const revolutions = clamp(Math.ceil(matchedDistance / TAU), 1, 5);

    // Negative because the ball closes on the pocket from behind: the offset
    // grows toward zero as the wheel catches up with it.
    this.dropMotion.offset = gap - revolutions * TAU;
    this.dropMotion.progress = 0;
    this.phase = SpinPhase.DROP;

    this.ball.setTrailEnabled(false);
    this.audio.play(SoundId.BALL_DROP, 0.9);
    this.audio.setLoopVolume(SoundId.BALL_ROLL, 0.12, 0.4);

    return new Promise((resolve) => {
      const timeline = this.animations.timeline({
        onComplete: () => {
          if (token === this.spinToken) resolve();
        },
      });

      timeline.to(
        this.dropMotion,
        {
          offset: 0,
          duration: this.config.ballDropDuration,
          ease: AnimationManager.EASE_BALL_SETTLE,
        },
        0,
      );
      timeline.to(
        this.dropMotion,
        { progress: 1, duration: this.config.ballDropDuration, ease: 'none' },
        0,
      );
      // Wheel eases back toward its resting speed while the ball comes down.
      timeline.to(
        this.wheelMotion,
        {
          speed: this.config.wheelSpeed,
          duration: this.config.ballDropDuration * 1.5,
          ease: AnimationManager.EASE_WHEEL_DECEL,
        },
        0,
      );
    });
  }

  /** Seat the ball and light the winning pocket. */
  private settle(): void {
    this.phase = SpinPhase.LOCKED;
    this.dropMotion.offset = 0;
    this.dropMotion.progress = 1;
    this.ballRadius = WHEEL_GEOMETRY.POCKET;
    this.ballMotion.speed = this.wheelMotion.speed;

    this.audio.stopLoop(SoundId.BALL_ROLL, 0.25);

    const pocket = this.targetPocket;
    if (!pocket) return;

    // A warm white bloom reads on red, black and green pockets alike; tinting
    // it to the pocket colour makes a black pocket's highlight disappear.
    this.wheel.setPocketGlow(0, 0xfff3cf);

    // Glow blooms in, then holds at a gentle pulse.
    const glow = this.wheel.getPocketGlow();
    this.animations.fromTo(
      glow,
      { alpha: 0 },
      { alpha: 0.85, duration: 0.28, ease: 'power2.out' },
    );
    this.animations.to(glow.scale, {
      x: glow.scale.x * 1.12,
      y: glow.scale.y * 1.12,
      duration: 0.75,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    this.log.debug(`settled on ${String(pocket.value)}`);
  }

  /* --------------------------------------------------------------------- */
  /* Verification & queries                                                */
  /* --------------------------------------------------------------------- */

  /**
   * Which pocket the ball is physically over right now.
   *
   * Independent of `targetPocket` - it reads the rendered geometry back. Used
   * as a self-check in debug builds: if this ever disagrees with the intended
   * result, the animation has drifted from the maths and the discrepancy is
   * caught in QA rather than by a player.
   */
  public detectPocket(): Pocket {
    const relative = normalizeAngle(this.ballAngle - this.wheelAngle);
    const step = this.wheel.getPocketStep();
    const index = Math.round(relative / step) % this.pockets.length;
    return this.pockets[index];
  }

  public getPocketAngle(value: RouletteNumber): number | undefined {
    return this.pockets.find((pocket) => pocket.value === value)?.angle;
  }

  /** Screen-space angle of a pocket, accounting for the head's rotation. */
  public getScreenAngle(value: RouletteNumber): number | undefined {
    const angle = this.getPocketAngle(value);
    return angle === undefined ? undefined : this.wheelAngle + angle;
  }

  public getPhase(): SpinPhase {
    return this.phase;
  }

  public isSpinning(): boolean {
    return this.phase === SpinPhase.TRACK || this.phase === SpinPhase.DROP;
  }

  /* --------------------------------------------------------------------- */
  /* Lifecycle                                                             */
  /* --------------------------------------------------------------------- */

  /** Abandon any spin in progress and return the wheel to its idle turn. */
  public reset(): void {
    // Bumping the token orphans every in-flight promise from the old spin.
    this.spinToken += 1;
    this.phase = SpinPhase.IDLE;
    this.targetPocket = undefined;

    this.animations.killTweensOf(this.wheelMotion);
    this.animations.killTweensOf(this.ballMotion);
    this.animations.killTweensOf(this.dropMotion);
    this.animations.killTweensOf(this.wheel.getPocketGlow());
    this.animations.killTweensOf(this.wheel.getPocketGlow().scale);

    this.wheelMotion.speed = this.config.wheelSpeed;
    this.ballMotion.speed = 0;
    this.ballRadius = WHEEL_GEOMETRY.BALL_TRACK;
    this.ballRoll = 0;
    this.dropMotion.offset = 0;
    this.dropMotion.progress = 0;

    this.wheel.setPocketGlow(0, 0xffffff);
    this.wheel.getPocketGlow().scale.set(1);
    this.ball.hide();

    this.audio.stopLoop(SoundId.BALL_ROLL, 0.2);
    this.audio.stopLoop(SoundId.WHEEL_SPIN, 0.4);
  }

  /** Hide the ball at the end of a round without disturbing the wheel. */
  public clearBall(): void {
    this.animations.to(this.ball, {
      alpha: 0,
      duration: 0.35,
      ease: 'power1.in',
      onComplete: () => {
        this.ball.hide();
        this.ball.alpha = 1;
      },
    });
    this.animations.to(this.wheel.getPocketGlow(), { alpha: 0, duration: 0.35 });
  }

  public destroy(): void {
    this.reset();
  }
}
