import { Redis } from 'ioredis';

/** Small key-value abstraction backed by Redis or memory. */
export interface Cache {
  readonly kind: 'redis' | 'memory';
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  /** Sets only if the key does not exist. Returns true on success. */
  setNX(key: string, value: string, ttlMs: number): Promise<boolean>;
  /** Deletes the key only if it still holds `value` (safe lock release). */
  delIfEquals(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
  close(): Promise<void>;
}

export function createMemoryCache(): Cache {
  const data = new Map<string, { v: string; exp: number }>();
  const live = (k: string) => {
    const e = data.get(k);
    if (!e) return null;
    if (e.exp && e.exp < Date.now()) {
      data.delete(k);
      return null;
    }
    return e;
  };
  return {
    kind: 'memory',
    async get(k) {
      return live(k)?.v ?? null;
    },
    async set(k, v, ttl) {
      data.set(k, { v, exp: ttl ? Date.now() + ttl : 0 });
    },
    async setNX(k, v, ttl) {
      if (live(k)) return false;
      data.set(k, { v, exp: Date.now() + ttl });
      return true;
    },
    async delIfEquals(k, v) {
      if (live(k)?.v === v) data.delete(k);
    },
    async del(k) {
      data.delete(k);
    },
    async close() {},
  };
}

const RELEASE_SCRIPT = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;

export async function createRedisCache(url: string): Promise<Cache> {
  const redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 });
  await redis.connect();
  return {
    kind: 'redis',
    get: (k) => redis.get(k),
    async set(k, v, ttl) {
      if (ttl) await redis.set(k, v, 'PX', ttl);
      else await redis.set(k, v);
    },
    async setNX(k, v, ttl) {
      return (await redis.set(k, v, 'PX', ttl, 'NX')) === 'OK';
    },
    async delIfEquals(k, v) {
      await redis.eval(RELEASE_SCRIPT, 1, k, v);
    },
    async del(k) {
      await redis.del(k);
    },
    async close() {
      await redis.quit();
    },
  };
}
