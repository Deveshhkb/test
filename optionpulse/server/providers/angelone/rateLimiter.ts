/**
 * Serial queue that enforces a minimum gap between calls.
 *
 * SmartAPI rate-limits per endpoint - the quote endpoint allows one request
 * per second - and exceeding it gets the session throttled rather than just
 * failing the one call. Queueing is therefore part of correctness, not an
 * optimisation.
 */
export class RateLimitedQueue {
  private chain: Promise<unknown> = Promise.resolve();
  private lastStartedAt = 0;

  constructor(private readonly minIntervalMs: number) {}

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.chain.then(async () => {
      const wait = this.minIntervalMs - (Date.now() - this.lastStartedAt);
      if (wait > 0) await delay(wait);
      this.lastStartedAt = Date.now();
      return task();
    });
    // Keep the chain alive even when a task rejects, so one failure does not
    // wedge every queued call behind it.
    this.chain = result.catch(() => undefined);
    return result;
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Per-endpoint queues, created on first use. */
export class RateLimiterRegistry {
  private readonly queues = new Map<string, RateLimitedQueue>();

  constructor(
    private readonly intervals: Record<string, number>,
    private readonly fallbackMs = 250,
  ) {}

  run<T>(key: string, task: () => Promise<T>): Promise<T> {
    let queue = this.queues.get(key);
    if (!queue) {
      queue = new RateLimitedQueue(this.intervals[key] ?? this.fallbackMs);
      this.queues.set(key, queue);
    }
    return queue.run(task);
  }
}
