import { Ticker } from 'pixi.js';

export type LoopCallback = (deltaSeconds: number, elapsedSeconds: number) => void;

/** Guard against huge deltas after a tab regains focus. */
const MAX_DELTA = 1 / 15;

/**
 * Thin wrapper over Pixi's ticker that hands out delta time in seconds and
 * tracks a smoothed frame rate. Nothing in the game reads raw frame counts, so
 * behaviour is identical at 30, 60 and 120 Hz.
 *
 * The reported frame rate is measured from the *unclamped* delta. Deriving it
 * from the clamped simulation step instead would floor the reading at 15 fps
 * and hide exactly the stalls the debug panel exists to surface.
 */
export class GameLoop {
  private readonly ticker: Ticker;
  private readonly callbacks: LoopCallback[] = [];
  private elapsed = 0;
  private smoothedFps = 60;
  private lastSimDelta = 0;
  private clamped = false;

  constructor(ticker: Ticker) {
    this.ticker = ticker;
    this.ticker.add(this.tick, this);
  }

  /** Smoothed real frame rate, independent of the simulation clamp. */
  get fps(): number {
    return this.smoothedFps;
  }

  /** Seconds of simulation advanced on the last frame. */
  get simDelta(): number {
    return this.lastSimDelta;
  }

  /** True when the last frame was slow enough to be clamped. */
  get isClamped(): boolean {
    return this.clamped;
  }

  get time(): number {
    return this.elapsed;
  }

  add(callback: LoopCallback): void {
    this.callbacks.push(callback);
  }

  private tick(): void {
    const rawDelta = this.ticker.deltaMS / 1000;
    const dt = Math.min(rawDelta, MAX_DELTA);
    this.clamped = rawDelta > MAX_DELTA;
    this.lastSimDelta = dt;
    this.elapsed += dt;
    if (rawDelta > 0) {
      this.smoothedFps += (1 / rawDelta - this.smoothedFps) * 0.08;
    }
    for (let i = 0; i < this.callbacks.length; i++) {
      this.callbacks[i](dt, this.elapsed);
    }
  }

  destroy(): void {
    this.ticker.remove(this.tick, this);
    this.callbacks.length = 0;
  }
}
