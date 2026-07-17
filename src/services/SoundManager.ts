import { useSettingsStore } from '@/store/settingsStore';

/**
 * Web Audio sound engine. All sounds are synthesized procedurally so the
 * game ships with zero audio assets; swap `play*` internals for decoded
 * buffers (see `loadBuffer`) when real audio is produced.
 */

export type SfxName =
  | 'button'
  | 'spin'
  | 'reelStop'
  | 'win'
  | 'scatter'
  | 'bonus'
  | 'freeSpin'
  | 'bigWin'
  | 'coin'
  | 'cascade'
  | 'wild';

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;
  private musicGain!: GainNode;
  private sfxGain!: GainNode;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private spinLoop: { osc: OscillatorNode; gain: GainNode } | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private unsubscribe: (() => void) | null = null;

  /** Must be called from a user gesture (autoplay policy). */
  init(): void {
    if (this.ctx) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.masterGain);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);

    const apply = () => {
      const { musicVolume, soundVolume } = useSettingsStore.getState();
      if (!this.ctx) return;
      this.musicGain.gain.setTargetAtTime(musicVolume * 0.35, this.ctx.currentTime, 0.05);
      this.sfxGain.gain.setTargetAtTime(soundVolume, this.ctx.currentTime, 0.05);
    };
    apply();
    this.unsubscribe = useSettingsStore.subscribe(apply);
  }

  resume(): void {
    void this.ctx?.resume();
  }

  destroy(): void {
    this.stopMusic();
    this.stopSpinLoop();
    this.unsubscribe?.();
    void this.ctx?.close();
    this.ctx = null;
  }

  /** Hook for real audio assets later on. */
  async loadBuffer(name: string, url: string): Promise<void> {
    if (!this.ctx) return;
    const res = await fetch(url);
    const data = await res.arrayBuffer();
    this.buffers.set(name, await this.ctx.decodeAudioData(data));
  }

  play(name: SfxName): void {
    if (!this.ctx) return;
    switch (name) {
      case 'button':
        this.blip(660, 0.06, 'square', 0.25);
        break;
      case 'spin':
        this.startSpinLoop();
        break;
      case 'reelStop':
        this.thud();
        break;
      case 'win':
        this.arpeggio([523, 659, 784], 0.09, 0.5);
        break;
      case 'scatter':
        this.arpeggio([880, 1108, 1318, 1760], 0.1, 0.5, 'triangle');
        break;
      case 'bonus':
        this.arpeggio([392, 494, 587, 784], 0.12, 0.6);
        break;
      case 'freeSpin':
        this.arpeggio([523, 659, 784, 1046, 1318], 0.11, 0.6, 'sawtooth');
        break;
      case 'bigWin':
        this.fanfare();
        break;
      case 'coin':
        this.blip(1200 + Math.random() * 800, 0.05, 'sine', 0.15);
        break;
      case 'cascade':
        this.blip(300, 0.12, 'sawtooth', 0.2);
        break;
      case 'wild':
        this.arpeggio([440, 554, 659], 0.07, 0.4, 'triangle');
        break;
    }
  }

  stopSpinLoop(): void {
    if (!this.ctx || !this.spinLoop) return;
    const { osc, gain } = this.spinLoop;
    gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    osc.stop(this.ctx.currentTime + 0.4);
    this.spinLoop = null;
  }

  startMusic(): void {
    if (!this.ctx || this.musicTimer !== null) return;
    // Gentle looping arpeggio pad — a stand-in for a real music track.
    const scale = [220, 261.6, 329.6, 392, 440, 523.3];
    const tick = () => {
      if (!this.ctx) return;
      const freq = scale[this.musicStep % scale.length];
      this.musicStep += (this.musicStep % 7) + 1;
      this.tone(freq, 0.9, 'sine', 0.16, this.musicGain);
      this.tone(freq / 2, 1.2, 'triangle', 0.08, this.musicGain);
    };
    tick();
    this.musicTimer = window.setInterval(tick, 600);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  // ---- synth primitives -------------------------------------------------

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType,
    gainValue: number,
    dest?: GainNode,
    delay = 0,
  ): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(gainValue, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(dest ?? this.sfxGain);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  private blip(freq: number, duration: number, type: OscillatorType, gainValue: number): void {
    this.tone(freq, duration, type, gainValue);
  }

  private arpeggio(
    freqs: number[],
    step: number,
    gainValue: number,
    type: OscillatorType = 'sine',
  ): void {
    freqs.forEach((freq, i) => this.tone(freq, step * 2.5, type, gainValue, undefined, i * step));
  }

  private thud(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.12);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  private startSpinLoop(): void {
    if (!this.ctx || this.spinLoop) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(70, this.ctx.currentTime);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    this.spinLoop = { osc, gain };
  }

  private fanfare(): void {
    const notes = [523, 523, 523, 659, 784, 1046];
    notes.forEach((freq, i) =>
      this.tone(freq, 0.35, 'square', 0.3, undefined, i * 0.14),
    );
    notes.forEach((freq, i) =>
      this.tone(freq * 1.5, 0.3, 'sine', 0.15, undefined, i * 0.14 + 0.05),
    );
  }
}

export const soundManager = new SoundManager();
