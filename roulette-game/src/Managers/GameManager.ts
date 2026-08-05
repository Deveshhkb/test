import {
  GameConfig,
  GameEvent,
  GameState,
  HistoryEntry,
  RoundMode,
  RoundResult,
  RouletteNumber,
} from '../Types';
import { BetManager } from './BetManager';
import { HistoryManager } from './HistoryManager';
import { WheelManager } from './WheelManager';
import { EventBus } from '../Utilities/EventBus';
import { Logger } from '../Utilities/Logger';
import { getNumberColor } from '../Game/Constants';
import { createRandom, randomInt } from '../Utilities/Math';
import { uniqueId } from '../Utilities/Helpers';

/**
 * Injected by the scene so the state machine can trigger presentation without
 * knowing anything about Pixi.
 */
export interface PresentationDrivers {
  /** Run the wheel/ball animation; resolves when the ball is seated. */
  spin: (winningNumber: RouletteNumber, roundId: string) => Promise<void>;
  /** Run the payout animation; resolves when chips have finished moving. */
  payout: (result: RoundResult) => Promise<void>;
  /** Clear the felt and the result furniture. */
  cleanup: () => Promise<void>;
}

/**
 * The round state machine.
 *
 * ## Two modes, one code path
 *
 * With `network.serverDriven === false` this class *drives* rounds: it opens
 * betting, runs the countdown, picks a number from a seeded RNG and advances
 * itself. With `serverDriven === true` it *follows*: the host emits
 * `BET_OPEN`, `BET_CLOSED`, `SPIN_START` and friends from a socket, and the
 * same handlers run.
 *
 * The important consequence is that the presentation layer cannot tell the
 * difference. Nothing downstream of this class knows or cares where a round
 * came from, which is what makes the backend integration a wiring exercise
 * rather than a rewrite. See docs/BACKEND.md.
 *
 * ## Transition safety
 *
 * Every transition is checked against {@link ALLOWED_TRANSITIONS}. An illegal
 * transition - a duplicated socket frame, a late `SPIN_START` after a
 * disconnect - is logged and dropped rather than applied. A malformed server
 * message can therefore never wedge the client in an impossible state.
 */
export class GameManager {
  private readonly log = Logger.create('GameManager');

  private state = GameState.BOOT;
  private roundId = '';
  private winningNumber: RouletteNumber = 0;
  private drivers?: PresentationDrivers;

  /* Countdown */
  private timerRemaining = 0;
  private timerTotal = 0;
  private timerRunning = false;
  private lastEmittedSecond = -1;
  private lastCallFired = false;

  private random: () => number;
  /** Guards against two round loops running after a rapid reset. */
  private roundToken = 0;
  private destroyed = false;

  public constructor(
    private config: GameConfig,
    private readonly bets: BetManager,
    private readonly history: HistoryManager,
    private readonly wheel: WheelManager,
    private readonly bus: EventBus,
  ) {
    this.random = createRandom(config.network.seed ?? Date.now());
    this.subscribeToHostEvents();
  }

  /** Wire the presentation callbacks. Must be called before the first round. */
  public setDrivers(drivers: PresentationDrivers): void {
    this.drivers = drivers;
  }

  public updateConfig(config: GameConfig): void {
    this.config = config;
  }

  /* --------------------------------------------------------------------- */
  /* State                                                                 */
  /* --------------------------------------------------------------------- */

  public getState(): GameState {
    return this.state;
  }

  public getRoundId(): string {
    return this.roundId;
  }

  public getWinningNumber(): RouletteNumber {
    return this.winningNumber;
  }

  /**
   * Attempt a transition. Returns false (and changes nothing) if the move is
   * not legal from the current state.
   */
  public transition(to: GameState): boolean {
    if (this.destroyed) return false;
    if (this.state === to) return true;

    const allowed = ALLOWED_TRANSITIONS[this.state];
    if (!allowed.includes(to)) {
      this.log.warn(`illegal transition ${this.state} -> ${to} (ignored)`);
      return false;
    }

    const from = this.state;
    this.state = to;
    this.log.debug(`${from} -> ${to}`);
    this.bus.emit(GameEvent.STATE_CHANGE, { from, to });
    return true;
  }

  /* --------------------------------------------------------------------- */
  /* Per-frame                                                             */
  /* --------------------------------------------------------------------- */

