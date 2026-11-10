import type { Application, Ticker } from 'pixi.js';
import gsap from 'gsap';
import type { Grid } from '@neon/game-math';
import { createGameTextures, type GameTextures } from '../assets/AssetFactory';
import { AudioManager } from '../audio/AudioManager';
import { CascadeManager } from '../animations/CascadeManager';
import { CelebrationController } from '../animations/CelebrationController';
import { LuckyWinController } from '../animations/LuckyWinController';
import { ScreenFx } from '../animations/ScreenFx';
import { WinAnimator } from '../animations/WinAnimator';
import { BossFightScene } from '../bonus/BossFightScene';
import { CharacterAnimator } from '../character/CharacterAnimator';
import { FreeSpinsPresenter } from '../freeSpins/FreeSpinsPresenter';
import { ParticleManager } from '../particles/ParticleManager';
import { ReelController } from '../reels/ReelController';
import { ReelFrame } from '../reels/ReelFrame';
import { ReelManager } from '../reels/ReelManager';
import { SymbolAnimator } from '../symbols/SymbolAnimator';
import { SymbolFactory } from '../symbols/SymbolFactory';
import type { Layout } from '../../stores/layoutStore';
import { BackgroundAnimator } from './BackgroundAnimator';
import { FRAME_W } from './constants';
import { createRenderer } from './GameRenderer';
import { GameStage } from './GameStage';
import { stagePlacement } from './layout';
import { ResizeManager } from './ResizeManager';

/**
 * Root of the PixiJS game: owns renderer, textures, layers and every animation subsystem.
 * React talks to it only through GameFlowController.
 */
export class GameApplication {
  app!: Application;
  textures!: GameTextures;
  stage!: GameStage;
  resize!: ResizeManager;
  audio = new AudioManager();
  particles = new ParticleManager(800);
  background!: BackgroundAnimator;
  character!: CharacterAnimator;
  reels!: ReelManager;
  reelController!: ReelController;
  symbolAnimator!: SymbolAnimator;
  winAnimator!: WinAnimator;
  cascade!: CascadeManager;
  celebrations!: CelebrationController;
  lucky!: LuckyWinController;
  freeSpins!: FreeSpinsPresenter;
  boss!: BossFightScene;
  fx!: ScreenFx;
  private destroyed = false;
  private tick = (t: Ticker) => this.update(t.deltaMS);
  onStageTap: (() => void) | null = null;
  onError: (msg: string) => void = () => {};

  async init(host: HTMLElement) {
    // keep animation time in sync with wall-clock time (presentations await real durations)
    gsap.ticker.lagSmoothing(0);
    this.app = await createRenderer(host);
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }
    this.textures = await createGameTextures();
    const tx = this.textures;
    this.stage = new GameStage(this.app.stage);

    this.background = new BackgroundAnimator({ backgrounds: tx.backgrounds, signs: tx.neonSigns, glow: tx.particles.glow, spark: tx.particles.spark });
    this.stage.background.addChild(this.background);

    this.character = new CharacterAnimator({ body: tx.heroBody, ponytail: tx.heroPonytail, muzzle: tx.muzzle });
    this.stage.characterLayer.addChild(this.character);

    const factory = new SymbolFactory({ sharp: tx.symbols, blur: tx.symbolsBlur, glow: tx.particles.glow });
    const frame = new ReelFrame(tx.particles.glow);
    this.reels = new ReelManager(frame, factory);
    this.stage.reelLayer.addChild(this.reels);

    this.symbolAnimator = new SymbolAnimator(this.particles, this.reels.fxLayer, { spark: tx.particles.spark, ring: tx.particles.ring, star: tx.particles.star }, this.audio);
    this.reelController = new ReelController(this.reels, this.audio, this.symbolAnimator);
    this.winAnimator = new WinAnimator(this.reels, this.symbolAnimator);
    this.reels.fxLayer.addChild(this.winAnimator.layer);
    this.cascade = new CascadeManager(this.reels, this.winAnimator, this.symbolAnimator, this.particles, this.reels.fxLayer, { spark: tx.particles.spark, shard: tx.particles.shard }, this.audio);
    this.reels.fxLayer.addChild(this.cascade.counter);

