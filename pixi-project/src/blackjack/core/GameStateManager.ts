import { EventEmitter } from "./EventEmitter";

export enum GameState {
  BOOTING = "BOOTING",
  BETTING = "BETTING",
  DEALING = "DEALING",
  PLAYER_TURN = "PLAYER_TURN",
  DEALER_TURN = "DEALER_TURN",
  RESULT = "RESULT",
  ROUND_END = "ROUND_END",
}

export enum GameAction {
  SELECT_CHIP = "SELECT_CHIP",
  PLACE_BET = "PLACE_BET",
  REMOVE_BET = "REMOVE_BET",
  CLEAR_BET = "CLEAR_BET",
  REPEAT_BET = "REPEAT_BET",
  DEAL = "DEAL",
  HIT = "HIT",
  STAND = "STAND",
  DOUBLE = "DOUBLE",
  NEW_ROUND = "NEW_ROUND",
}

/** Which transitions are legal. Anything not listed here is rejected. */
const TRANSITIONS: Readonly<Record<GameState, readonly GameState[]>> = {
  [GameState.BOOTING]: [GameState.BETTING],
  [GameState.BETTING]: [GameState.DEALING],
  [GameState.DEALING]: [
    GameState.PLAYER_TURN,
    GameState.DEALER_TURN,
    GameState.RESULT,
  ],
  [GameState.PLAYER_TURN]: [GameState.DEALER_TURN, GameState.RESULT],
  [GameState.DEALER_TURN]: [GameState.RESULT],
  [GameState.RESULT]: [GameState.ROUND_END],
  [GameState.ROUND_END]: [GameState.BETTING],
};

/** Which player-facing actions each state accepts. */
const ALLOWED_ACTIONS: Readonly<Record<GameState, readonly GameAction[]>> = {
  [GameState.BOOTING]: [],
  [GameState.BETTING]: [
    GameAction.SELECT_CHIP,
    GameAction.PLACE_BET,
    GameAction.REMOVE_BET,
    GameAction.CLEAR_BET,
    GameAction.REPEAT_BET,
    GameAction.DEAL,
  ],
  [GameState.DEALING]: [],
  [GameState.PLAYER_TURN]: [
    GameAction.HIT,
    GameAction.STAND,
    GameAction.DOUBLE,
  ],
  [GameState.DEALER_TURN]: [],
  [GameState.RESULT]: [],
  [GameState.ROUND_END]: [
    GameAction.SELECT_CHIP,
    GameAction.PLACE_BET,
    GameAction.REMOVE_BET,
    GameAction.CLEAR_BET,
    GameAction.REPEAT_BET,
    GameAction.NEW_ROUND,
  ],
};

interface StateEvents {
  change: { from: GameState; to: GameState };
  /** Fired whenever the state or the animation lock changes. */
  interactivity: { state: GameState; busy: boolean };
}

/**
 * Single source of truth for "what is the game allowed to do right now".
 *
 * The manager owns two orthogonal concepts:
 *  - the logical state (BETTING, PLAYER_TURN, ...)
 *  - a busy lock held while animations run, which suppresses every action
 *
 * UI handlers never check state by hand; they call {@link canPerform}.
 */
export class GameStateManager extends EventEmitter<StateEvents> {
  private state: GameState = GameState.BOOTING;
  private busyCount = 0;

  get current(): GameState {
    return this.state;
  }

  get busy(): boolean {
    return this.busyCount > 0;
  }

  is(...states: GameState[]): boolean {
    return states.includes(this.state);
  }

  canTransitionTo(next: GameState): boolean {
    return TRANSITIONS[this.state].includes(next);
  }

  /**
   * Moves to the next state. Illegal transitions are ignored (and reported)
   * instead of throwing, so a stray callback can never break a live round.
   */
  transitionTo(next: GameState): boolean {
    if (next === this.state) return false;
    if (!this.canTransitionTo(next)) {
      console.warn(`[state] illegal transition ${this.state} -> ${next}`);
      return false;
    }
    const from = this.state;
    this.state = next;
    this.emit("change", { from, to: next });
    this.emitInteractivity();
    return true;
  }

  canPerform(action: GameAction): boolean {
    if (this.busy) return false;
    return ALLOWED_ACTIONS[this.state].includes(action);
  }

  /** Locks input for the duration of an animation. Calls may nest. */
  lock(): void {
    this.busyCount += 1;
    if (this.busyCount === 1) this.emitInteractivity();
  }

  unlock(): void {
    if (this.busyCount === 0) return;
    this.busyCount -= 1;
    if (this.busyCount === 0) this.emitInteractivity();
  }

  /** Runs an async block with input locked, releasing the lock on failure too. */
  async withLock<T>(work: () => Promise<T>): Promise<T> {
    this.lock();
    try {
      return await work();
    } finally {
      this.unlock();
    }
  }

  private emitInteractivity(): void {
    this.emit("interactivity", { state: this.state, busy: this.busy });
  }
}
