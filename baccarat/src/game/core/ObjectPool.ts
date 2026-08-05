import { Logger } from "../utils/Logger";

export interface Poolable {
  /** Called when the object leaves the pool. */
  onAcquire?(): void;
  /** Called when the object returns to the pool — reset all mutable state here. */
  onRelease?(): void;
  /** Called when the pool itself is torn down. */
  destroy?(): void;
}

export interface PoolOptions {
  readonly initial?: number;
  /** Hard ceiling on retained instances; extras are destroyed on release. */
  readonly max?: number;
  readonly name?: string;
}

/**
 * Generic factory-backed pool.
 *
 * Cards, chips and particles are created once at boot and recycled forever, so
 * a running round allocates nothing — that is the single biggest contributor to
 * a stable 60 FPS, because it keeps the GC away from the ticker.
 */
export class ObjectPool<T extends Poolable> {
  private readonly available: T[] = [];
  private readonly inUse = new Set<T>();
  private readonly factory: () => T;
  private readonly max: number;
  private readonly log: Logger;

  constructor(factory: () => T, options: PoolOptions = {}) {
    this.factory = factory;
    this.max = options.max ?? 256;
    this.log = Logger.create(`pool:${options.name ?? "anon"}`);
    this.prewarm(options.initial ?? 0);
  }

  prewarm(count: number): void {
    for (let i = this.available.length; i < count; i++) {
      this.available.push(this.factory());
    }
  }

  acquire(): T {
    const item = this.available.pop() ?? this.factory();
    this.inUse.add(item);
    item.onAcquire?.();
    return item;
  }

  release(item: T): void {
    if (!this.inUse.delete(item)) return; // double release — ignore
    item.onRelease?.();
    if (this.available.length >= this.max) {
      this.log.debug("pool at capacity, destroying instance");
      item.destroy?.();
      return;
    }
    this.available.push(item);
  }

  releaseAll(): void {
    for (const item of Array.from(this.inUse)) this.release(item);
  }

  /** Visits every instance, pooled or in use. */
  forEach(visitor: (item: T) => void): void {
    for (const item of this.available) visitor(item);
    for (const item of this.inUse) visitor(item);
  }

  get size(): number {
    return this.available.length + this.inUse.size;
  }

  get activeCount(): number {
    return this.inUse.size;
  }

  destroy(): void {
    this.releaseAll();
    for (const item of this.available) item.destroy?.();
    this.available.length = 0;
    this.inUse.clear();
  }
}
