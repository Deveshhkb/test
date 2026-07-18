import { Container, Graphics, Text, TextStyle, Ticker } from 'pixi.js';
import gsap from 'gsap';
import type { Cell, Grid, SpinFeatures } from '@/types';
import { ReelManager } from '@/reels/ReelManager';
import { ParticleSystem } from '@/effects/ParticleSystem';
import { PARTICLE_PRESETS } from '@/effects/particlePresets';
import { WinPresentation } from '@/effects/WinPresentation';
import { BigWinOverlay } from '@/effects/BigWinOverlay';
import { animations } from '@/animations/AnimationManager';
import { soundManager } from '@/services/SoundManager';
import { eventBus } from '@/services/EventBus';
import { formatCredits } from '@/utils/format';
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  REEL_AREA_HEIGHT,
  REEL_AREA_WIDTH,
  REEL_WIDTH,
  ROW_COUNT,
  SYMBOL_SIZE,
} from '@/constants';

const REEL_X = (DESIGN_WIDTH - REEL_AREA_WIDTH) / 2;
const REEL_Y = 118;

/**
 * Main game scene: background, reel window, win effects, free-spins
 * theming and the big-win overlay. The `camera` container is the target
 * for zoom (free spins) and shake (mega wins).
 */
export class GameScene {
  readonly container = new Container();
  readonly camera = new Container();
  readonly reelManager = new ReelManager();
  readonly particles = new ParticleSystem();
  readonly winPresentation = new WinPresentation();
  readonly bigWin = new BigWinOverlay();

  private freeSpinsDim = new Graphics();
  private freeSpinsBanner = new Container();
  private freeSpinsText!: Text;
  private freeSpinsWinText!: Text;
  private background = new Container();
  private offShake: (() => void) | null = null;
  private ambientTimer: number | null = null;

  init(ticker: Ticker): void {
    this.buildBackground();
    this.container.addChild(this.background);

    // Dim layer that darkens the world during free spins.
    this.freeSpinsDim
      .rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT)
      .fill({ color: 0x090314, alpha: 0.55 });
    this.freeSpinsDim.visible = false;
    this.container.addChild(this.freeSpinsDim);

