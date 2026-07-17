import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import { WinTier } from '@/types';
import { animations } from '@/animations/AnimationManager';
import type { ParticleSystem } from './ParticleSystem';
import { PARTICLE_PRESETS } from './particlePresets';
import { formatCredits } from '@/utils/format';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '@/constants';
import { soundManager } from '@/services/SoundManager';
import { eventBus } from '@/services/EventBus';

interface TierStyle {
  color: number;
  glow: number;
  duration: number;
  coins: number;
  shake: number;
}

const TIER_STYLES: Partial<Record<WinTier, TierStyle>> = {
  [WinTier.Big]: { color: 0xffe066, glow: 0xffc93c, duration: 2.4, coins: 1, shake: 8 },
  [WinTier.Mega]: { color: 0xff9a2e, glow: 0xff6a00, duration: 3.0, coins: 2, shake: 14 },
  [WinTier.SuperMega]: { color: 0xff5c7a, glow: 0xff2e4d, duration: 3.6, coins: 3, shake: 18 },
  [WinTier.Epic]: { color: 0xc44dff, glow: 0x9d5cff, duration: 4.2, coins: 4, shake: 24 },
  [WinTier.Legendary]: { color: 0x4dd6ff, glow: 0x00ffe1, duration: 5.0, coins: 6, shake: 32 },
};

/**
 * Full-screen Big/Mega/Epic/Legendary win celebration: darkened backdrop,
 * tier title, counting amount, coin fountains and camera shake. Tap to
 * finish the counter early.
 */
export class BigWinOverlay {
  readonly container = new Container();
  private skipRequested = false;

  constructor() {
    this.container.visible = false;
    this.container.eventMode = 'static';
    this.container.hitArea = new Rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    this.container.on('pointerdown', () => {
      this.skipRequested = true;
    });
  }

  async show(tier: WinTier, amount: number, particles: ParticleSystem): Promise<void> {
    const style = TIER_STYLES[tier];
    if (!style) return;
    this.skipRequested = false;
    soundManager.play('bigWin');
    eventBus.emit('shake', style.shake);

    const dim = new Graphics()
      .rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT)
      .fill({ color: 0x05020d, alpha: 0.82 });
    const title = new Text({
      text: tier.toUpperCase(),
      style: new TextStyle({
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontWeight: '900',
        fontSize: 92,
        fill: style.color,
        stroke: { color: 0x140a00, width: 10 },
        dropShadow: { color: style.glow, blur: 24, distance: 0, alpha: 0.9 },
        letterSpacing: 4,
      }),
    });
    title.anchor.set(0.5);
    title.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 - 90);

    const counter = new Text({
      text: '0.00',
      style: new TextStyle({
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontWeight: '900',
        fontSize: 74,
        fill: 0xffffff,
        stroke: { color: 0x140a00, width: 8 },
        dropShadow: { color: style.glow, blur: 16, distance: 0, alpha: 0.8 },
      }),
    });
    counter.anchor.set(0.5);
    counter.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 + 40);

    this.container.addChild(dim, title, counter);
    this.container.visible = true;
    dim.alpha = 0;
    animations.to(dim, { alpha: 1, duration: 0.3 });
    animations.bounceIn(title, 0.6);
    animations.popIn(counter);

    // Coin fountains from the bottom corners + centre.
    let coinTimer = 0;
    const coinInterval = setInterval(() => {
      coinTimer += 1;
      const x = [DESIGN_WIDTH * 0.2, DESIGN_WIDTH * 0.8, DESIGN_WIDTH * 0.5][coinTimer % 3];
      particles.emit({
        ...PARTICLE_PRESETS.coinFountain,
        count: 30 * style.coins,
        x,
        y: DESIGN_HEIGHT + 30,
      });
      particles.emit({ ...PARTICLE_PRESETS.starBurst, x: DESIGN_WIDTH / 2, y: DESIGN_HEIGHT / 2 });
      soundManager.play('coin');
    }, 450);

    // Count up the amount; a tap snaps it to the end.
    const count = animations.counter(counter, 0, amount, style.duration, (v) =>
      formatCredits(v),
    );
    const skipPoll = setInterval(() => {
      if (this.skipRequested) count.progress(1);
    }, 50);
    await count.then(() => undefined);
    clearInterval(skipPoll);

    animations.winPulse(counter, 1.25);
    await animations.delay(1.0);
    clearInterval(coinInterval);

    await new Promise<void>((resolve) => {
      animations.to(this.container, {
        alpha: 0,
        duration: 0.35,
        onComplete: () => resolve(),
      });
    });
    this.container.visible = false;
    this.container.alpha = 1;
    this.container.removeChildren().forEach((c) => c.destroy());
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
