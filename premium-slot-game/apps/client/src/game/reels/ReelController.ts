import gsap from 'gsap';
import type { Grid, SymbolId } from '@neon/game-math';
import { NORMAL_TIMING, TURBO_TIMING, type Timing, wait } from '../core/constants';
import type { AudioManager } from '../audio/AudioManager';
import type { SymbolAnimator } from '../symbols/SymbolAnimator';
import type { ReelManager } from './ReelManager';

/**
 * High-level reel choreography: start, sequential stop with anticipation, landing bounce
 * and slam/quick stop. The final grid always comes from the server.
 */
export class ReelController {
  timing: Timing = NORMAL_TIMING;
  private spinStartedAt = 0;
  private quickStopRequested = false;
  private stopping = false;

  constructor(
    private readonly manager: ReelManager,
    private readonly audio: AudioManager,
    private readonly symbols: SymbolAnimator,
  ) {}

  setTurbo(turbo: boolean) {
    this.timing = turbo ? TURBO_TIMING : NORMAL_TIMING;
  }

  get isSpinning() {
    return this.manager.reels.some((r) => r.state === 'spinning' || r.state === 'stopping');
  }

  spinSingleReel(index: number, delayMs = 0) {
    this.manager.reels[index].spin(this.timing.maxSpeed, this.timing.accelDuration, delayMs / 1000);
  }

  spinAllReels() {
    this.quickStopRequested = false;
    this.spinStartedAt = performance.now();
    this.symbols.clearIdle();
    this.manager.reels.forEach((_, i) => this.spinSingleReel(i, i * this.timing.spinStagger));
    this.audio.play('reelSpin');
  }

  async stopSingleReel(index: number, symbols: SymbolId[]) {
    const t = this.quickStopRequested ? { ...this.timing, decelDuration: 0.16, bounce: 0.12 } : this.timing;
    await this.manager.reels[index].stop(symbols, t.decelDuration, t.bounce);
    this.playLandingBounce(index);
    this.audio.play('reelStop', { rate: 0.95 + index * 0.03 });
    this.symbols.onReelLanded(this.manager.reels[index].visibleViews());
  }

  /** Requests the remaining reels to stop as fast as possible (player slam). */
  quickStop() {
    if (this.isSpinning) this.quickStopRequested = true;
  }

  /** Small squash on the landed reel's symbols. */
  playLandingBounce(index: number) {
    const views = this.manager.reels[index].visibleViews();
    views.forEach((v) => {
      gsap.fromTo(v.scale, { y: 0.92, x: 1.04 }, { y: 1, x: 1, duration: 0.22, ease: 'back.out(3)' });
    });
  }

  /** Builds suspense on a reel when a feature is close (2+ scatters/bonus landed). */
  async playReelAnticipation(index: number, durationMs: number) {
    const glow = this.manager.frame.anticipation[index];
    this.audio.play('anticipation');
    const tl = gsap.timeline();
    tl.to(glow, { alpha: 0.9, duration: 0.2 }).to(glow, { alpha: 0.5, duration: 0.3, yoyo: true, repeat: -1 });
    const reel = this.manager.reels[index];
    const shake = gsap.to(reel.container, { x: reel.container.x + 3, duration: 0.05, yoyo: true, repeat: -1 });
    await wait(this.quickStopRequested ? 0 : durationMs);
    shake.kill();
    reel.container.x = index * 168;
    tl.kill();
    gsap.to(glow, { alpha: 0, duration: 0.3 });
  }

  /** Stops reels left to right on the server grid; anticipation on remaining reels when a feature is near. */
  async stopAllReels(grid: Grid) {
    if (this.stopping) return;
    this.stopping = true;
    const elapsed = performance.now() - this.spinStartedAt;
    if (!this.quickStopRequested && elapsed < this.timing.minSpinTime) await wait(this.timing.minSpinTime - elapsed);
    let scatters = 0;
    let bonuses = 0;
    const landed: Promise<void>[] = [];
    for (let i = 0; i < grid.length; i++) {
      const anticipate = (scatters >= 2 || bonuses >= 2) && !this.quickStopRequested;
      if (anticipate) {
        await Promise.all(landed);
        await this.playReelAnticipation(i, this.timing.anticipation);
      } else if (i > 0 && !this.quickStopRequested) await wait(this.timing.stopDelay);
      landed.push(this.stopSingleReel(i, grid[i]));
      scatters += grid[i].filter((s) => s === 'SCATTER').length;
      bonuses += grid[i].filter((s) => s === 'BONUS').length;
    }
    await Promise.all(landed);
    this.audio.stop('reelSpin');
    this.stopping = false;
    this.quickStopRequested = false;
  }
}
