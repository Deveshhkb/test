import { Ticker } from 'pixi.js';

export type LoopCallback = (deltaSeconds: number, elapsedSeconds: number) => void;

/** Guard against huge deltas after a tab regains focus. */
const MAX_DELTA = 1 / 15;

/**
 * Thin wrapper over Pixi's ticker that hands out delta time in seconds and
 * tracks a smoothed frame rate. Nothing in the game reads raw frame counts, so
 * behaviour is identical at 30, 60 and 120 Hz.
 */
export class GameLoop {
  private readonly ticker: Ticker;
  private readonly callbacks: LoopCallback[] = [];
  private elapsed = 0;
  private smoothedFps = 60;

  constructor(ticker: Ticker) {
    this.ticker = ticker;
    this.ticker.add(this.tick, this);
  }

  get fps(): number {
    return this.smoothedFps;
  }

  get time(): number {
    return this.elapsed;
  }

  add(callback: LoopCallback): void {
    this.callbacks.push(callback);
  }

  private tick(): void {
    const dt = Math.min(this.ticker.deltaMS / 1000, MAX_DELTA);
    this.elapsed += dt;
    if (dt > 0) {
      this.smoothedFps += (1 / dt - this.smoothedFps) * 0.08;
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
