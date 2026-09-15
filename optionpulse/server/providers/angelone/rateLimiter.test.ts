import { describe, expect, it } from "vitest";
import { RateLimitedQueue, RateLimiterRegistry } from "./rateLimiter";

describe("RateLimitedQueue", () => {
  it("runs tasks in submission order", async () => {
    const queue = new RateLimitedQueue(0);
    const order: number[] = [];
    await Promise.all([1, 2, 3].map((n) => queue.run(async () => void order.push(n))));
    expect(order).toEqual([1, 2, 3]);
  });

  it("leaves at least the minimum interval between task starts", async () => {
    const queue = new RateLimitedQueue(40);
    const starts: number[] = [];
    await Promise.all([0, 1, 2].map(() => queue.run(async () => void starts.push(Date.now()))));
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(35);
    expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(35);
  });

  it("keeps draining after a task rejects", async () => {
    const queue = new RateLimitedQueue(0);
    await expect(queue.run(async () => Promise.reject(new Error("boom")))).rejects.toThrow(
      "boom",
    );
    await expect(queue.run(async () => "recovered")).resolves.toBe("recovered");
  });

  it("propagates the task's resolved value", async () => {
    const queue = new RateLimitedQueue(0);
    await expect(queue.run(async () => 42)).resolves.toBe(42);
  });
});

describe("RateLimiterRegistry", () => {
  it("keeps separate endpoints independent", async () => {
    const registry = new RateLimiterRegistry({ slow: 60, fast: 0 });
    const started = Date.now();
    await Promise.all([
      registry.run("slow", async () => undefined),
      registry.run("fast", async () => undefined),
      registry.run("fast", async () => undefined),
    ]);
    // Two fast calls must not have waited behind the slow queue.
    expect(Date.now() - started).toBeLessThan(60);
  });
});
