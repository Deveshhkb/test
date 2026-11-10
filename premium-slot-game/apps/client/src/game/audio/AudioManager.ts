export type SoundId =
  | 'click'
  | 'reelSpin'
  | 'reelStop'
  | 'win'
  | 'winCascade'
  | 'bigWin'
  | 'megaWin'
  | 'epicWin'
  | 'luckyWin'
  | 'bossIntro'
  | 'bossAttack'
  | 'shoot'
  | 'explode'
  | 'freeSpins'
  | 'bonusTrigger'
  | 'anticipation'
  | 'wildLand'
  | 'scatterLand'
  | 'bonusLand'
  | 'reveal'
  | 'firework';

interface PlayOpts {
  volume?: number;
  rate?: number;
}

const MIN_INTERVAL: Partial<Record<SoundId, number>> = { reelStop: 30, explode: 60, win: 80, click: 40, wildLand: 60, scatterLand: 60, bonusLand: 60, firework: 120 };

/**
 * All sound is synthesised at runtime with the Web Audio API (original, licence-free).
 * Separate master / music / sfx buses, smooth fades, autoplay unlock and duplicate guards.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noiseBuf: AudioBuffer | null = null;
  private lastPlayed = new Map<SoundId, number>();
  private loops = new Map<SoundId, { stop(): void }>();
  private musicTimer = 0;
  private musicStep = 0;
  private musicNextTime = 0;
  private musicOn = false;
  private vol = { master: 0.8, music: 0.45, sfx: 0.8, muted: false };

  get unlocked() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** Must be called from a user gesture (browser autoplay policy). */
  unlock() {
    if (typeof window === 'undefined') return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!this.ctx) {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(comp).connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.applyVolumes(0);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setVolumes(v: { master: number; music: number; sfx: number; muted: boolean }) {
    this.vol = v;
    this.applyVolumes(0.25);
  }

  private applyVolumes(fade: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const ramp = (g: GainNode, v: number) => {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(v, t + fade);
    };
    ramp(this.master, this.vol.muted ? 0 : this.vol.master);
    ramp(this.musicBus, this.vol.music * 0.5);
    ramp(this.sfxBus, this.vol.sfx);
  }

  /* ---------- synthesis primitives ---------- */
  private tone(freq: number, dur: number, o: { type?: OscillatorType; gain?: number; at?: number; to?: number; attack?: number; bus?: GainNode; detune?: number } = {}) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + (o.at ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.detune) osc.detune.value = o.detune;
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + dur);
    const peak = o.gain ?? 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (o.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(o.bus ?? this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    return { osc, g };
  }

  private noise(dur: number, o: { gain?: number; at?: number; freq?: number; type?: BiquadFilterType; to?: number; q?: number; bus?: GainNode } = {}) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + (o.at ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? 'lowpass';
    f.frequency.setValueAtTime(o.freq ?? 1200, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain ?? 0.3, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(o.bus ?? this.sfxBus);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  private chord(freqs: number[], dur: number, at: number, type: OscillatorType = 'sawtooth', gain = 0.08) {
    freqs.forEach((f) => {
      this.tone(f, dur, { type, gain, at, attack: 0.02 });
      this.tone(f, dur, { type, gain: gain * 0.6, at, attack: 0.02, detune: 9 });
    });
  }

  private arp(freqs: number[], step: number, o: { type?: OscillatorType; gain?: number; dur?: number; at?: number } = {}) {
    freqs.forEach((f, i) => this.tone(f, o.dur ?? step * 1.8, { type: o.type ?? 'square', gain: o.gain ?? 0.08, at: (o.at ?? 0) + i * step }));
  }

  play(id: SoundId, opts: PlayOpts = {}) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = performance.now();
    const min = MIN_INTERVAL[id] ?? 0;
    if (min && now - (this.lastPlayed.get(id) ?? 0) < min) return;
    this.lastPlayed.set(id, now);
    const v = opts.volume ?? 1;
    const r = opts.rate ?? 1;
    const N = (n: number) => 440 * Math.pow(2, (n - 69) / 12) * r;
    switch (id) {
      case 'click':
        this.tone(1800 * r, 0.05, { type: 'square', gain: 0.06 * v, to: 900 });
        break;
      case 'reelSpin': {
        if (this.loops.has('reelSpin')) return;
        const ctx = this.ctx;
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 900;
        f.Q.value = 0.8;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.05 * v, ctx.currentTime + 0.2);
        const lfo = ctx.createOscillator();
        const lfoG = ctx.createGain();
        lfo.frequency.value = 14;
        lfoG.gain.value = 300;
        lfo.connect(lfoG).connect(f.frequency);
        src.connect(f).connect(g).connect(this.sfxBus);
        src.start();
        lfo.start();
        this.loops.set('reelSpin', {
          stop: () => {
            const t = ctx.currentTime;
            g.gain.cancelScheduledValues(t);
            g.gain.setValueAtTime(g.gain.value, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
            src.stop(t + 0.2);
            lfo.stop(t + 0.2);
          },
        });
        break;
      }
      case 'reelStop':
        this.tone(140 * r, 0.12, { type: 'sine', gain: 0.35 * v, to: 60 });
        this.noise(0.06, { gain: 0.12 * v, freq: 3000, type: 'highpass' });
        break;
      case 'win':
        this.arp([N(76), N(79), N(83), N(88)], 0.06, { type: 'triangle', gain: 0.12 * v });
        break;
      case 'winCascade':
        this.arp([N(72), N(76), N(79), N(84), N(88)], 0.05, { type: 'square', gain: 0.07 * v });
        this.tone(N(96), 0.3, { type: 'sine', gain: 0.06 * v, at: 0.25 });
        break;
      case 'bigWin':
        this.chord([N(57), N(64), N(69), N(73)], 1.6, 0, 'sawtooth', 0.05 * v);
        this.arp([N(81), N(85), N(88), N(93), N(97)], 0.09, { gain: 0.07 * v, at: 0.1 });
        this.noise(0.8, { gain: 0.08 * v, freq: 6000, type: 'highpass', at: 0.05 });
        break;
      case 'megaWin':
        this.tone(N(45), 0.9, { type: 'sawtooth', gain: 0.15 * v, to: N(33) });
        this.chord([N(52), N(59), N(64), N(68), N(71)], 2.2, 0.2, 'sawtooth', 0.05 * v);
        this.arp([N(76), N(80), N(83), N(88), N(92), N(95), N(100)], 0.07, { gain: 0.06 * v, at: 0.25 });
        this.noise(1.2, { gain: 0.1 * v, freq: 200, to: 8000, type: 'bandpass', q: 2 });
        break;
      case 'epicWin':
        this.noise(1.5, { gain: 0.14 * v, freq: 100, to: 10000, type: 'bandpass', q: 1.5 });
        this.tone(N(33), 1.8, { type: 'sawtooth', gain: 0.18 * v });
        [0, 0.6, 1.2].forEach((at, i) => this.chord([N(57 + i * 2), N(61 + i * 2), N(64 + i * 2), N(69 + i * 2)], 1.4, at + 0.3, 'sawtooth', 0.05 * v));
        this.arp([N(81), N(85), N(88), N(93), N(97), N(100), N(105)], 0.08, { gain: 0.07 * v, at: 1.9 });
        break;
      case 'luckyWin':
        this.arp([N(84), N(88), N(91), N(96), N(100), N(103)], 0.07, { type: 'sine', gain: 0.12 * v, dur: 0.6 });
        this.arp([N(91), N(96), N(100)], 0.12, { type: 'triangle', gain: 0.08 * v, at: 0.45, dur: 0.8 });
        break;
      case 'freeSpins':
        this.noise(1, { gain: 0.1 * v, freq: 300, to: 9000, type: 'bandpass', q: 3 });
        this.chord([N(62), N(66), N(69), N(74)], 1.5, 0.6, 'sawtooth', 0.05 * v);
        this.arp([N(86), N(90), N(93), N(98)], 0.08, { gain: 0.07 * v, at: 0.6 });
        break;
      case 'bonusTrigger':
        this.arp([N(60), N(64), N(67), N(72), N(76), N(79), N(84)], 0.05, { type: 'sawtooth', gain: 0.07 * v });
        break;
      case 'anticipation':
        this.tone(N(57), 1.2, { type: 'sawtooth', gain: 0.06 * v, to: N(69), attack: 0.3 });
        this.noise(1.2, { gain: 0.05 * v, freq: 500, to: 4000, type: 'bandpass', q: 4 });
        break;
      case 'wildLand':
        this.tone(N(88), 0.25, { type: 'square', gain: 0.07 * v, to: N(100) });
        this.tone(N(64), 0.3, { type: 'sine', gain: 0.2 * v });
        break;
      case 'scatterLand':
        this.arp([N(79), N(86), N(91)], 0.05, { type: 'sine', gain: 0.14 * v, dur: 0.4 });
        break;
      case 'bonusLand':
        this.tone(90 * r, 0.3, { type: 'sine', gain: 0.4 * v, to: 40 });
        this.noise(0.25, { gain: 0.15 * v, freq: 1500, to: 200 });
        this.tone(N(84), 0.3, { type: 'square', gain: 0.05 * v, at: 0.05 });
        break;
      case 'bossIntro':
        this.tone(N(33), 2, { type: 'sawtooth', gain: 0.2 * v, attack: 0.4 });
        this.tone(N(34), 2, { type: 'sawtooth', gain: 0.12 * v, attack: 0.4 });
        [0, 0.5, 1].forEach((at) => this.tone(N(81), 0.3, { type: 'square', gain: 0.05 * v, at, to: N(69) }));
        break;
      case 'bossAttack':
        this.tone(N(40), 0.6, { type: 'sawtooth', gain: 0.15 * v, to: N(64), attack: 0.3 });
        this.noise(0.4, { gain: 0.12 * v, freq: 800, at: 0.6 });
        break;
      case 'shoot':
        this.tone(2400 * r, 0.22, { type: 'square', gain: 0.1 * v, to: 300 });
        this.tone(1200 * r, 0.18, { type: 'sawtooth', gain: 0.06 * v, to: 150 });
        break;
      case 'explode':
        this.noise(0.7, { gain: 0.35 * v, freq: 2400, to: 80 });
        this.tone(80, 0.5, { type: 'sine', gain: 0.4 * v, to: 30 });
        break;
      case 'reveal':
        this.arp([N(84), N(91), N(96)], 0.06, { type: 'triangle', gain: 0.12 * v });
        break;
      case 'firework':
        this.noise(0.5, { gain: 0.12 * v, freq: 5000, to: 600, type: 'bandpass' });
        break;
    }
  }

  stop(id: SoundId) {
    this.loops.get(id)?.stop();
    this.loops.delete(id);
  }

  /** Procedural synthwave loop scheduled with a look-ahead timer. */
  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    this.musicNextTime = this.ctx.currentTime + 0.1;
    const bpm = 104;
    const step = 60 / bpm / 4;
    const prog = [57, 53, 48, 55]; // A F C G
    const tick = () => {
      if (!this.ctx || !this.musicOn) return;
      while (this.musicNextTime < this.ctx.currentTime + 0.15) {
        const s = this.musicStep;
        const bar = Math.floor(s / 16) % 4;
        const root = prog[bar];
        const at = this.musicNextTime - this.ctx.currentTime;
        const N = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
        if (s % 2 === 0) this.tone(N(root - 24), step * 1.8, { type: 'sawtooth', gain: 0.07, at, bus: this.musicBus });
        if (s % 4 === 0) {
          this.tone(110, 0.18, { type: 'sine', gain: 0.25, at, to: 40, bus: this.musicBus });
        }
        if (s % 4 === 2) this.noise(0.04, { gain: 0.04, freq: 8000, type: 'highpass', at, bus: this.musicBus });
        if (s % 8 === 4) this.noise(0.12, { gain: 0.06, freq: 1800, type: 'bandpass', at, bus: this.musicBus });
        const arpNotes = [0, 7, 12, 16, 12, 7, 3, 7];
        this.tone(N(root + 12 + arpNotes[s % 8]), step * 0.9, { type: 'triangle', gain: 0.025, at, bus: this.musicBus });
        if (s % 16 === 0) this.chord([N(root), N(root + (bar === 0 ? 3 : 4)), N(root + 7)], step * 15, at, 'sawtooth', 0.012);
        this.musicNextTime += step;
        this.musicStep++;
      }
    };
    tick();
    this.musicTimer = window.setInterval(tick, 40);
  }

  stopMusic() {
    this.musicOn = false;
    clearInterval(this.musicTimer);
  }

  destroy() {
    this.stopMusic();
    this.loops.forEach((l) => l.stop());
    this.loops.clear();
    void this.ctx?.close();
    this.ctx = null;
  }
}
