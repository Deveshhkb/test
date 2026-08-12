export type SoundName =
  | "cardDeal"
  | "cardFlip"
  | "chipPlace"
  | "buttonClick"
  | "win"
  | "lose"
  | "push"
  | "blackjack";

interface ToneOptions {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  delay?: number;
  /** Target frequency for a glide, giving the tone movement. */
  slideTo?: number;
}

/**
 * Synthesised audio.
 *
 * Sounds are generated with the Web Audio API instead of being loaded from
 * files, so the game has no audio dependencies and no download cost. The
 * manager is fully decoupled from the UI: components request a named sound and
 * never touch the audio graph. Playback is disabled until a user gesture, as
 * browsers require.
 */
export class AudioManager {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private enabledState: boolean;
  private unlocked = false;

  constructor(enabled = true) {
    this.enabledState = enabled;
  }

  get enabled(): boolean {
    return this.enabledState;
  }

  setEnabled(enabled: boolean): void {
    this.enabledState = enabled;
    if (this.master) this.master.gain.value = enabled ? 0.6 : 0;
  }

  /** Must be called from a user gesture before any sound can play. */
  unlock(): void {
    if (this.unlocked) return;
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = this.enabledState ? 0.6 : 0;
      this.master.connect(this.context.destination);
      this.unlocked = true;
    } catch {
      // Audio is optional; a failure here must never break gameplay.
      this.context = null;
    }
    void this.context?.resume();
  }

  play(name: SoundName): void {
    if (!this.enabledState || !this.context || !this.master) return;
    if (this.context.state === "suspended") void this.context.resume();

    switch (name) {
      case "cardDeal":
        this.noise(0.12, 2200, 0.35);
        break;
      case "cardFlip":
        this.noise(0.08, 3200, 0.28);
        this.tone({
          frequency: 520,
          duration: 0.06,
          volume: 0.12,
          type: "triangle",
        });
        break;
      case "chipPlace":
        this.tone({
          frequency: 1400,
          duration: 0.045,
          volume: 0.2,
          type: "square",
        });
        this.tone({
          frequency: 900,
          duration: 0.07,
          volume: 0.16,
          delay: 0.035,
        });
        this.noise(0.05, 5000, 0.18, 0.02);
        break;
      case "buttonClick":
        this.tone({
          frequency: 640,
          duration: 0.07,
          volume: 0.16,
          type: "triangle",
        });
        break;
      case "win":
        this.arpeggio([523.25, 659.25, 783.99], 0.11);
        break;
      case "blackjack":
        this.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.1, 0.22);
        break;
      case "lose":
        this.tone({
          frequency: 220,
          slideTo: 140,
          duration: 0.4,
          volume: 0.16,
          type: "sawtooth",
        });
        break;
      case "push":
        this.tone({
          frequency: 392,
          duration: 0.22,
          volume: 0.14,
          type: "triangle",
        });
        break;
    }
  }

  destroy(): void {
    void this.context?.close();
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
    this.unlocked = false;
  }

  private arpeggio(frequencies: number[], step: number, volume = 0.18): void {
    frequencies.forEach((frequency, index) => {
      this.tone({
        frequency,
        duration: step * 1.6,
        volume,
        type: "triangle",
        delay: index * step,
      });
    });
  }

  private tone(options: ToneOptions): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;

    const start = context.currentTime + (options.delay ?? 0);
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = options.type ?? "sine";
    oscillator.frequency.setValueAtTime(options.frequency, start);
    if (options.slideTo) {
      oscillator.frequency.exponentialRampToValueAtTime(
        options.slideTo,
        start + options.duration,
      );
    }

    const volume = options.volume ?? 0.2;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + options.duration);

    oscillator.connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(start + options.duration + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }

  /** Filtered white noise: the swish of a card and the clack of a chip. */
  private noise(
    duration: number,
    cutoff: number,
    volume: number,
    delay = 0,
  ): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;

    if (!this.noiseBuffer) {
      const length = Math.floor(context.sampleRate * 0.4);
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
    }

    const start = context.currentTime + delay;
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = cutoff;
    filter.Q.value = 0.8;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(filter).connect(gain).connect(master);
    source.start(start);
    source.stop(start + duration + 0.02);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
}