  /** Advance the countdown. Called once per frame from the game ticker. */
  public update(deltaSeconds: number): void {
    if (!this.timerRunning) return;

    this.timerRemaining = Math.max(0, this.timerRemaining - deltaSeconds);

    // Whole-second granularity for events; the ring reads the raw value.
    const second = Math.ceil(this.timerRemaining);
    if (second !== this.lastEmittedSecond) {
      this.lastEmittedSecond = second;
      this.bus.emit(GameEvent.SYNC_TIMER, {
        remaining: this.timerRemaining,
        total: this.timerTotal,
      });
    }

    if (
      !this.lastCallFired &&
      this.timerRemaining <= this.config.timing.lastCallThreshold &&
      this.state === GameState.BETTING_OPEN
    ) {
      this.lastCallFired = true;
      this.bus.emit(GameEvent.LAST_CALL, { remaining: this.timerRemaining });
      this.transition(GameState.LAST_CALL);
    }

    if (this.timerRemaining <= 0) {
      this.timerRunning = false;
      // Only the local driver closes betting on the timer; a server-driven
      // deployment waits for the authoritative BET_CLOSED frame, because the
      // client clock is not allowed to decide when a wager stops counting.
      if (!this.config.network.serverDriven) this.closeBetting();
    }
  }

  public getTimerRemaining(): number {
    return this.timerRemaining;
  }

  public getTimerTotal(): number {
    return this.timerTotal;
  }

  /* --------------------------------------------------------------------- */
  /* Local round loop                                                      */
  /* --------------------------------------------------------------------- */

  /**
   * Walk the machine through the states that have already happened by the time
   * the table exists.
   *
   * The engine boots and loads before `RouletteScene` - and therefore before
   * this manager - is constructed, so BOOT and LOADING are complete facts, not
   * pending work. Replaying them here keeps the published state sequence
   * faithful for any listener (a host analytics hook, the HUD, a QA harness)
   * rather than having the game appear to spring into existence at WAITING.
   */
  public bootstrap(): void {
    this.transition(GameState.LOADING);
    this.transition(GameState.WAITING);
  }

  /** Enter the idle state and, when locally driven, start rounds. */
  public start(): void {
    if (this.state === GameState.BOOT) this.bootstrap();
    this.transition(GameState.WAITING);
    if (!this.config.network.serverDriven) void this.runLocalRound();
  }

  /**
   * One complete locally-driven round.
   *
   * Written as a linear async function on purpose: the round *is* a sequence,
   * and expressing it as one makes the ordering guarantees obvious. Every await
   * point re-checks the round token so a `reset()` mid-round abandons the loop
   * instead of resuming into a stale state.
   */
  private async runLocalRound(): Promise<void> {
    const token = ++this.roundToken;
    const alive = (): boolean => token === this.roundToken && !this.destroyed;

    this.roundId = uniqueId('round');
    this.bus.emit(GameEvent.ROUND_START, { roundId: this.roundId });

    this.openBetting(this.config.timing.bettingDuration);

    // Wait out the countdown; `update()` closes betting when it expires.
    await this.waitForState(GameState.BETTING_CLOSED, token);
    if (!alive()) return;

    await this.wait(this.config.timing.preSpinDelay);
    if (!alive()) return;

    // Locally drawn outcome. In a live deployment this comes from the server.
    this.spinTo(this.drawNumber());
    await this.waitForState(GameState.RESET, token);
    if (!alive()) return;

    void this.runLocalRound();
  }

  private drawNumber(): RouletteNumber {
    const pockets = this.wheel.getPockets();
    return pockets[randomInt(this.random, 0, pockets.length - 1)].value;
  }

  /* --------------------------------------------------------------------- */
  /* Round phases - shared by both modes                                   */
  /* --------------------------------------------------------------------- */

  /**
   * Open the felt.
   *
   * In MANUAL mode no countdown runs: the round waits on the player pressing
   * SPIN, so there is nothing for a timer to count down to and showing one
   * would be a lie about when betting closes.
   */
  public openBetting(duration: number): void {
    if (!this.transition(GameState.BETTING_OPEN)) return;

    const timed = this.config.timing.mode === RoundMode.AUTO;
    this.timerTotal = timed ? duration : 0;
    this.timerRemaining = timed ? duration : 0;
    this.timerRunning = timed;
    this.lastEmittedSecond = -1;
    this.lastCallFired = false;

    this.bets.openBetting();
    this.bus.emit(GameEvent.BET_OPEN, { roundId: this.roundId, duration: this.timerTotal });
    if (timed) {
      this.bus.emit(GameEvent.SYNC_TIMER, { remaining: duration, total: duration });
    }
  }

