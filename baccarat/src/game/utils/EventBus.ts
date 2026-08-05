import type { Unsubscribe } from "../types";

/** Any interface describing `eventName -> payload`. */
export type EventMap = object;
export type Handler<T> = (payload: T) => void;

interface Subscription<T> {
  handler: Handler<T>;
  once: boolean;
}

/**
 * Fully typed pub/sub bus. Every cross-module message in the engine travels
 * through one of these, which is what keeps managers from importing each other.
 *
 * Dispatch iterates a copy of the listener list so a handler may unsubscribe
 * (or subscribe) during emission without corrupting the walk.
 */
export class EventBus<E extends EventMap> {
  private readonly listeners = new Map<keyof E, Array<Subscription<unknown>>>();
  private muted = false;

  on<K extends keyof E>(event: K, handler: Handler<E[K]>): Unsubscribe {
    return this.add(event, handler as Handler<unknown>, false);
  }

  once<K extends keyof E>(event: K, handler: Handler<E[K]>): Unsubscribe {
    return this.add(event, handler as Handler<unknown>, true);
  }

  private add<K extends keyof E>(event: K, handler: Handler<unknown>, once: boolean): Unsubscribe {
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = [];
      this.listeners.set(event, bucket);
    }
    const sub: Subscription<unknown> = { handler, once };
    bucket.push(sub);
    return () => this.remove(event, sub);
  }

  private remove<K extends keyof E>(event: K, sub: Subscription<unknown>): void {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    const index = bucket.indexOf(sub);
    if (index >= 0) bucket.splice(index, 1);
    if (bucket.length === 0) this.listeners.delete(event);
  }

  off<K extends keyof E>(event: K, handler: Handler<E[K]>): void {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    for (let i = bucket.length - 1; i >= 0; i--) {
      if (bucket[i]!.handler === (handler as Handler<unknown>)) bucket.splice(i, 1);
    }
    if (bucket.length === 0) this.listeners.delete(event);
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    if (this.muted) return;
    const bucket = this.listeners.get(event);
    if (!bucket || bucket.length === 0) return;
    // Snapshot: handlers are allowed to mutate the subscription list.
    const snapshot = bucket.slice();
    for (const sub of snapshot) {
      if (sub.once) this.remove(event, sub);
      sub.handler(payload);
    }
  }

  /** Waits for the next occurrence of an event. Useful in async sequences. */
  waitFor<K extends keyof E>(event: K): Promise<E[K]> {
    return new Promise((resolve) => {
      this.once(event, resolve);
    });
  }

  listenerCount<K extends keyof E>(event: K): number {
    return this.listeners.get(event)?.length ?? 0;
  }

  /** Suppresses emission — used while tearing the game down. */
  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  clear(): void {
    this.listeners.clear();
  }
}
