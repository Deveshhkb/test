import { AudioConfig, SoundId } from '../Types';
import { Logger } from '../Utilities/Logger';
import { clamp } from '../Utilities/Math';

interface LoopHandle {
  source: AudioBufferSourceNode | OscillatorNode;
  gain: GainNode;
  extra?: AudioNode[];
}

/**
 * Web Audio backed sound manager.
 *
 * Two design decisions worth calling out:
 *
 * 1. **Procedural fallback.** Every cue has a synthesised implementation, so
 *    the engine ships with a complete soundscape and zero audio assets. Drop
 *    real files into `audio.sources` and they take over per-cue - you can
 *    migrate one sound at a time instead of all-or-nothing.
 * 2. **Autoplay compliance.** Browsers start the context `suspended` until a
 *    user gesture. Rather than sprinkling `resume()` calls through the UI, we
 *    arm one-shot gesture listeners at construction and unlock on the first
 *    touch/click/key the player produces anywhere on the page.
 *
 * The graph is `source -> category gain -> master gain -> destination`, so
 * mute, master volume and per-category volume are all single-node changes
 * rather than a walk over live voices.
 */
export class AudioManager {
  private readonly log = Logger.create('AudioManager');

  private context?: AudioContext;
  private masterGain?: GainNode;
  private sfxGain?: GainNode;
  private musicGain?: GainNode;
  /** Shared noise buffer for ball/wheel textures - generated once. */
  private noiseBuffer?: AudioBuffer;

  private readonly buffers = new Map<SoundId, AudioBuffer>();
  private readonly loops = new Map<SoundId, LoopHandle>();
  private unlockListenersAttached = false;
  private destroyed = false;

  public constructor(private config: AudioConfig) {}

  /* --------------------------------------------------------------------- */
  /* Lifecycle                                                             */
  /* --------------------------------------------------------------------- */

  /**
   * Build the graph and kick off asset loading. Never throws: audio is a
   * non-essential subsystem and a blocked context must not stop a round.
   */
  public async init(): Promise<void> {
    if (!this.config.enabled || this.context) return;

    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        this.log.warn('Web Audio unavailable - running silent');
        return;
      }