  /**
   * Player-initiated spin.
   *
   * The whole of the rest of the round is identical to the timed path - this
   * only supplies the trigger that a countdown would otherwise supply, which is
   * why MANUAL and AUTO share every downstream line of code.
   */
  public requestSpin(): boolean {
    if (this.state !== GameState.BETTING_OPEN && this.state !== GameState.LAST_CALL) return false;
    if (!this.bets.hasBets()) return false;

    this.closeBetting();
    return true;
  }

  public closeBetting(): void {
    this.timerRunning = false;
    this.timerRemaining = 0;
    this.bets.closeBetting();

    if (!this.transition(GameState.BETTING_CLOSED)) return;
    this.bus.emit(GameEvent.BET_CLOSED, { roundId: this.roundId });
  }

  /**
   * Run the spin and everything that follows it.
   *
   * Public because a server-driven host calls it directly from its
   * `SPIN_START` frame.
   */
  public spinTo(winningNumber: RouletteNumber): void {
    void this.runSpinSequence(winningNumber);
  }

  private async runSpinSequence(winningNumber: RouletteNumber): Promise<void> {
    const token = this.roundToken;
    const alive = (): boolean => token === this.roundToken && !this.destroyed;

    this.winningNumber = winningNumber;

    // A late server frame can arrive while betting is still nominally open.
    if (this.state !== GameState.BETTING_CLOSED) this.closeBetting();
    if (!this.transition(GameState.SPINNING)) return;

    this.bus.emit(GameEvent.SPIN_START, { roundId: this.roundId, winningNumber });

    if (!this.drivers) {
      this.log.error('no presentation drivers registered - cannot spin');
      return;
    }

    this.transition(GameState.BALL_ROLLING);
    await this.drivers.spin(winningNumber, this.roundId);
    if (!alive()) return;

    /* ----- Result known ----- */
    this.transition(GameState.WINNER_DETECTED);
    this.bus.emit(GameEvent.WIN_NUMBER, {
      roundId: this.roundId,
      number: winningNumber,
      color: getNumberColor(winningNumber),
    });

    const entry = this.history.push(winningNumber, this.roundId);
    await this.wait(this.config.timing.winnerHoldDuration);
    if (!alive()) return;

    /* ----- Payout ----- */
    this.transition(GameState.PAYOUT);
    const result = this.buildResult(entry);
    this.bets.settle(result.resolutions);
    this.bus.emit(GameEvent.PAYOUT, result);

    await this.drivers.payout(result);
    if (!alive()) return;

    /* ----- Result hold ----- */
    this.transition(GameState.RESULT);
    await this.wait(this.config.timing.resultDuration);
    if (!alive()) return;

    /* ----- Teardown ----- */
    this.transition(GameState.RESET);
    this.bets.clearAfterRound();
    await this.drivers.cleanup();
    if (!alive()) return;

    this.bus.emit(GameEvent.ROUND_END, { roundId: this.roundId });
  }

  private buildResult(entry: HistoryEntry): RoundResult {
    const resolutions = this.bets.resolve(entry.number);
    return {
      roundId: this.roundId,
      winningNumber: entry.number,
      color: entry.color,
      totalStaked: resolutions.reduce((sum, resolution) => sum + resolution.staked, 0),
      totalPayout: resolutions.reduce((sum, resolution) => sum + resolution.payout, 0),
      resolutions,
    };
  }

  /* --------------------------------------------------------------------- */
  /* Server-driven entry points                                            */
  /* --------------------------------------------------------------------- */

  /**
   * Subscribe to the events a host application emits.
   *
   * These are the *same* event names the engine emits internally, so a host
   * can forward socket frames straight onto the bus with no translation layer.
   */
  private subscribeToHostEvents(): void {
    this.bus.on(
      GameEvent.SYNC_TIMER,
      (payload) => {
        // Only accept an external correction when the server owns the clock.
        if (!this.config.network.serverDriven) return;
        this.timerRemaining = payload.remaining;
        this.timerTotal = payload.total;
        this.timerRunning = payload.remaining > 0;
      },
      this,
    );

    this.bus.on(
      GameEvent.SYNC_HISTORY,
      (payload) => this.history.sync(payload.entries),
      this,
    );

    this.bus.on(
      GameEvent.SYNC_BALANCE,
      (payload) => this.bets.setBalance(payload.balance),
      this,
    );
  }

