import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { io as ioc, type Socket } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';
import { SocketEvents, type SessionState, type SpinResponse } from '@neon/shared';
import { attachSocket } from '../src/socket';
import { forcedConfig, key, makeApp } from './helpers';

let http: Server | null = null;
const sockets: Socket[] = [];
afterEach(async () => {
  sockets.forEach((s) => s.disconnect());
  sockets.length = 0;
  await new Promise<void>((r) => (http ? http.close(() => r()) : r()));
  http = null;
});

async function boot(config = forcedConfig('BONUS')) {
  const built = makeApp({ config });
  http = createServer(built.app);
  const { notifySpin, notifyBonus, io } = attachSocket(http, { auth: built.auth, game: built.game, cache: built.cache, corsOrigin: '*' });
  built.events.onSpin = notifySpin;
  built.events.onBonusPick = notifyBonus;
  await new Promise<void>((r) => http!.listen(0, r));
  const port = (http.address() as AddressInfo).port;
  const token = (await request(built.app).post('/api/auth/demo').send({})).body.token as string;
  const connect = () =>
    new Promise<Socket>((resolve, reject) => {
      const s = ioc(`http://localhost:${port}`, { auth: { token }, transports: ['websocket'], reconnection: false });
      sockets.push(s);
      s.on('connect', () => resolve(s));
      s.on('connect_error', reject);
    });
  return { ...built, port, token, connect, io };
}

const emit = <T>(s: Socket, ev: string, payload: unknown) =>
  new Promise<T>((resolve, reject) => s.emit(ev, payload, (res: { ok: boolean; data: T; error: unknown }) => (res.ok ? resolve(res.data) : reject(res.error))));

describe('socket.io gameplay', () => {
  it('rejects unauthenticated sockets', async () => {
    const { port } = await boot();
    await expect(
      new Promise((resolve, reject) => {
        const s = ioc(`http://localhost:${port}`, { auth: { token: 'bad' }, transports: ['websocket'], reconnection: false });
        sockets.push(s);
        s.on('connect', () => resolve(s));
        s.on('connect_error', reject);
      }),
    ).rejects.toThrow('UNAUTHORIZED');
  });

  it('joins, spins and pushes reels/balance events', async () => {
    const { connect } = await boot();
    const s = await connect();
    const state = await emit<SessionState>(s, SocketEvents.JOIN, {});
    expect(state.balance).toBeGreaterThan(0);
    const reels = new Promise((r) => s.once(SocketEvents.REELS, r));
    const balance = new Promise<{ balance: number }>((r) => s.once(SocketEvents.BALANCE, r));
    const res = await emit<SpinResponse>(s, SocketEvents.SPIN, { bet: 10000, idempotencyKey: key() });
    expect(res.outcome.initialGrid).toHaveLength(6);
    await reels;
    expect((await balance).balance).toBe(res.balanceAfter);
  });

  it('recovers an unfinished boss fight after reconnection', async () => {
    const { connect } = await boot();
    const s1 = await connect();
    await emit(s1, SocketEvents.JOIN, {});
    const spin = await emit<SpinResponse>(s1, SocketEvents.SPIN, { bet: 10000, idempotencyKey: key() });
    expect(spin.bossFight).not.toBeNull();
    await emit(s1, SocketEvents.BONUS_PICK, { roundId: spin.roundId, targetIndex: 1, idempotencyKey: key() });
    s1.disconnect();

    const s2 = await connect();
    const state = await emit<SessionState>(s2, SocketEvents.RESUME, {});
    expect(state.bossFight?.roundId).toBe(spin.roundId);
    expect(state.bossFight?.picks).toHaveLength(1);
    expect(state.lastRound?.roundId).toBe(spin.roundId);
    const err = await emit(s2, SocketEvents.SPIN, { bet: 10000, idempotencyKey: key() }).catch((e: { code: string }) => e);
    expect((err as { code: string }).code).toBe('BONUS_PENDING');
  });
});
