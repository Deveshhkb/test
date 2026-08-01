/**
 * Minimal, fully-typed publish/subscribe bus.
 *
 * Every engine subsystem (scenes, managers, React bridge) communicates
 * through events instead of holding direct references to each other — this
 * is what keeps the engine free of god objects. The event map is a plain
 * interface, so a typo in an event name or a wrong payload shape is a
 * compile error, not a runtime bug.
 */
export type EventMap = Record<string, unknown>;

export type EventListener<T> = (payload: T) => void;

export class EventBus<E extends EventMap> {
  private readonly listeners = new Map<keyof E, Set<EventListener<never>>>();

  on<K extends keyof E>(event: K, listener: EventListener<E[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as EventListener<never>);
    return () => this.off(event, listener);
  }

  once<K extends keyof E>(event: K, listener: EventListener<E[K]>): () => void {
    const wrapper: EventListener<E[K]> = (payload) => {
      this.off(event, wrapper);
      listener(payload);
    };
    return this.on(event, wrapper);
  }

  off<K extends keyof E>(event: K, listener: EventListener<E[K]>): void {
    this.listeners.get(event)?.delete(listener as EventListener<never>);
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    // Copy before iterating so listeners may unsubscribe themselves safely.
    for (const listener of [...set]) {
      (listener as EventListener<E[K]>)(payload);
    }
  }

  /** Remove every listener. Called on engine teardown to prevent leaks. */
  clear(): void {
    this.listeners.clear();
  }
}
