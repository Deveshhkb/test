import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameClient } from '../src/services/gameClient';
import { AudioManager } from '../src/game/audio/AudioManager';

afterEach(() => vi.unstubAllGlobals());

describe('GameClient', () => {
  it('retries network failures with the SAME idempotency key', async () => {
    const bodies: string[] = [];
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        bodies.push(String(init.body));
        calls++;
        if (calls < 3) throw new TypeError('Failed to fetch');
        return new Response(JSON.stringify({ roundId: 'r1' }), { status: 200 });
      }),
    );
    const c = new GameClient();
    c.token = 't';
    const res = await c.spin(10000, 'idem-key-123456');
    expect(res.roundId).toBe('r1');
    expect(calls).toBe(3);
    expect(new Set(bodies).size).toBe(1);
    expect(JSON.parse(bodies[0])).toEqual({ bet: 10000, idempotencyKey: 'idem-key-123456' });
  });

  it('does not retry business errors', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ error: { code: 'INSUFFICIENT_FUNDS', message: 'no' } }), { status: 402 }));
    vi.stubGlobal('fetch', f);
    const c = new GameClient();
    c.token = 't';
    await expect(c.spin(10000, 'idem-key-123456')).rejects.toMatchObject({ code: 'INSUFFICIENT_FUNDS' });
    expect(f).toHaveBeenCalledTimes(1);
  });
});

class FakeParam {
  value = 0;
  setValueAtTime() {}
  linearRampToValueAtTime(v: number) {
    this.value = v;
  }
  exponentialRampToValueAtTime() {}
  cancelScheduledValues() {}
}
class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  detune = new FakeParam();
  Q = new FakeParam();
  threshold = new FakeParam();
  ratio = new FakeParam();
  type = '';
  buffer: unknown = null;
  loop = false;
  connect(n: unknown) {
    return n;
  }
  start() {}
  stop() {}
}
let oscCount = 0;
class FakeCtx {
  state = 'running';
  currentTime = 0;
  sampleRate = 8000;
  destination = new FakeNode();
  createGain = () => new FakeNode();
  createDynamicsCompressor = () => new FakeNode();
  createBiquadFilter = () => new FakeNode();
  createBufferSource = () => new FakeNode();
  createOscillator = () => (oscCount++, new FakeNode());
  createBuffer = (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) });
  resume = async () => {};
  close = async () => {};
}

describe('AudioManager', () => {
  it('is silent until unlocked', () => {
    const a = new AudioManager();
    expect(() => a.play('win')).not.toThrow();
    expect(a.unlocked).toBe(false);
  });
  it('prevents duplicate playback within the guard window and supports mute', () => {
    vi.stubGlobal('AudioContext', FakeCtx);
    const a = new AudioManager();
    a.unlock();
    expect(a.unlocked).toBe(true);
    oscCount = 0;
    a.play('click');
    const after1 = oscCount;
    a.play('click');
    expect(oscCount).toBe(after1); // duplicate suppressed
    a.setVolumes({ master: 0.5, music: 0.2, sfx: 0.7, muted: true });
    expect((a as unknown as { master: FakeNode }).master.gain.value).toBe(0);
    a.setVolumes({ master: 0.5, music: 0.2, sfx: 0.7, muted: false });
    expect((a as unknown as { master: FakeNode }).master.gain.value).toBe(0.5);
    a.play('reelSpin');
    a.play('reelSpin'); // looped sound starts once
    a.stop('reelSpin');
    a.startMusic();
    a.destroy();
  });
});
