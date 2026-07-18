import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { createApp } from './app';
import type { SpinResult } from '@/types';
import { REEL_COUNT, ROW_COUNT } from '@/constants';

let server: Server;
let base: string;

beforeAll(async () => {
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  const address = server.address();
  if (typeof address === 'object' && address) base = `http://127.0.0.1:${address.port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

async function login(): Promise<{ sessionId: string; balance: number }> {
  const res = await fetch(`${base}/api/login`, { method: 'POST' });
  expect(res.status).toBe(200);
  return res.json();
}

describe('RGS backend', () => {
  it('responds to health checks', async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it('creates isolated sessions at login', async () => {
    const a = await login();
    const b = await login();
    expect(a.sessionId).not.toBe(b.sessionId);
    expect(a.balance).toBeGreaterThan(0);
  });

  it('rejects play without a session', async () => {
    const res = await fetch(`${base}/api/spin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bet: 1 }),
    });
    expect(res.status).toBe(401);
  });

  it('spins and settles the balance server-side', async () => {
    const { sessionId, balance } = await login();
    const res = await fetch(`${base}/api/spin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-session-id': sessionId },
      body: JSON.stringify({ bet: 2 }),
    });
    expect(res.status).toBe(200);
    const spin = (await res.json()) as SpinResult;
    expect(spin.reels).toHaveLength(REEL_COUNT);
    for (const col of spin.reels) expect(col).toHaveLength(ROW_COUNT);
    expect(spin.balance).toBeCloseTo(balance - 2 + spin.totalWin, 2);

    const history = await fetch(`${base}/api/history`, {
      headers: { 'x-session-id': sessionId },
    });
    expect((await history.json()).length).toBe(1);
  });

  it('rejects invalid and unaffordable bets with typed errors', async () => {
    const { sessionId } = await login();
    const headers = { 'content-type': 'application/json', 'x-session-id': sessionId };
    const bad = await fetch(`${base}/api/spin`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ bet: 'nope' }),
    });
    expect(bad.status).toBe(400);
    const broke = await fetch(`${base}/api/spin`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ bet: 999999 }),
    });
    expect(broke.status).toBe(400);
    expect((await broke.json()).error).toBe('INSUFFICIENT_FUNDS');
  });

  it('persists settings per session', async () => {
    const { sessionId } = await login();
    const settings = {
      musicVolume: 0.1,
      soundVolume: 0.2,
      turbo: true,
      quickSpin: false,
      language: 'de',
      quality: 'low',
    };
    const res = await fetch(`${base}/api/settings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-session-id': sessionId },
      body: JSON.stringify(settings),
    });
    expect(await res.json()).toEqual(settings);
  });
});
