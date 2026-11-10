import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@neon/game-math';
import { INITIAL, forcedConfig, key, makeApp } from './helpers';
import { CryptoRng } from '../src/services/rng';

async function login(app: Parameters<typeof request>[0]) {
  const res = await request(app).post('/api/auth/demo').send({ nickname: 'tester' });
  expect(res.status).toBe(201);
  return res.body.token as string;
}

describe('health & auth', () => {
  it('reports health', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/health');
    expect(res.body).toMatchObject({ status: 'ok', store: 'memory', cache: 'memory' });
  });
  it('creates a demo user with virtual balance', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/auth/demo').send({});
    expect(res.body.user.balance).toBe(INITIAL);
    expect(typeof res.body.token).toBe('string');
  });
  it('rejects missing or invalid tokens', async () => {
    const { app } = makeApp();
    expect((await request(app).get('/api/game/balance')).status).toBe(401);
    expect((await request(app).get('/api/game/balance').set('Authorization', 'Bearer nope')).status).toBe(401);
  });
  it('serves public config and paytable', async () => {
    const { app } = makeApp();
    const cfg = await request(app).get('/api/game/config');
    expect(cfg.body.maxWays).toBe(15625);
    const pt = await request(app).get('/api/game/paytable');
    expect(pt.body.symbols.length).toBe(18);
  });
});

