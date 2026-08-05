import { GameEvent, GameEventPayloads } from '../Types';

type Handler<E extends GameEvent> = (payload: GameEventPayloads[E]) => void;

interface Subscription {
  handler: (payload: never) => void;
  once: boolean;
  /** Optional owner used for bulk `offAll(owner)` teardown. */
  owner?: object;
}

/**
 * Typed publish/subscribe bus - the only channel modules use to talk to each
 * other.
 *
 * Design notes:
 * - Handlers are copied before dispatch so a handler may safely unsubscribe (or
 *   subscribe) during emission without corrupting the iteration.
 * - A throwing handler is logged and skipped; one broken listener must never
 *   take down a round in progress.
 * - `owner` tagging lets a view drop every one of its subscriptions in a single
 *   call from `destroy()`, which is what keeps mount/unmount cycles leak-free.
 */
export class EventBus {
  private readonly listeners = new Map<GameEvent, Subscription[]>();
  private onError?: (event: GameEvent, error: unknown) => void;

  /** Install a sink for handler exceptions (wired to the Logger by Game). */
  public setErrorHandler(handler: (event: GameEvent, error: unknown) => void): void {
    this.onError = handler;
  }

  public on<E extends GameEvent>(event: E, handler: Handler<E>, owner?: object): () => void {
    return this.add(event, handler, false, owner);
  }

  public once<E extends GameEvent>(event: E, handler: Handler<E>, owner?: object): () => void {
    return this.add(event, handler, true, owner);
  }

  public off<E extends GameEvent>(event: E, handler: Handler<E>): void {
    const subs = this.listeners.get(event);
    if (!subs) return;
    const index = subs.findIndex((s) => s.handler === handler);
    if (index !== -1) subs.splice(index, 1);
    if (subs.length === 0) this.listeners.delete(event);
  }

  /** Remove every subscription registered with the given owner. */
  public offAll(owner: object): void {
    for (const [event, subs] of this.listeners) {
      const remaining = subs.filter((s) => s.owner !== owner);
      if (remaining.length === 0) this.listeners.delete(event);
      else this.listeners.set(event, remaining);
    }
  }

  public emit<E extends GameEvent>(
    event: E,
    ...args: GameEventPayloads[E] extends void ? [] : [GameEventPayloads[E]]
  ): void {
    const subs = this.listeners.get(event);
    if (!subs || subs.length === 0) return;

    const payload = args[0] as never;
    // Snapshot: handlers are allowed to mutate the subscription list.
    const snapshot = subs.slice();

    for (const sub of snapshot) {
      if (sub.once) {
        const index = subs.indexOf(sub);
        if (index !== -1) subs.splice(index, 1);
      }
      try {
        sub.handler(payload);
      } catch (error) {
        this.onError?.(event, error);
      }
    }

    if (subs.length === 0) this.listeners.delete(event);
  }

  /** Await the next occurrence of an event. Useful in sequenced flows. */
  public waitFor<E extends GameEvent>(event: E): Promise<GameEventPayloads[E]> {
    return new Promise((resolve) => {
      this.once(event, (payload) => resolve(payload));
    });
  }

  public listenerCount(event: GameEvent): number {
    return this.listeners.get(event)?.length ?? 0;
  }

  public clear(): void {
    this.listeners.clear();
  }

  private add<E extends GameEvent>(
    event: E,
    handler: Handler<E>,
    once: boolean,
    owner?: object,
  ): () => void {
    const subs = this.listeners.get(event) ?? [];
    subs.push({ handler: handler as (payload: never) => void, once, owner });
    this.listeners.set(event, subs);
    return () => this.off(event, handler);
  }
}