    this.container.addChild(this.camera);
    this.camera.pivot.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);
    this.camera.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);

    // Reel window frame.
    const frame = new Graphics()
      .roundRect(REEL_X - 16, REEL_Y - 16, REEL_AREA_WIDTH + 32, REEL_AREA_HEIGHT + 32, 20)
      .fill({ color: 0x120b26 })
      .stroke({ color: 0xffc93c, width: 4 });
    // Row separators for a machine feel.
    for (let i = 1; i < ROW_COUNT; i++) {
      frame
        .moveTo(REEL_X - 6, REEL_Y + i * SYMBOL_SIZE)
        .lineTo(REEL_X + REEL_AREA_WIDTH + 6, REEL_Y + i * SYMBOL_SIZE)
        .stroke({ color: 0x2a1a4d, width: 1, alpha: 0.6 });
    }
    this.camera.addChild(frame);

    this.reelManager.init(ticker);
    this.reelManager.container.position.set(REEL_X, REEL_Y);
    this.camera.addChild(this.reelManager.container);
    this.reelManager.overlayContainer.position.set(REEL_X, REEL_Y);
    this.camera.addChild(this.reelManager.overlayContainer);

    this.winPresentation.container.position.set(REEL_X, REEL_Y);
    this.camera.addChild(this.winPresentation.container);

    this.buildFreeSpinsBanner();
    this.container.addChild(this.freeSpinsBanner);

    this.particles.init(ticker);
    this.container.addChild(this.particles.container);

    this.container.addChild(this.bigWin.container);

    this.offShake = eventBus.on('shake', (intensity) => {
      animations.shake(this.camera, intensity, 0.7);
    });

    // Ambient atmosphere: soft sparkles drifting up around the machine.
    this.ambientTimer = window.setInterval(() => {
      this.particles.emit({
        texture: 'star',
        count: 2,
        x: Math.random() * DESIGN_WIDTH,
        y: DESIGN_HEIGHT * (0.55 + Math.random() * 0.45),
        angle: -Math.PI / 2,
        spread: Math.PI * 0.4,
        speedMin: 12,
        speedMax: 45,
        lifeMin: 2.5,
        lifeMax: 4.5,
        scaleMin: 0.12,
        scaleMax: 0.3,
        scaleEnd: 0,
        alphaEnd: 0,
        rotation: true,
      });
    }, 900);
  }

  private buildBackground(): void {
    // Layered night-sky gradient with glow spots — cheap and GPU friendly.
    const g = new Graphics();
    g.rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).fill({ color: 0x0b0716 });
    g.ellipse(DESIGN_WIDTH / 2, -140, 900, 420).fill({ color: 0x241146, alpha: 0.8 });
    g.ellipse(DESIGN_WIDTH / 2, DESIGN_HEIGHT + 200, 1000, 460).fill({
      color: 0x3d0a33,
      alpha: 0.5,
    });
    g.ellipse(120, 180, 220, 160).fill({ color: 0x1e0a3d, alpha: 0.6 });
    g.ellipse(DESIGN_WIDTH - 120, 200, 240, 170).fill({ color: 0x1e0a3d, alpha: 0.6 });
    this.background.addChild(g);

    const title = new Text({
      text: 'ROYAL FORTUNE',
      style: new TextStyle({
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontWeight: '900',
        fontSize: 44,
        fill: 0xffc93c,
        stroke: { color: 0x2a1a00, width: 6 },
        dropShadow: { color: 0xffc93c, blur: 16, distance: 0, alpha: 0.4 },
        letterSpacing: 8,
      }),
    });
    title.anchor.set(0.5, 0);
    title.position.set(DESIGN_WIDTH / 2, 26);
    this.background.addChild(title);

    // Gentle breathing glow on the logo.
    animations.to(title.scale, {
      x: 1.03,
      y: 1.03,
      duration: 2.2,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });
  }

  private buildFreeSpinsBanner(): void {
    const bg = new Graphics()
      .roundRect(-230, -30, 460, 60, 30)
      .fill({ color: 0x3d0a33, alpha: 0.92 })
      .stroke({ color: 0xff6ec7, width: 3 });
    this.freeSpinsBanner.addChild(bg);

    this.freeSpinsText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontWeight: '900',
        fontSize: 24,
        fill: 0xffd7ef,
      }),
    });
    this.freeSpinsText.anchor.set(0.5);
    this.freeSpinsText.y = -8;
    this.freeSpinsBanner.addChild(this.freeSpinsText);

    this.freeSpinsWinText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        fontSize: 16,
        fill: 0xffe066,
      }),
    });
    this.freeSpinsWinText.anchor.set(0.5);
    this.freeSpinsWinText.y = 16;
    this.freeSpinsBanner.addChild(this.freeSpinsWinText);

    this.freeSpinsBanner.position.set(DESIGN_WIDTH / 2, 84);
    this.freeSpinsBanner.visible = false;
  }

  // ---- free spins theming ----------------------------------------------

  async enterFreeSpins(spins: number): Promise<void> {
    soundManager.play('freeSpin');
    soundManager.stopMusic();
    soundManager.startMusic();

    // Intro banner splash.
    const splash = new Text({
      text: `${spins} FREE SPINS!`,
      style: new TextStyle({
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontWeight: '900',
        fontSize: 84,
        fill: 0xff6ec7,
        stroke: { color: 0x2a0522, width: 10 },
        dropShadow: { color: 0xff6ec7, blur: 26, distance: 0, alpha: 0.8 },
      }),
    });
    splash.anchor.set(0.5);
    splash.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);
    this.container.addChild(splash);

    this.freeSpinsDim.visible = true;
    this.freeSpinsDim.alpha = 0;
    animations.to(this.freeSpinsDim, { alpha: 1, duration: 0.5 });
    // Camera zoom-in for the feature.
    animations.to(this.camera.scale, { x: 1.05, y: 1.05, duration: 0.8, ease: 'sine.inOut' });

    animations.bounceIn(splash, 0.7);
    this.particles.emit({
      ...PARTICLE_PRESETS.magic,
      count: 60,
      x: DESIGN_WIDTH / 2,
      y: DESIGN_HEIGHT / 2,
    });
    await animations.delay(2.0);
    await new Promise<void>((r) =>
      animations.to(splash, { alpha: 0, duration: 0.3, onComplete: () => r() }),
    );
    splash.destroy();

    this.freeSpinsBanner.visible = true;
    animations.popIn(this.freeSpinsBanner);
  }

  updateFreeSpins(remaining: number, totalWin: number): void {
    this.freeSpinsText.text = `FREE SPINS LEFT: ${remaining}`;
    this.freeSpinsWinText.text = `TOTAL WIN ${formatCredits(totalWin)}  •  x2 MULTIPLIER`;
  }

  async exitFreeSpins(totalWin: number): Promise<void> {
    const splash = new Text({
      text: `FREE SPINS COMPLETE\n+${formatCredits(totalWin)}`,
      style: new TextStyle({
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontWeight: '900',
        fontSize: 56,
        fill: 0xffe066,
        stroke: { color: 0x2a1a00, width: 8 },
        align: 'center',
        dropShadow: { color: 0xffc93c, blur: 20, distance: 0, alpha: 0.7 },
      }),
    });
    splash.anchor.set(0.5);
    splash.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);
    this.container.addChild(splash);
    animations.bounceIn(splash, 0.6);
    this.particles.emit({
      ...PARTICLE_PRESETS.coinBurst,
      x: DESIGN_WIDTH / 2,
      y: DESIGN_HEIGHT / 2 + 60,
    });
    await animations.delay(2.2);
    await new Promise<void>((r) =>
      animations.to(splash, { alpha: 0, duration: 0.3, onComplete: () => r() }),
    );
    splash.destroy();

    // Restore base-game presentation.
    animations.to(this.camera.scale, { x: 1, y: 1, duration: 0.6, ease: 'sine.inOut' });
    await new Promise<void>((r) =>
      animations.to(this.freeSpinsDim, {
        alpha: 0,
        duration: 0.5,
        onComplete: () => {
          this.freeSpinsDim.visible = false;
          r();
        },
      }),
    );
    animations.popOut(this.freeSpinsBanner).eventCallback('onComplete', () => {
      this.freeSpinsBanner.visible = false;
      this.freeSpinsBanner.alpha = 1;
      this.freeSpinsBanner.scale.set(1);
    });
    soundManager.stopMusic();
    soundManager.startMusic();
  }

  // ---- feature callouts -------------------------------------------------

  private cellGlobal(reel: number, row: number): { x: number; y: number } {
    return {
      x: REEL_X + reel * REEL_WIDTH + SYMBOL_SIZE / 2,
      y: REEL_Y + row * SYMBOL_SIZE + SYMBOL_SIZE / 2,
    };
  }

  /** Mystery symbols spin-flash then reveal their final identity. */
  async revealMystery(features: SpinFeatures, finalGrid: Grid): Promise<void> {
    if (features.mysteryTransforms.length === 0) return;
    soundManager.play('scatter');
    for (const { position } of features.mysteryTransforms) {
      const [reel, row] = position;
      const symbol = this.reelManager.reelAt(reel).symbolAt(row);
      animations.flash(symbol, 4);
      const { x, y } = this.cellGlobal(reel, row);
      this.particles.emit({ ...PARTICLE_PRESETS.magic, x, y });
    }
    await animations.delay(0.7);
    this.reelManager.setGrid(finalGrid);
    for (const { position } of features.mysteryTransforms) {
      const [reel, row] = position;
      animations.winPulse(this.reelManager.reelAt(reel).symbolAt(row));
    }
    await animations.delay(0.4);
  }

  /** Wilds dropped by the random wild feature crash onto the grid. */
  async dropRandomWilds(cells: Cell[], finalGrid: Grid): Promise<void> {
    if (cells.length === 0) return;
    soundManager.play('wild');
    this.reelManager.setGrid(finalGrid);
    for (const [reel, row] of cells) {
      const symbol = this.reelManager.reelAt(reel).symbolAt(row);
      gsap.fromTo(
        symbol.scale,
        { x: 2.2, y: 2.2 },
        { x: 1, y: 1, duration: 0.45, ease: 'bounce.out' },
      );
      const { x, y } = this.cellGlobal(reel, row);
      this.particles.emit({ ...PARTICLE_PRESETS.magic, x, y });
      this.particles.emit({ ...PARTICLE_PRESETS.smoke, count: 8, x, y });
    }
    await animations.delay(0.7);
  }

  /** Expanding wilds grow to fill their reels (free spins). */
  async expandWilds(reels: number[], finalGrid: Grid): Promise<void> {
    if (reels.length === 0) return;
    soundManager.play('wild');
    for (const reelIndex of reels) {
      const { x } = this.cellGlobal(reelIndex, 1);
      this.particles.emit({
        ...PARTICLE_PRESETS.fire,
        count: 40,
        x,
        y: REEL_Y + REEL_AREA_HEIGHT / 2,
      });
    }
    await animations.delay(0.35);
    this.reelManager.setGrid(finalGrid);
    for (const reelIndex of reels) {
      for (let row = 0; row < ROW_COUNT; row++) {
        const symbol = this.reelManager.reelAt(reelIndex).symbolAt(row);
        gsap.fromTo(
          symbol.scale,
          { x: 0.2, y: 1.6 },
          { x: 1, y: 1, duration: 0.4, ease: 'back.out(1.8)', delay: row * 0.06 },
        );
      }
    }
    await animations.delay(0.7);
  }

  /** Persistent glow under sticky wilds during free spins. */
  markStickyWilds(cells: Cell[]): void {
    for (const [reel, row] of cells) {
      this.reelManager.reelAt(reel).symbolAt(row).showGlow(true);
    }
  }

  /** Scatter celebration before the free-spins intro. */
  async celebrateScatters(grid: Grid): Promise<void> {
    soundManager.play('scatter');
    for (let reel = 0; reel < grid.length; reel++) {
      for (let row = 0; row < grid[reel].length; row++) {
        if (grid[reel][row] === 'SCATTER') {
          const symbol = this.reelManager.reelAt(reel).symbolAt(row);
          symbol.showGlow(true);
          animations.winPulse(symbol, 1.3);
          const { x, y } = this.cellGlobal(reel, row);
          this.particles.emit({ ...PARTICLE_PRESETS.starBurst, x, y });
        }
      }
    }
    await animations.delay(1.1);
    for (let reel = 0; reel < grid.length; reel++) {
      for (let row = 0; row < grid[reel].length; row++) {
        if (grid[reel][row] === 'SCATTER') {
          this.reelManager.reelAt(reel).symbolAt(row).showGlow(false);
        }
      }
    }
  }

  destroy(): void {
    if (this.ambientTimer !== null) clearInterval(this.ambientTimer);
    this.offShake?.();
    this.winPresentation.destroy();
    this.bigWin.destroy();
    this.particles.destroy();
    this.reelManager.destroy();
    this.container.destroy({ children: true });
  }
}
