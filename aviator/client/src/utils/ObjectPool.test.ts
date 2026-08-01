import { describe, expect, it, vi } from 'vitest';
import { ObjectPool, type Poolable } from './ObjectPool';

class Dummy implements Poolable {
  value = 1;
  reset(): void {
    this.value = 0;
  }
}

describe('ObjectPool', () => {
  it('reuses released instances instead of allocating', () => {
    const pool = new ObjectPool(() => new Dummy());
    const first = pool.acquire();
    pool.release(first);

    const second = pool.acquire();
    expect(second).toBe(first);
    expect(pool.size).toBe(1);
  });

  it('resets objects on release', () => {
    const pool = new ObjectPool(() => new Dummy());
    const item = pool.acquire();
    item.value = 42;
    pool.release(item);
    expect(item.value).toBe(0);
  });

  it('preallocates when asked', () => {
    const pool = new ObjectPool(() => new Dummy(), { preallocate: 8 });
    expect(pool.available).toBe(8);
    expect(pool.size).toBe(8);
  });

  it('caps retained instances at maxSize', () => {
    const pool = new ObjectPool(() => new Dummy(), { maxSize: 2 });
    const items = [pool.acquire(), pool.acquire(), pool.acquire()];
    for (const item of items) pool.release(item);
    expect(pool.available).toBe(2);
    expect(pool.size).toBe(2);
  });

  it('drains with a disposer', () => {
    const pool = new ObjectPool(() => new Dummy(), { preallocate: 3 });
    const dispose = vi.fn();
    pool.drain(dispose);
    expect(dispose).toHaveBeenCalledTimes(3);
    expect(pool.available).toBe(0);
    expect(pool.size).toBe(0);
  });
});