describe('spin', () => {
  it('debits the bet, credits the win and persists the round', async () => {
    const { app, store } = makeApp();
    const token = await login(app);
    const res = await request(app).post('/api/game/spin').set('Authorization', `Bearer ${token}`).send({ bet: 10000, idempotencyKey: key() });
    expect(res.status).toBe(200);
    const { outcome, balanceBefore, balanceAfter, roundId } = res.body;
    expect(balanceBefore).toBe(INITIAL);
    expect(balanceAfter).toBe(INITIAL - 10000 + outcome.totalWin);
    expect(outcome.initialGrid).toHaveLength(6);
    expect(outcome.initialGrid[0]).toHaveLength(5);
    const round = await store.rounds.get(roundId);
    expect(round?.status === 'COMPLETED' || round?.status === 'BONUS_PENDING').toBe(true);
    expect(round?.outcome.totalWin).toBe(outcome.totalWin);
    const bal = await request(app).get('/api/game/balance').set('Authorization', `Bearer ${token}`);
    expect(bal.body.balance).toBe(balanceAfter);
  });

  it('never exposes boss fight rewards in the spin response', async () => {
    const { app } = makeApp({ config: forcedConfig('BONUS') });
    const token = await login(app);
    const res = await request(app).post('/api/game/spin').set('Authorization', `Bearer ${token}`).send({ bet: 10000, idempotencyKey: key() });
    expect(res.body.outcome.bonusTriggered).toBe(true);
    expect(res.body.outcome.bossFight).toBeNull();
    expect(res.body.bossFight.picks).toEqual([]);
    expect(JSON.stringify(res.body)).not.toContain('rewards');
  });

  it('validates bets', async () => {
    const { app } = makeApp();
    const token = await login(app);
    const auth = { Authorization: `Bearer ${token}` };
    expect((await request(app).post('/api/game/spin').set(auth).send({ bet: 12345, idempotencyKey: key() })).body.error.code).toBe('INVALID_BET');
    expect((await request(app).post('/api/game/spin').set(auth).send({ bet: -5, idempotencyKey: key() })).body.error.code).toBe('VALIDATION');
    expect((await request(app).post('/api/game/spin').set(auth).send({ bet: 10000 })).body.error.code).toBe('VALIDATION');
  });

  it('rejects spins with insufficient funds', async () => {
    const { app } = makeApp({ initialBalance: 5000 });
    const token = await login(app);
    const res = await request(app).post('/api/game/spin').set('Authorization', `Bearer ${token}`).send({ bet: 10000, idempotencyKey: key() });
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');
  });

  it('is idempotent: the same key returns the same round and debits once', async () => {
    const { app, store } = makeApp();
    const token = await login(app);
    const k = key();
    const a = await request(app).post('/api/game/spin').set('Authorization', `Bearer ${token}`).send({ bet: 10000, idempotencyKey: k });
    const b = await request(app).post('/api/game/spin').set('Authorization', `Bearer ${token}`).send({ bet: 10000, idempotencyKey: k });
    expect(b.body.roundId).toBe(a.body.roundId);
    const user = (await store.transactions.listByUser(a.body.outcome && (await request(app).post('/api/game/session').set('Authorization', `Bearer ${token}`)).body.userId));
    expect(user.filter((t) => t.type === 'BET')).toHaveLength(1);
  });

  it('idempotency survives cache loss (persistent check)', async () => {
    const { app, cache } = makeApp();
    const token = await login(app);
    const k = key();
    const a = await request(app).post('/api/game/spin').set('Authorization', `Bearer ${token}`).send({ bet: 10000, idempotencyKey: k });
    await cache.del(`idem:spin:${(await request(app).post('/api/game/session').set('Authorization', `Bearer ${token}`)).body.userId}:${k}`);
    const b = await request(app).post('/api/game/spin').set('Authorization', `Bearer ${token}`).send({ bet: 10000, idempotencyKey: k });
    expect(b.body.roundId).toBe(a.body.roundId);
  });

  it('prevents concurrent spins and keeps the ledger consistent', async () => {
    const { app, store } = makeApp();
    const token = await login(app);
    const results = await Promise.all(
      Array.from({ length: 8 }, () => request(app).post('/api/game/spin').set('Authorization', `Bearer ${token}`).send({ bet: 10000, idempotencyKey: key() })),
    );
    const ok = results.filter((r) => r.status === 200);
    const busy = results.filter((r) => r.status === 409);
    expect(ok.length).toBeGreaterThanOrEqual(1);
    expect(ok.length + busy.length).toBe(8);
    busy.forEach((r) => expect(r.body.error.code).toBe('SPIN_IN_PROGRESS'));
    const userId = (await request(app).post('/api/game/session').set('Authorization', `Bearer ${token}`)).body.userId;
    const txs = await store.transactions.listByUser(userId);
    const user = await store.users.get(userId);
    expect(INITIAL + txs.reduce((a, t) => a + t.amount, 0)).toBe(user!.balance);
    expect(txs.filter((t) => t.type === 'BET')).toHaveLength(ok.length);
    const seqs = ok.map((r) => r.body.sequence).sort();
    expect(new Set(seqs).size).toBe(seqs.length);
  });

  it('keeps transaction integrity over many rounds and records history', async () => {
    const { app, store } = makeApp();
    const token = await login(app);
    const auth = { Authorization: `Bearer ${token}` };
    let last = 0;
    for (let i = 0; i < 40; i++) {
      const r = await request(app).post('/api/game/spin').set(auth).send({ bet: 10000, idempotencyKey: key() });
      if (r.body.error?.code === 'BONUS_PENDING' || r.body.bossFight) {
        // finish any boss fight
        let bf = r.body.bossFight ?? (await request(app).post('/api/game/session').set(auth)).body.bossFight;
        while (bf && !bf.completed) bf = (await request(app).post('/api/game/bonus/pick').set(auth).send({ roundId: bf.roundId, targetIndex: 0, idempotencyKey: key() })).body.bossFight;
      }
      if (r.status === 200) {
        expect(r.body.sequence).toBeGreaterThan(last);
        last = r.body.sequence;
      }
    }
    const session = (await request(app).post('/api/game/session').set(auth)).body;
    const txs = await store.transactions.listByUser(session.userId);
    expect(INITIAL + txs.reduce((a, t) => a + t.amount, 0)).toBe(session.balance);
    const keys = txs.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    const hist = await request(app).get('/api/game/history?limit=100').set(auth);
    expect(hist.body.rounds.length).toBe(session.sequence);
    expect(hist.body.rounds[0].sequence).toBe(session.sequence);
  });
});

describe('free spins (server authoritative)', () => {
  it('triggers free spins and plays them without debiting', async () => {
    const { app } = makeApp({ config: forcedConfig('SCATTER', 400) });
    const token = await login(app);
    const auth = { Authorization: `Bearer ${token}` };
    let res = await request(app).post('/api/game/spin').set(auth).send({ bet: 10000, idempotencyKey: key() });
    for (let i = 0; i < 20 && !res.body.outcome?.freeSpins?.triggered; i++) {
      res = await request(app).post('/api/game/spin').set(auth).send({ bet: 10000, idempotencyKey: key() });
    }
    expect(res.body.outcome.freeSpins.triggered).toBe(true);
    let fs = res.body.freeSpins;
    expect(fs.remaining).toBeGreaterThanOrEqual(10);
    let total = 0;
    while (fs) {
      const before = (await request(app).get('/api/game/balance').set(auth)).body.balance;
      // client-submitted bet is ignored during free spins
      const f = await request(app).post('/api/game/spin').set(auth).send({ bet: 100000, idempotencyKey: key() });
      expect(f.body.outcome.mode).toBe('FREE_SPIN');
      expect(f.body.outcome.bet).toBe(10000);
      expect(f.body.balanceBefore).toBe(before);
      expect(f.body.balanceAfter).toBe(before + f.body.outcome.totalWin);
      total += f.body.outcome.totalWin;
      if (!f.body.freeSpins) expect(f.body.outcome.freeSpins.totalWin).toBe(total);
      fs = f.body.freeSpins;
    }
    const after = await request(app).post('/api/game/spin').set(auth).send({ bet: 10000, idempotencyKey: key() });
    expect(after.body.outcome.mode).toBe('BASE');
  });
});

