/** Minimal typed event emitter bridging the game controller, Pixi scenes
 *  and React UI without circular imports. */

export interface GameEvents {
  spinRequested: void;
  reelsStopped: void;
  skipRequested: void;
  bonusPick: number;
  shake: number;
}

type Handler<T> = (payload: T) => void;

class EventBus {
  private handlers = new Map<keyof GameEvents, Set<Handler<never>>>();

  on<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => set.delete(handler as Handler<never>);
  }

  emit<K extends keyof GameEvents>(
    event: K,
    ...payload: GameEvents[K] extends void ? [] : [GameEvents[K]]
  ): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of [...set]) {
      (handler as Handler<GameEvents[K]>)(payload[0] as GameEvents[K]);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();
