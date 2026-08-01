/**
 * Generic finite state machine with an explicit transition table.
 *
 * Illegal transitions are rejected loudly instead of silently corrupting
 * game flow — in a gambling game, "the UI thought we were betting while the
 * round was running" is a money bug, so transitions are a whitelist.
 */
export interface StateTransition<S extends string> {
  from: S;
  to: S;
}

export interface StateChangeEvent<S extends string> {
  from: S;
  to: S;
}

type TransitionTable<S extends string> = Readonly<Record<S, readonly S[]>>;

export class StateMachine<S extends string> {
  private currentState: S;
  private readonly transitions: TransitionTable<S>;
  private readonly changeListeners = new Set<(event: StateChangeEvent<S>) => void>();

  constructor(initial: S, transitions: TransitionTable<S>) {
    this.currentState = initial;
    this.transitions = transitions;
  }

  get current(): S {
    return this.currentState;
  }

  canTransition(to: S): boolean {
    return this.transitions[this.currentState].includes(to);
  }

  /**
   * Attempt a transition. Returns `true` when the state changed.
   * An illegal transition never throws mid-frame (that would take down the
   * render loop); it reports and leaves the machine untouched.
   */
  transition(to: S): boolean {
    if (to === this.currentState) return false;
    if (!this.canTransition(to)) {
      console.warn(`[StateMachine] illegal transition ${this.currentState} → ${to}`);
      return false;
    }
    const from = this.currentState;
    this.currentState = to;
    for (const listener of [...this.changeListeners]) {
      listener({ from, to });
    }
    return true;
  }

  /** Force a state without validation — reserved for reconnect recovery. */
  forceState(to: S): void {
    if (to === this.currentState) return;
    const from = this.currentState;
    this.currentState = to;
    for (const listener of [...this.changeListeners]) {
      listener({ from, to });
    }
  }

  onChange(listener: (event: StateChangeEvent<S>) => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  destroy(): void {
    this.changeListeners.clear();
  }
}