      this.context = new Ctor();
      this.masterGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.musicGain = this.context.createGain();

      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.context.destination);
      this.applyVolumes();

      this.attachUnlockListeners();
      await this.loadSources();
    } catch (error) {
      this.log.warn('audio init failed - running silent', error);
    }
  }

  public updateConfig(config: AudioConfig): void {
    const sourcesChanged =
      JSON.stringify(config.sources) !== JSON.stringify(this.config.sources);
    this.config = config;
    this.applyVolumes();
    if (sourcesChanged) void this.loadSources();
  }

  public destroy(): void {
    this.destroyed = true;
    this.stopAllLoops();
    this.buffers.clear();
    this.detachUnlockListeners();
    void this.context?.close().catch(() => undefined);
    this.context = undefined;
  }

  /* --------------------------------------------------------------------- */
  /* Playback                                                              */
  /* --------------------------------------------------------------------- */

  /** Fire a one-shot cue. Silently no-ops when audio is off or unavailable. */
  public play(id: SoundId, volume = 1): void {
    if (!this.isActive()) return;

    const buffer = this.buffers.get(id);
    if (buffer) {
      this.playBuffer(buffer, volume, false);
      return;
    }
    this.synthesize(id, volume);
  }

  /**
   * Start a looping cue (wheel rumble, ball on the rim). Re-calling with the
   * same id is a no-op, so state handlers can be idempotent.
   */
  public playLoop(id: SoundId, volume = 1): void {
    if (!this.isActive() || this.loops.has(id)) return;

    const buffer = this.buffers.get(id);
    const handle = buffer
      ? this.playBuffer(buffer, volume, true)
      : this.synthesizeLoop(id, volume);

    if (handle) this.loops.set(id, handle);
  }

  /** Fade a loop out and release its nodes. */
  public stopLoop(id: SoundId, fadeSeconds = 0.35): void {
    const handle = this.loops.get(id);
    if (!handle || !this.context) return;
    this.loops.delete(id);

    const now = this.context.currentTime;
    handle.gain.gain.cancelScheduledValues(now);
    handle.gain.gain.setValueAtTime(handle.gain.gain.value, now);
    handle.gain.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);

    window.setTimeout(
      () => {
        try {
          handle.source.stop();
        } catch {
          /* already stopped - harmless */
        }
        handle.source.disconnect();
        handle.gain.disconnect();
        handle.extra?.forEach((node) => node.disconnect());
      },
      fadeSeconds * 1000 + 60,
    );
  }

  /** Ramp a live loop's gain - used to track ball speed as it decelerates. */
  public setLoopVolume(id: SoundId, volume: number, rampSeconds = 0.12): void {
    const handle = this.loops.get(id);
    if (!handle || !this.context) return;
    const now = this.context.currentTime;
    handle.gain.gain.cancelScheduledValues(now);
    handle.gain.gain.setValueAtTime(handle.gain.gain.value, now);
    handle.gain.gain.linearRampToValueAtTime(clamp(volume, 0, 1), now + rampSeconds);
  }

  /** Ramp a live loop's playback rate - the ball's pitch falls as it slows. */
  public setLoopRate(id: SoundId, rate: number, rampSeconds = 0.12): void {
    const handle = this.loops.get(id);
    if (!handle || !this.context) return;
    const now = this.context.currentTime;
    const source = handle.source;

    const param =
      source instanceof OscillatorNode
        ? source.frequency
        : (source as AudioBufferSourceNode).playbackRate;

    const value = source instanceof OscillatorNode ? rate * 220 : rate;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(Math.max(0.01, value), now + rampSeconds);
  }

  public stopAllLoops(fadeSeconds = 0.2): void {
    for (const id of [...this.loops.keys()]) this.stopLoop(id, fadeSeconds);
  }

  /* --------------------------------------------------------------------- */
  /* Mixer                                                                 */
  /* --------------------------------------------------------------------- */

  public setMuted(muted: boolean): void {
    this.config.muted = muted;
    this.applyVolumes();
  }

  public toggleMute(): boolean {
    this.setMuted(!this.config.muted);
    return this.config.muted;
  }

  public isMuted(): boolean {
    return this.config.muted;
  }

  public setMasterVolume(volume: number): void {
    this.config.masterVolume = clamp(volume, 0, 1);
    this.applyVolumes();
  }

  /** Fade the whole mix - used on pause/resume and scene transitions. */
  public fadeMaster(to: number, seconds: number): void {
    if (!this.masterGain || !this.context) return;
    const now = this.context.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(clamp(to, 0, 1), now + seconds);
  }

  public suspend(): void {
    if (this.context?.state === 'running') void this.context.suspend();
  }

  public resume(): void {
    if (this.context?.state === 'suspended') void this.context.resume();
  }

  private applyVolumes(): void {
    if (!this.masterGain || !this.sfxGain || !this.musicGain) return;
    const master = this.config.muted ? 0 : clamp(this.config.masterVolume, 0, 1);
    this.masterGain.gain.value = master;
    this.sfxGain.gain.value = clamp(this.config.sfxVolume, 0, 1);
    this.musicGain.gain.value = clamp(this.config.musicVolume, 0, 1);
  }

  private isActive(): boolean {
    return !this.destroyed && this.config.enabled && !!this.context && !!this.sfxGain;
  }

  /* --------------------------------------------------------------------- */
  /* Asset loading                                                         */
  /* --------------------------------------------------------------------- */

  private async loadSources(): Promise<void> {
    const context = this.context;
    if (!context) return;

    const entries = Object.entries(this.config.sources) as Array<[SoundId, string]>;
    await Promise.all(
      entries.map(async ([id, url]) => {
        if (!url) return;
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.arrayBuffer();
          this.buffers.set(id, await context.decodeAudioData(data));
        } catch (error) {
          // Falling back to synthesis is the whole point - warn, do not throw.
          this.log.warn(`sound "${id}" failed to load, using synthesis`, error);
        }
      }),
    );
  }

  private playBuffer(buffer: AudioBuffer, volume: number, loop: boolean): LoopHandle | undefined {
    if (!this.context || !this.sfxGain) return undefined;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const gain = this.context.createGain();
    gain.gain.value = clamp(volume, 0, 1);

    source.connect(gain).connect(this.sfxGain);
    source.start();

    if (!loop) source.onended = () => { source.disconnect(); gain.disconnect(); };
    return { source, gain };
  }

  /* --------------------------------------------------------------------- */
  /* Procedural synthesis                                                  */
  /* --------------------------------------------------------------------- */

  /**
   * White-noise buffer reused by every noise-based cue. Two seconds is long
   * enough to loop without an audible period and costs ~350KB of float data.
   */
  private getNoiseBuffer(): AudioBuffer | undefined {
    if (this.noiseBuffer) return this.noiseBuffer;
    if (!this.context) return undefined;

    const length = this.context.sampleRate * 2;
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;

    this.noiseBuffer = buffer;
    return buffer;
  }

  /** One-shot synthesised cues. */
  private synthesize(id: SoundId, volume: number): void {
    switch (id) {
      case SoundId.CHIP_PLACE:
        // Two very short clicks a few ms apart reads as a chip hitting felt.
        this.click(1800, 0.035, volume * 0.5);
        this.click(1200, 0.05, volume * 0.35, 0.02);
        break;
      case SoundId.CHIP_CLEAR:
        this.noiseBurst(0.18, 2400, volume * 0.35);
        break;
      case SoundId.BUTTON_CLICK:
        this.click(2400, 0.03, volume * 0.3);
        break;
      case SoundId.BET_CONFIRM:
        this.tone(660, 0.09, volume * 0.25, 'sine');
        this.tone(990, 0.12, volume * 0.2, 'sine', 0.06);
        break;
      case SoundId.COUNTDOWN_TICK:
        this.tone(880, 0.06, volume * 0.22, 'square');
        break;
      case SoundId.COUNTDOWN_URGENT:
        this.tone(1320, 0.08, volume * 0.3, 'square');
        break;
      case SoundId.NO_MORE_BETS:
        this.tone(330, 0.3, volume * 0.3, 'sawtooth');
        this.tone(220, 0.42, volume * 0.22, 'sawtooth', 0.08);
        break;
      case SoundId.BALL_DROP:
        // Descending thuds as the ball hits deflectors and frets.
        this.click(420, 0.08, volume * 0.5);
        this.click(320, 0.09, volume * 0.4, 0.11);
        this.click(240, 0.1, volume * 0.3, 0.2);
        break;
      case SoundId.WIN:
        this.arpeggio([523.25, 659.25, 783.99], 0.14, volume * 0.3);
        break;
      case SoundId.BIG_WIN:
        this.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.16, volume * 0.34);
        break;
      case SoundId.LOSE:
        this.tone(196, 0.28, volume * 0.2, 'sine');
        this.tone(147, 0.36, volume * 0.16, 'sine', 0.1);
        break;
      case SoundId.PAYOUT:
        // Rapid chip clatter.
        for (let i = 0; i < 6; i += 1) {
          this.click(1400 + Math.random() * 900, 0.03, volume * 0.22, i * 0.055);
        }
        break;
      default:
        this.tone(440, 0.1, volume * 0.2, 'sine');
    }
  }

  /** Looping synthesised beds. */
  private synthesizeLoop(id: SoundId, volume: number): LoopHandle | undefined {
    if (!this.context || !this.sfxGain) return undefined;

    switch (id) {
      case SoundId.WHEEL_SPIN:
        // Low, heavily filtered noise - the rumble of a spinning wheel head.
        return this.noiseLoop(volume * 0.16, 220, 'lowpass', 0.9);
      case SoundId.BALL_ROLL:
        // Narrow band-passed noise - the ball hissing round the rim. Its centre
        // frequency is driven by `setLoopRate` as the ball loses speed.
        return this.noiseLoop(volume * 0.3, 2600, 'bandpass', 6);
      default:
        return undefined;
    }
  }

  private noiseLoop(
    volume: number,
    frequency: number,
    type: BiquadFilterType,
    q: number,
  ): LoopHandle | undefined {
    const buffer = this.getNoiseBuffer();
    if (!this.context || !this.sfxGain || !buffer) return undefined;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;

    const gain = this.context.createGain();
    gain.gain.value = 0;

    source.connect(filter).connect(gain).connect(this.sfxGain);
    source.start();

    // Fade in so the bed never starts with a click.
    const now = this.context.currentTime;
    gain.gain.linearRampToValueAtTime(clamp(volume, 0, 1), now + 0.25);

    return { source, gain, extra: [filter] };
  }

  private tone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
    delay = 0,
  ): void {
    if (!this.context || !this.sfxGain) return;
    const start = this.context.currentTime + delay;

    const oscillator = this.context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.value = frequency;

    const gain = this.context.createGain();
    // Percussive envelope: instant attack, exponential decay. Exponential ramps
    // cannot reach zero, hence the 0.0001 floor.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain).connect(this.sfxGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  private click(frequency: number, duration: number, volume: number, delay = 0): void {
    if (!this.context || !this.sfxGain) return;
    const start = this.context.currentTime + delay;

    const oscillator = this.context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, start);
    // The downward pitch sweep is what turns a beep into a "tick".
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.4, start + duration);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(Math.max(0.0001, volume), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain).connect(this.sfxGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  private noiseBurst(duration: number, frequency: number, volume: number): void {
    const buffer = this.getNoiseBuffer();
    if (!this.context || !this.sfxGain || !buffer) return;

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = frequency;

    const gain = this.context.createGain();
    const now = this.context.currentTime;
    gain.gain.setValueAtTime(Math.max(0.0001, volume), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter).connect(gain).connect(this.sfxGain);
    source.start(now);
    source.stop(now + duration + 0.02);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  private arpeggio(frequencies: number[], step: number, volume: number): void {
    frequencies.forEach((frequency, index) => {
      this.tone(frequency, step * 1.9, volume, 'triangle', index * step);
    });
  }

  /* --------------------------------------------------------------------- */
  /* Autoplay unlock                                                       */
  /* --------------------------------------------------------------------- */

  private attachUnlockListeners(): void {
    if (this.unlockListenersAttached || typeof window === 'undefined') return;
    this.unlockListenersAttached = true;
    window.addEventListener('pointerdown', this.unlock, { passive: true });
    window.addEventListener('touchstart', this.unlock, { passive: true });
    window.addEventListener('keydown', this.unlock);
  }

  private detachUnlockListeners(): void {
    if (!this.unlockListenersAttached) return;
    this.unlockListenersAttached = false;
    window.removeEventListener('pointerdown', this.unlock);
    window.removeEventListener('touchstart', this.unlock);
    window.removeEventListener('keydown', this.unlock);
  }

  private readonly unlock = (): void => {
    if (this.context?.state === 'suspended') void this.context.resume();
    this.detachUnlockListeners();
  };
}
