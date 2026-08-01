/**
 * Generic object pool.
 *
 * Particles, floating labels and debris are spawned hundreds of times per
 * second; allocating them fresh would churn the GC and stutter low-end
 * devices. The pool recycles instances instead: `acquire()` reuses a freed
 * object when one exists, `release()` resets and stores it.
 */
export interface Poolable {
  /** Return the object to a clean state before reuse. */
  reset(): void;
}

export class ObjectPool<T extends Poolable> {
  private readonly free: T[] = [];
  private readonly factory: () => T;
  private readonly maxSize: number;
  private created = 0;

  constructor(factory: () => T, options?: { preallocate?: number; maxSize?: number }) {
    this.factory = factory;
    this.maxSize = options?.maxSize ?? 512;
    const preallocate = options?.preallocate ?? 0;
    for (let i = 0; i < preallocate; i++) {
      this.free.push(this.createNew());
    }
  }

  get size(): number {
    return this.created;
  }

  get available(): number {
    return this.free.length;
  }

  acquire(): T {
    return this.free.pop() ?? this.createNew();
  }

  release(item: T): void {
    item.reset();
    // Beyond maxSize we let the object be garbage collected — an unbounded
    // pool after a particle storm is just a memory leak with extra steps.
    if (this.free.length < this.maxSize) {
      this.free.push(item);
    } else {
      this.created--;
    }
  }

  /** Drop every pooled instance (engine teardown). */
  drain(onDispose?: (item: T) => void): void {
    if (onDispose) {
      for (const item of this.free) onDispose(item);
    }
    this.created -= this.free.length;
    this.free.length = 0;
  }

  private createNew(): T {
    this.created++;
    return this.factory();
  }
}