  /** Begin a server-announced round. */
  public beginRound(roundId: string): void {
    this.roundId = roundId;
    this.roundToken += 1;
    this.bus.emit(GameEvent.ROUND_START, { roundId });
    this.transition(GameState.WAITING);
  }

  /* --------------------------------------------------------------------- */
  /* Lifecycle                                                             */
  /* --------------------------------------------------------------------- */

  /** Abandon the current round and return to idle. */
  public reset(): void {
    this.roundToken += 1;
    this.timerRunning = false;
    this.timerRemaining = 0;
    this.lastCallFired = false;

    // Forced, not negotiated: `reset()` must succeed from any state, including
    // mid-spin, so it bypasses the transition table by design.
    const from = this.state;
    this.state = GameState.WAITING;
    if (from !== GameState.WAITING) {
      this.bus.emit(GameEvent.STATE_CHANGE, { from, to: GameState.WAITING });
    }
  }

  /** Reset and, when locally driven, immediately begin a fresh round. */
  public restart(): void {
    this.reset();
    if (!this.config.network.serverDriven) void this.runLocalRound();
  }

  public destroy(): void {
    this.destroyed = true;
    this.roundToken += 1;
    this.timerRunning = false;
    this.bus.offAll(this);
    for (const cancel of this.pendingWaits) cancel();
    this.pendingWaits.clear();
  }

  /* --------------------------------------------------------------------- */
  /* Async helpers                                                         */
  /* --------------------------------------------------------------------- */

  /** Cancellers for in-flight waits, so `destroy()` never leaves a timer armed. */
  private readonly pendingWaits = new Set<() => void>();

  private wait(seconds: number): Promise<void> {
    return new Promise((resolve) => {
      const timeout = window.setTimeout(() => {
        this.pendingWaits.delete(cancel);
        resolve();
      }, seconds * 1000);

      const cancel = (): void => {
        window.clearTimeout(timeout);
        resolve();
      };
      this.pendingWaits.add(cancel);
    });
  }

  /**
   * Resolve once the machine reaches a state - or immediately if it is already
   * there. Also resolves if the round token moves on, so an abandoned round
   * cannot leave an await hanging forever.
   */
  private waitForState(target: GameState, token: number): Promise<void> {
    if (this.state === target) return Promise.resolve();

    return new Promise((resolve) => {
      const off = this.bus.on(GameEvent.STATE_CHANGE, (payload) => {
        if (payload.to === target || token !== this.roundToken) {
          off();
          this.pendingWaits.delete(cancel);
          resolve();
        }
      });

      const cancel = (): void => {
        off();
        resolve();
      };
      this.pendingWaits.add(cancel);
    });
  }
}

/**
 * Legal state transitions.
 *
 * Kept as data rather than scattered `if` statements so the whole machine is
 * auditable at a glance - and so docs/STATE_MACHINE.md can be checked against
 * it by eye.
 */
const ALLOWED_TRANSITIONS: Readonly<Record<GameState, readonly GameState[]>> = {
  [GameState.BOOT]: [GameState.LOADING],
  [GameState.LOADING]: [GameState.WAITING],
  [GameState.WAITING]: [GameState.BETTING_OPEN, GameState.RESET],
  [GameState.BETTING_OPEN]: [GameState.LAST_CALL, GameState.BETTING_CLOSED, GameState.RESET],
  [GameState.LAST_CALL]: [GameState.BETTING_CLOSED, GameState.RESET],
  [GameState.BETTING_CLOSED]: [GameState.SPINNING, GameState.RESET],
  [GameState.SPINNING]: [GameState.BALL_ROLLING, GameState.RESET],
  [GameState.BALL_ROLLING]: [GameState.WINNER_DETECTED, GameState.RESET],
  [GameState.WINNER_DETECTED]: [GameState.PAYOUT, GameState.RESET],
  [GameState.PAYOUT]: [GameState.RESULT, GameState.RESET],
  [GameState.RESULT]: [GameState.RESET],
  [GameState.RESET]: [GameState.WAITING, GameState.BETTING_OPEN],
};
