import type { GameConfig } from "../Config";
import { Logger } from "../utils/Logger";
import { clamp } from "../utils/MathUtils";

/** Every sound the engine can request. Unknown keys are silently ignored. */
export enum Sfx {
  CardDeal = "card_deal",
  CardFlip = "card_flip",
  CardSlide = "card_slide",
  Shuffle = "shuffle",
  ChipPlace = "chip_place",
  ChipStack = "chip_stack",
  ChipClear = "chip_clear",
  ChipCollect = "chip_collect",
  Button = "button",
  BettingOpen = "betting_open",
  BettingClosed = "betting_closed",
  CountdownTick = "countdown_tick",
  CountdownFinal = "countdown_final",
  Win = "win",
  BigWin = "big_win",
  Lose = "lose",
  Push = "push",
  Music = "music",
}

interface PlayOptions {
  readonly volume?: number;
  readonly rate?: number;
  readonly loop?: boolean;
}

/**
 * Web Audio backend with a synthesised fallback.
 *
 * Real projects drop MP3s into `config.assets.sounds`; until they do, every
 * cue is generated from oscillators and filtered noise so the game ships with
 * complete audio feedback and no binary payload. Both paths share the same
 * bus, so mute, volume and fades behave identically either way.
 */
export class AudioManager {
  private readonly log = Logger.create("audio");
  private config: GameConfig;

  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private readonly buffers = new Map<string, AudioBuffer>();
  private musicSource: AudioBufferSourceNode | null = null;
  private unlocked = false;
  private muted: boolean;

  constructor(config: GameConfig) {
    this.config = config;
    this.muted = config.audio.muted;
  }

