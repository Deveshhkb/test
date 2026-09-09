/** Every sound the machine can make. */
export type SoundId =
  | 'spinUp'
  | 'drumLoop'
  | 'ballRelease'
  | 'ballSeat'
  | 'armSwing'
  | 'reveal';

interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

/**
 * Audio front end.
 *
 * The reference recording carries a silent track, so no cues could be
 * transcribed and no clips ship with the project. What ships instead is the
 * full plumbing: register a buffer against a `SoundId` and every call site
 * below starts working, with no changes to game code.
 *
 * The context is created lazily on the first user gesture, because browsers
 * refuse to start one before that.
 */
export class AudioSystem {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly buffers = new Map<SoundId, AudioBuffer>();
  private readonly loops = new Map<SoundId, Voice>();

  private volume = 0.7;
  private muted = false;

  /** Safe to call on every gesture; only the first one does anything. */
  unlock(): void {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    this.context = new Ctor();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.context.destination);
  }

  async register(id: SoundId, url: string): Promise<void> {
    this.unlock();
    if (!this.context) return;
    const response = await fetch(url);
    const bytes = await response.arrayBuffer();
    this.buffers.set(id, await this.context.decodeAudioData(bytes));
  }

  registerBuffer(id: SoundId, buffer: AudioBuffer): void {
    this.buffers.set(id, buffer);
  }

  /** No-op until a buffer is registered for `id`, so call sites stay honest. */
  play(id: SoundId, { volume = 1, rate = 1 }: { volume?: number; rate?: number } = {}): void {
    const buffer = this.buffers.get(id);
    if (!this.context || !this.master || !buffer) return;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = this.context.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(this.master);
    source.start();
  }

  startLoop(id: SoundId, volume = 1): void {
    const buffer = this.buffers.get(id);
    if (!this.context || !this.master || !buffer || this.loops.has(id)) return;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = this.context.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(this.master);
    source.start();
    this.loops.set(id, { source, gain });
  }

  /** Retunes a running loop, e.g. drum pitch tracking spin speed. */
  setLoopRate(id: SoundId, rate: number): void {
    const voice = this.loops.get(id);
    if (voice) voice.source.playbackRate.value = rate;
  }

  stopLoop(id: SoundId): void {
    const voice = this.loops.get(id);
    if (!voice) return;
    voice.source.stop();
    voice.source.disconnect();
    voice.gain.disconnect();
    this.loops.delete(id);
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : this.volume;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  destroy(): void {
    for (const id of [...this.loops.keys()]) this.stopLoop(id);
    this.buffers.clear();
    void this.context?.close();
    this.context = null;
    this.master = null;
  }
}