describe('boss fight', () => {
  it('reveals predetermined rewards, blocks spins until finished and credits once', async () => {
    const { app, store } = makeApp({ config: forcedConfig('BONUS') });
    const token = await login(app);
    const auth = { Authorization: `Bearer ${token}` };
    const spin = await request(app).post('/api/game/spin').set(auth).send({ bet: 10000, idempotencyKey: key() });
    const roundId = spin.body.roundId;
    const hidden = (await store.rounds.get(roundId))!.outcome.bossFight!;
    const blocked = await request(app).post('/api/game/spin').set(auth).send({ bet: 10000, idempotencyKey: key() });
    expect(blocked.body.error.code).toBe('BONUS_PENDING');

    const balanceBefore = (await request(app).get('/api/game/balance').set(auth)).body.balance;
    for (let shot = 0; shot < DEFAULT_CONFIG.bossFight.shots; shot++) {
      const pick = await request(app).post('/api/game/bonus/pick').set(auth).send({ roundId, targetIndex: 3 - shot, idempotencyKey: key() });
      expect(pick.status).toBe(200);
      expect(pick.body.pick.multiplier).toBe(hidden.rewards[shot]);
      expect(pick.body.pick.targetIndex).toBe(3 - shot);
    }
    const balanceAfter = (await request(app).get('/api/game/balance').set(auth)).body.balance;
    expect(balanceAfter - balanceBefore).toBe(hidden.totalWin);
    const again = await request(app).post('/api/game/bonus/pick').set(auth).send({ roundId, targetIndex: 0, idempotencyKey: key() });
    expect(again.body.error.code).toBe('NO_BONUS');
    const bonusTx = (await store.transactions.listByUser(spin.body.outcome && (await request(app).post('/api/game/session').set(auth)).body.userId)).filter((t) => t.type === 'BONUS_WIN');
    expect(bonusTx).toHaveLength(1);
  });
});

describe('recovery', () => {
  it('settles rounds persisted in SETTLING state', async () => {
    const { app, store, game } = makeApp();
    const token = await login(app);
    const auth = { Authorization: `Bearer ${token}` };
    const session = (await request(app).post('/api/game/session').set(auth)).body;
    // simulate crash after persistence but before crediting
    const spin = await request(app).post('/api/game/spin').set(auth).send({ bet: 10000, idempotencyKey: key() });
    const round = (await store.rounds.get(spin.body.roundId))!;
    await store.rounds.insert({ ...round, id: 'crashed-round', idempotencyKey: 'crashed-key-123', status: 'SETTLING', outcome: { ...round.outcome, totalWin: 777, bossFight: null } });
    const before = (await store.users.get(session.userId))!.balance;
    expect(await game.recoverUnsettled(session.userId)).toBe(1);
    expect((await store.users.get(session.userId))!.balance).toBe(before + 777);
    expect(await game.recoverUnsettled(session.userId)).toBe(0);
    expect((await store.rounds.get('crashed-round'))!.status).toBe('COMPLETED');
  });
});

describe('CryptoRng', () => {
  it('produces uniform integers in range', () => {
    const rng = new CryptoRng();
    const buckets = new Array(10).fill(0);
    const N = 50000;
    for (let i = 0; i < N; i++) {
      const v = rng.int(10);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
      buckets[v]++;
    }
    const expected = N / 10;
    const chi = buckets.reduce((a, b) => a + (b - expected) ** 2 / expected, 0);
    expect(chi).toBeLessThan(30); // df=9, p≈0.0004
  });
  it('rejects invalid ranges', () => {
    expect(() => new CryptoRng().int(0)).toThrow();
  });
});
