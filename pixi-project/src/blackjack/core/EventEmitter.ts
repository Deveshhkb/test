type Listener<T> = (payload: T) => void;

/**
 * Minimal typed event emitter used to keep the game layer decoupled from the
 * view layer. Listeners are stored per event name and can be removed either
 * individually or in bulk when a system is destroyed.
 */
export class EventEmitter<Events extends Record<keyof Events, unknown>> {
  private readonly listeners = new Map<keyof Events, Set<Listener<never>>>();

  on<K extends keyof Events>(
    event: K,
    listener: Listener<Events[K]>,
  ): () => void {
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(event, bucket);
    }
    bucket.add(listener as Listener<never>);
    return () => this.off(event, listener);
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    this.listeners.get(event)?.delete(listener as Listener<never>);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    // Copy so a listener may unsubscribe while the event is being dispatched.
    for (const listener of [...bucket]) {
      (listener as Listener<Events[K]>)(payload);
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