    this.fx = new ScreenFx(this.stage.world, this.stage.overlayLayer);
    const ptex = tx.particles;
    this.boss = new BossFightScene({
      tex: { boss: tx.boss, glow: ptex.glow, spark: ptex.spark, shard: ptex.shard, ring: ptex.ring, star: ptex.star, coin: ptex.coin },
      particles: this.particles,
      audio: this.audio,
      fx: this.fx,
      character: this.character,
      onError: (m) => this.onError(m),
    });
    this.stage.bonusLayer.addChild(this.boss);
    this.celebrations = new CelebrationController({ particles: this.particles, audio: this.audio, character: this.character, fx: this.fx, tex: { coin: ptex.coin, spark: ptex.spark, star: ptex.star, glow: ptex.glow, bolt: ptex.bolt, ring: ptex.ring } });
    this.lucky = new LuckyWinController(this.particles, this.audio, this.character, { coin: ptex.coin, clover: ptex.clover, star: ptex.star, glow: ptex.glow, spark: ptex.spark });
    this.freeSpins = new FreeSpinsPresenter(this.particles, this.audio, { spark: ptex.spark, star: ptex.star, coin: ptex.coin });
    this.stage.overlayLayer.addChild(this.celebrations, this.lucky, this.freeSpins);

    // tap on the reels = quick stop
    this.reels.eventMode = 'static';
    this.reels.on('pointertap', () => this.onStageTap?.());

    this.resize = new ResizeManager(host, this.app.renderer);
    this.resize.onChange((l) => this.layout(l));
    this.resize.start();
    this.app.ticker.add(this.tick);
  }

  private layout(l: Layout) {
    this.background.resize(l.viewportWidth, l.viewportHeight);
    this.stage.root.scale.set(l.scale);
    this.stage.root.position.set(l.offsetX, l.offsetY);
    const p = stagePlacement(l);
    this.reels.scale.set(p.frameScale);
    this.reels.position.set(p.frameX, p.frameY);
    this.character.visible = p.characterVisible;
    this.character.scale.set(p.characterScale);
    this.character.position.set(p.characterX, p.characterBottom);
    const cx = l.designWidth / 2;
    const cy = l.orientation === 'portrait' ? p.frameY + 400 * p.frameScale : l.designHeight / 2 - 20;
    // celebrations centre on the reels in landscape, on the screen in portrait
    const celebX = l.orientation === 'landscape' ? p.frameX + (FRAME_W * p.frameScale) / 2 : cx;
    for (const o of [this.celebrations, this.lucky, this.freeSpins]) o.center(celebX, cy);
    this.celebrations.viewW = l.designWidth;
    this.celebrations.viewH = l.designHeight;
    this.boss.setLayout(l);
  }

  private update(dt: number) {
    const ms = Math.min(dt, 50);
    this.reels.update(ms);
    this.symbolAnimator.update(ms);
    this.particles.update(ms);
    this.character.update(ms);
    this.background.update(ms);
  }

  /** Debug/test hook: currently visible grid. */
  getGrid(): Grid {
    return this.reels.getGrid();
  }

  setMode(mode: 'base' | 'free' | 'boss') {
    this.background.setVariant(mode);
    if (mode === 'free') this.reels.frame.setColors(0x29e6ff, 0x8b3dff);
    else this.reels.frame.setColors(0xff2bd6, 0x29e6ff);
    this.stage.reelLayer.visible = mode !== 'boss';
    if (mode === 'boss') this.character.visible = true;
    else this.layout(this.resize.layout);
  }

  destroy() {
    this.destroyed = true;
    if (!this.app?.renderer) return;
    this.app.ticker.remove(this.tick);
    gsap.globalTimeline.clear();
    this.resize?.destroy();
    this.audio.destroy();
    this.particles.destroy();
    this.app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
  }
}
