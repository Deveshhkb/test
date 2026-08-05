import { Logger } from "../utils/Logger";

export interface StateChange<S extends string> {
  readonly from: S | null;
  readonly to: S;
  readonly at: number;
}

export interface StateHooks<S extends string> {
  onEnter?: (from: S | null) => void;
  onExit?: (to: S) => void;
}

export interface StateMachineOptions<S extends string> {
  readonly initial: S;
  /** Adjacency list of legal transitions. Anything not listed is rejected. */
  readonly transitions: Readonly<Record<S, readonly S[]>>;
  readonly name?: string;
  /** Log and ignore illegal transitions instead of throwing. Default true. */
  readonly tolerant?: boolean;
}

/**
 * A strict finite state machine.
 *
 * The round lifecycle is the one place where an out-of-order message (a late
 * `ROUND_RESULT` arriving after a reconnect, say) can corrupt the table, so
 * illegal transitions are refused here rather than defended against in every
 * consumer.
 */
export class StateMachine<S extends string> {
  private current: S;
  private previous: S | null = null;
  private readonly transitions: Readonly<Record<S, readonly S[]>>;
  private readonly hooks = new Map<S, StateHooks<S>>();
  private readonly watchers: Array<(change: StateChange<S>) => void> = [];
  private readonly tolerant: boolean;
  private readonly log: Logger;
  private enteredAt = 0;

  constructor(options: StateMachineOptions<S>) {
    this.current = options.initial;
    this.transitions = options.transitions;
    this.tolerant = options.tolerant ?? true;
    this.log = Logger.create(`fsm:${options.name ?? "anon"}`);
    this.enteredAt = performance.now();
  }

  get state(): S {
    return this.current;
  }

  get prior(): S | null {
    return this.previous;
  }

  /** Milliseconds spent in the current state. */
  get elapsed(): number {
    return performance.now() - this.enteredAt;
  }

  is(...states: S[]): boolean {
    return states.includes(this.current);
  }

  can(next: S): boolean {
    return this.transitions[this.current]?.includes(next) ?? false;
  }

  register(state: S, hooks: StateHooks<S>): void {
    this.hooks.set(state, hooks);
  }

  onChange(watcher: (change: StateChange<S>) => void): () => void {
    this.watchers.push(watcher);
    return () => {
      const index = this.watchers.indexOf(watcher);
      if (index >= 0) this.watchers.splice(index, 1);
    };
  }

  /** Returns true when the transition was applied. */
  transitionTo(next: S): boolean {
    if (next === this.current) return false;

    if (!this.can(next)) {
      const message = `illegal transition ${this.current} -> ${next}`;
      if (!this.tolerant) throw new Error(message);
      this.log.warn(message);
      return false;
    }

    const from = this.current;
    this.hooks.get(from)?.onExit?.(next);

    this.previous = from;
    this.current = next;
    this.enteredAt = performance.now();

    this.hooks.get(next)?.onEnter?.(from);

    const change: StateChange<S> = { from, to: next, at: this.enteredAt };
    for (const watcher of this.watchers.slice()) watcher(change);
    this.log.debug(`${from} -> ${next}`);
    return true;
  }

  /** Bypasses the transition table. Only for teardown / hard resync. */
  forceTo(next: S): void {
    const from = this.current;
    this.previous = from;
    this.current = next;
    this.enteredAt = performance.now();
    const change: StateChange<S> = { from, to: next, at: this.enteredAt };
    for (const watcher of this.watchers.slice()) watcher(change);
    this.log.warn(`forced ${from} -> ${next}`);
  }

  destroy(): void {
    this.hooks.clear();
    this.watchers.length = 0;
  }
}
