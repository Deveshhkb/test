import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRedisCache, type Cache } from '../src/services/cache';
import { INITIAL, key, makeApp } from './helpers';

const hasRedis = spawnSync('redis-server', ['--version']).status === 0;
const PORT = 6390 + Math.floor(Math.random() * 50);
let proc: ChildProcess | null = null;
let cache: Cache;

describe.skipIf(!hasRedis)('Redis cache integration', () => {
  beforeAll(async () => {
    proc = spawn('redis-server', ['--port', String(PORT), '--save', '', '--appendonly', 'no'], { stdio: 'ignore' });
    for (let i = 0; i < 50; i++) {
      try {
        cache = await createRedisCache(`redis://127.0.0.1:${PORT}`);
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    throw new Error('redis did not start');
  });
  afterAll(async () => {
    await cache?.close();
    proc?.kill();
  });

  it('supports NX locks with safe release and TTL', async () => {
    expect(await cache.setNX('lock:a', 't1', 1000)).toBe(true);
    expect(await cache.setNX('lock:a', 't2', 1000)).toBe(false);
    await cache.delIfEquals('lock:a', 't2');
    expect(await cache.get('lock:a')).toBe('t1');
    await cache.delIfEquals('lock:a', 't1');
    expect(await cache.get('lock:a')).toBeNull();
    await cache.set('ttl', 'x', 50);
    await new Promise((r) => setTimeout(r, 120));
    expect(await cache.get('ttl')).toBeNull();
  });

  it('runs spins with Redis-backed locks and idempotency', async () => {
    const { app, store } = makeApp({ cache });
    const token = (await request(app).post('/api/auth/demo').send({})).body.token;
    const auth = { Authorization: `Bearer ${token}` };
    const k = key();
    const [a, b] = await Promise.all([
      request(app).post('/api/game/spin').set(auth).send({ bet: 10000, idempotencyKey: k }),
      request(app).post('/api/game/spin').set(auth).send({ bet: 10000, idempotencyKey: key() }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const replay = await request(app).post('/api/game/spin').set(auth).send({ bet: 10000, idempotencyKey: k });
    if (a.status === 200) expect(replay.body.roundId).toBe(a.body.roundId);
    const session = (await request(app).post('/api/game/session').set(auth)).body;
    const txs = await store.transactions.listByUser(session.userId);
    expect(INITIAL + txs.reduce((s, t) => s + t.amount, 0)).toBe(session.balance);
  });
});