  updateConfig(config: GameConfig): void {
    this.config = config;
    this.applyVolumes();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /* ---------------------------------------------------------------- *
   * Lifecycle
   * ---------------------------------------------------------------- */

  /**
   * Browsers refuse to start audio before a gesture, so the graph is built on
   * the first tap rather than at boot. Safe to call repeatedly.
   */
  unlock(): void {
    if (!this.config.audio.enabled || this.unlocked) return;

    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        this.log.warn("Web Audio unavailable; running silent");
        return;
      }

      const context = new Ctor();
      this.context = context;
      this.masterGain = context.createGain();
      this.musicGain = context.createGain();
      this.sfxGain = context.createGain();
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(context.destination);
      this.applyVolumes();
      this.unlocked = true;

      void context.resume();
      void this.loadConfiguredSounds();
    } catch (error) {
      this.log.error("audio init failed", error);
    }
  }

  private async loadConfiguredSounds(): Promise<void> {
    const context = this.context;
    const entries = Object.entries(this.config.assets.sounds);
    if (!context || entries.length === 0) return;

    await Promise.allSettled(
      entries.map(async ([key, path]) => {
        const url = /^(https?:)?\/\/|^\//.test(path)
          ? path
          : `${this.config.audio.basePath.replace(/\/$/, "")}/${path}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${response.status} ${url}`);
        const bytes = await response.arrayBuffer();
        this.buffers.set(key, await context.decodeAudioData(bytes));
      }),
    );
    this.log.info(`decoded ${this.buffers.size} sound files`);
  }

  private applyVolumes(): void {
    const { masterVolume, musicVolume, sfxVolume } = this.config.audio;
    const master = this.muted ? 0 : clamp(masterVolume, 0, 1);
    this.masterGain?.gain.setTargetAtTime(master, this.now, 0.02);
    this.musicGain?.gain.setTargetAtTime(clamp(musicVolume, 0, 1), this.now, 0.02);
    this.sfxGain?.gain.setTargetAtTime(clamp(sfxVolume, 0, 1), this.now, 0.02);
  }

  private get now(): number {
    return this.context?.currentTime ?? 0;
  }

  /* ---------------------------------------------------------------- *
   * Controls
   * ---------------------------------------------------------------- */

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyVolumes();
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setVolume(kind: "master" | "music" | "sfx", value: number): void {
    const audio = { ...this.config.audio };
    if (kind === "master") audio.masterVolume = clamp(value, 0, 1);
    if (kind === "music") audio.musicVolume = clamp(value, 0, 1);
    if (kind === "sfx") audio.sfxVolume = clamp(value, 0, 1);
    this.config = { ...this.config, audio };
    this.applyVolumes();
  }

  /** Smoothly rides the master bus — used when the game pauses. */
  fadeTo(target: number, seconds = this.config.audio.fadeDuration): void {
    if (!this.masterGain || !this.context) return;
    const gain = this.masterGain.gain;
    gain.cancelScheduledValues(this.now);
    gain.setValueAtTime(gain.value, this.now);
    gain.linearRampToValueAtTime(this.muted ? 0 : clamp(target, 0, 1), this.now + seconds);
  }

  pause(): void {
    this.fadeTo(0, 0.2);
    void this.context?.suspend();
  }

  resume(): void {
    void this.context?.resume();
    this.fadeTo(this.config.audio.masterVolume, 0.25);
  }

  /* ---------------------------------------------------------------- *
   * Playback
   * ---------------------------------------------------------------- */

  play(key: Sfx | string, options: PlayOptions = {}): void {
    if (!this.config.audio.enabled || this.muted || !this.context) return;

    const buffer = this.buffers.get(key);
    if (buffer) {
      // `key` may be a raw string from `config.assets.sounds`, so compare
      // against the enum's value rather than the enum member.
      this.playBuffer(buffer, options, key === (Sfx.Music as string));
      return;
    }
    this.synthesise(key as Sfx, options);
  }

  private playBuffer(buffer: AudioBuffer, options: PlayOptions, isMusic: boolean): void {
    const context = this.context;
    const bus = isMusic ? this.musicGain : this.sfxGain;
    if (!context || !bus) return;

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = options.loop ?? isMusic;
    source.playbackRate.value = options.rate ?? 1;

    const gain = context.createGain();
    gain.gain.value = options.volume ?? 1;
    source.connect(gain).connect(bus);
    source.start();

    if (isMusic) {
      this.musicSource?.stop();
      this.musicSource = source;
    }
  }

  stopMusic(seconds = this.config.audio.fadeDuration): void {
    const source = this.musicSource;
    if (!source || !this.musicGain) return;
    const gain = this.musicGain.gain;
    gain.cancelScheduledValues(this.now);
    gain.linearRampToValueAtTime(0, this.now + seconds);
    setTimeout(() => source.stop(), seconds * 1000 + 40);
    this.musicSource = null;
  }

  /* ---------------------------------------------------------------- *
   * Synthesis fallback
   * ---------------------------------------------------------------- */

  private synthesise(key: Sfx, options: PlayOptions): void {
    const volume = options.volume ?? 1;
    switch (key) {
      case Sfx.CardDeal:
      case Sfx.CardSlide:
        this.noiseSwish(0.12, 2400, 900, volume * 0.5);
        break;
      case Sfx.CardFlip:
        this.noiseSwish(0.08, 3800, 1400, volume * 0.55);
        this.blip(520, 0.05, volume * 0.15, "triangle");
        break;
      case Sfx.Shuffle:
        for (let i = 0; i < 7; i++) {
          this.noiseSwish(0.07, 3000, 1000, volume * 0.28, i * 0.075);
        }
        break;
      case Sfx.ChipPlace:
        this.chipClick(volume);
        break;
      case Sfx.ChipStack:
        this.chipClick(volume * 0.75, 0.02);
        this.chipClick(volume * 0.55, 0.07);
        break;
      case Sfx.ChipClear:
      case Sfx.ChipCollect:
        for (let i = 0; i < 4; i++) this.chipClick(volume * 0.45, i * 0.045);
        break;
      case Sfx.Button:
        this.blip(760, 0.05, volume * 0.22, "square");
        break;
      case Sfx.BettingOpen:
        this.arpeggio([523.25, 659.25], 0.12, volume * 0.25);
        break;
      case Sfx.BettingClosed:
        this.arpeggio([392.0, 293.66], 0.16, volume * 0.28);
        break;
      case Sfx.CountdownTick:
        this.blip(880, 0.04, volume * 0.18, "sine");
        break;
      case Sfx.CountdownFinal:
        this.blip(1320, 0.09, volume * 0.3, "sine");
        break;
      case Sfx.Win:
        this.arpeggio([523.25, 659.25, 783.99], 0.13, volume * 0.32);
        break;
      case Sfx.BigWin:
        this.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.11, volume * 0.34);
        break;
      case Sfx.Lose:
        this.arpeggio([349.23, 261.63], 0.22, volume * 0.24, "sine");
        break;
      case Sfx.Push:
        this.blip(440, 0.16, volume * 0.2, "sine");
        break;
      default:
        break;
    }
  }

  /** Short filtered-noise burst — the basis of every card and chip sound. */
  private noiseSwish(
    duration: number,
    startHz: number,
    endHz: number,
    volume: number,
    delay = 0,
  ): void {
    const context = this.context;
    const bus = this.sfxGain;
    if (!context || !bus) return;

    const frames = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      // Decaying white noise; the envelope is baked in to save a node.
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 2;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;

    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.9;
    const at = this.now + delay;
    filter.frequency.setValueAtTime(startHz, at);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, endHz), at + duration);

    const gain = context.createGain();
    gain.gain.value = volume;

    source.connect(filter).connect(gain).connect(bus);
    source.start(at);
    source.stop(at + duration + 0.02);
  }

  private chipClick(volume: number, delay = 0): void {
    this.noiseSwish(0.045, 5200, 2200, volume * 0.6, delay);
    this.blip(180, 0.06, volume * 0.18, "sine", delay);
  }

  private blip(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine",
    delay = 0,
  ): void {
    const context = this.context;
    const bus = this.sfxGain;
    if (!context || !bus) return;

    const at = this.now + delay;
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, at);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    osc.connect(gain).connect(bus);
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }

  private arpeggio(
    notes: readonly number[],
    step: number,
    volume: number,
    type: OscillatorType = "triangle",
  ): void {
    notes.forEach((note, index) => {
      this.blip(note, step * 1.6, volume, type, index * step);
    });
  }

  /* ---------------------------------------------------------------- *
   * Teardown
   * ---------------------------------------------------------------- */

  destroy(): void {
    this.stopMusic(0.05);
    this.buffers.clear();
    const context = this.context;
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.unlocked = false;
    void context?.close().catch(() => undefined);
  }
}
