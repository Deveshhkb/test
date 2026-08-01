import { GamePhase } from '@aviator/shared';
import type { EventBus } from '@/game/engine/EventBus';
import type { StateMachine } from '@/game/engine/StateMachine';
import type { EngineEvents } from '@/game/engine/events';
import { ROUND_CONFIG } from '@/config/flight';
import { sampleCrashMultiplier } from '@/utils/random';

export interface RoundDirectorDeps {
  state: StateMachine<GamePhase>;
  events: EventBus<EngineEvents>;
  /** Injectable for tests; defaults to the real crash distribution. */
  sampleCrash?: () => number;
  config?: typeof ROUND_CONFIG;
}

/**
 * Drives the round lifecycle through the state machine on the engine
 * clock: waiting → betting → countdown → takeoff → running → crash →
 * result → reset → betting…
 *
 * This is the *local* authority. When the backend phase lands, a
 * SocketRoundDirector with the same event surface replaces it and the
 * server's snapshots/ticks drive the identical state machine — nothing
 * else in the client changes. The crash-point math here is the real
 * distribution (inverse-uniform with house edge), not a stand-in.
 */
export class RoundDirector {
  private readonly state: StateMachine<GamePhase>;
  private readonly events: EventBus<EngineEvents>;
  private readonly sampleCrash: () => number;
  private readonly config: typeof ROUND_CONFIG;

  private phaseElapsed = 0;
  private runElapsed = 0;
  private crashPoint = 1;
  private currentMultiplier = 1;
  private lastCountdownEmitted = -1;
  private roundCounter = 0;
  private roundId = 'local-0';
  private destroyed = false;
  private readonly unsubscribeState: () => void;

  constructor(deps: RoundDirectorDeps) {
    this.state = deps.state;
    this.events = deps.events;
    this.sampleCrash = deps.sampleCrash ?? (() => sampleCrashMultiplier());
    this.config = deps.config ?? ROUND_CONFIG;
    // Any transition (including ones forced by recovery) resets the phase clock.
    this.unsubscribeState = this.state.onChange(() => {
      this.phaseElapsed = 0;
    });
  }

  /** Current multiplier (1.00 outside takeoff/running). */
  get multiplier(): number {
    return this.currentMultiplier;
  }

  /** The sampled crash point of the round in progress. */
  get currentCrashPoint(): number {
    return this.crashPoint;
  }

  /** Seconds since takeoff began (drives the flight path). */
  get flightTime(): number {
    return this.runElapsed;
  }

  get currentRoundId(): string {
    return this.roundId;
  }

  update(dt: number): void {
    if (this.destroyed) return;
    this.phaseElapsed += dt;

    switch (this.state.current) {
      case GamePhase.Waiting:
        if (this.phaseElapsed >= this.config.waitingSeconds) {
          this.openBetting();
        }
        break;

      case GamePhase.Betting:
        if (this.phaseElapsed >= this.config.bettingSeconds) {
          this.lastCountdownEmitted = -1;
          this.state.transition(GamePhase.Countdown);
        }
        break;

      case GamePhase.Countdown: {
        const remaining = Math.ceil(this.config.countdownSeconds - this.phaseElapsed);
        if (remaining > 0 && remaining !== this.lastCountdownEmitted) {
          this.lastCountdownEmitted = remaining;
          this.events.emit('round:countdown', remaining);
        }
        if (this.phaseElapsed >= this.config.countdownSeconds) {
          this.beginTakeoff();
        }
        break;
      }

      case GamePhase.Takeoff:
        this.runElapsed += dt;
        this.currentMultiplier = 1;
        this.events.emit('round:multiplier', 1);
        if (this.phaseElapsed >= this.config.takeoffSeconds) {
          this.state.transition(GamePhase.Running);
        }
        break;

      case GamePhase.Running: {
        this.runElapsed += dt;
        const grown = Math.exp(this.config.growthRate * this.runElapsed);
        if (grown >= this.crashPoint) {
          this.currentMultiplier = this.crashPoint;
          this.events.emit('round:multiplier', this.currentMultiplier);
          this.state.transition(GamePhase.Crash);
          this.events.emit('round:crashed', {
            roundId: this.roundId,
            multiplier: this.crashPoint,
          });
        } else {
          this.currentMultiplier = grown;
          this.events.emit('round:multiplier', grown);
        }
        break;
      }

      case GamePhase.Crash:
        if (this.phaseElapsed >= this.config.crashSeconds) {
          this.state.transition(GamePhase.Result);
        }
        break;

      case GamePhase.Result:
        if (this.phaseElapsed >= this.config.resultSeconds) {
          this.state.transition(GamePhase.Reset);
          this.events.emit('round:reset', undefined);
        }
        break;

      case GamePhase.Reset:
        if (this.phaseElapsed >= this.config.resetSeconds) {
          this.openBetting();
        }
        break;

      case GamePhase.Celebration:
        // Entered by the win-presentation flow (later phase); fall through
        // to reset on the same timer as result.
        if (this.phaseElapsed >= this.config.resultSeconds) {
          this.state.transition(GamePhase.Reset);
          this.events.emit('round:reset', undefined);
        }
        break;

      case GamePhase.Reconnect:
      case GamePhase.Recovery:
        // Owned by the socket layer; the local director idles.
        break;
    }
  }

  private openBetting(): void {
    this.state.transition(GamePhase.Betting);
    this.events.emit('round:betting', { durationSeconds: this.config.bettingSeconds });
  }

  private beginTakeoff(): void {
    this.roundCounter++;
    this.roundId = `local-${this.roundCounter}`;
    this.crashPoint = this.sampleCrash();
    this.runElapsed = 0;
    this.currentMultiplier = 1;
    this.state.transition(GamePhase.Takeoff);
    this.events.emit('round:takeoff', { roundId: this.roundId });
  }

  destroy(): void {
    this.destroyed = true;
    this.unsubscribeState();
  }
}
