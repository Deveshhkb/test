import { Rng } from '../utils/random';

/**
 * Short positional kick used when the winning ball seats into its cup. Kept
 * deliberately small - the reference camera is locked off, so this only reads
 * as a mechanical thunk rather than an effect.
 */
export class ScreenShake {
  offsetX = 0;
  offsetY = 0;

  private amplitude = 0;
  private decay = 1;
  private readonly rng = new Rng(0x5eed);

  kick(amplitude: number, duration: number): void {
    this.amplitude = Math.max(this.amplitude, amplitude);
    this.decay = amplitude / Math.max(duration, 0.001);
  }

  update(dt: number): void {
    if (this.amplitude <= 0) {
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }
    this.amplitude = Math.max(0, this.amplitude - this.decay * dt);
    this.offsetX = this.rng.range(-1, 1) * this.amplitude;
    this.offsetY = this.rng.range(-1, 1) * this.amplitude;
  }

  reset(): void {
    this.amplitude = 0;
    this.offsetX = 0;
    this.offsetY = 0;
  }
}
