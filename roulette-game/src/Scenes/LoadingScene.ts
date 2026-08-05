import { BitmapText, Container, Graphics, Sprite } from 'pixi.js';
import { Scene, GameContext } from './Scene';
import { mixColors } from './BootScene';
import { AssetLoader, AssetBundle } from '../Game/AssetLoader';
import { AnimationManager } from '../Managers/AnimationManager';
import { FONT } from '../Game/Fonts';
import { GameEvent, LayoutMetrics, Theme } from '../Types';
import { WheelManager } from '../Managers/WheelManager';
import { getWheelOrder } from '../Game/Constants';
import { clamp, TAU } from '../Utilities/Math';

/**
 * Loading screen.
 *
 * Two jobs beyond looking busy:
 *
 * 1. **Bake the expensive textures.** The wheel head is a thousand-triangle
 *    vector drawing plus 37 rotated labels. Baking it here, behind a progress
 *    bar, is the difference between a smooth first round and a half-second
 *    hitch the first time the wheel appears.
 * 2. **Load operator assets**, if any are configured.
 *
 * The progress bar reports real progress across both, weighted so it never
 * stalls at a number for long.
 */
export class LoadingScene extends Scene {
  private readonly background = new Graphics();
  private readonly panel = new Container();
  private readonly title: BitmapText;
  private readonly caption: BitmapText;
  private readonly barBackground = new Graphics();
  private readonly barFill = new Graphics();
  private readonly spinner: Sprite;

  private progress = 0;
  private barWidth = 320;
  private barHeight = 8;
  private spinnerAngle = 0;

  /** Called once loading finishes so the Game can advance. */
  public onComplete?: () => void;

  public constructor(
    context: GameContext,
    private readonly loader: AssetLoader,
    private readonly bundles: readonly AssetBundle[],
  ) {
    super(context);

    this.title = new BitmapText({
      text: context.localization.t('loading.title'),
      style: { fontFamily: FONT.UI, fontSize: 34, fill: context.theme.gold },
    });
    this.title.anchor.set(0.5);

    this.caption = new BitmapText({
      text: context.localization.t('loading.text'),
      style: { fontFamily: FONT.UI, fontSize: 15, fill: context.theme.textMuted },
    });
    this.caption.anchor.set(0.5);

    this.spinner = new Sprite(context.textures.getGlowTexture());
    this.spinner.anchor.set(0.5);
    this.spinner.tint = context.theme.gold;
    this.spinner.alpha = 0.5;
  }

  public async init(): Promise<void> {
    this.panel.addChild(this.spinner, this.title, this.caption, this.barBackground, this.barFill);
    this.container.addChild(this.background, this.panel);

    this.context.bus.on(
      GameEvent.ASSETS_PROGRESS,
      // Downloading owns the front half of the bar; the bake owns the back.
      (payload) => this.setProgress(payload.progress * 0.5),
      this,
    );

    void this.run();
  }

  /**
   * Download, then bake.
   *
   * The order is load-bound: `TextureFactory` prefers operator artwork over its
   * own drawing, so the loader has to be attached *before* anything is baked.
   * Baking first would cache a procedural wheel and the downloaded art would
   * never be seen.
   *
   * Each bake step yields to the browser afterwards so the progress bar
   * actually repaints between them - a synchronous run would show 0% and then
   * jump to 100%.
   */
  private async run(): Promise<void> {
    const { textures, config } = this.context;
    const wheelType = config.wheel.type;

    await this.loader.load(this.bundles);
    this.setProgress(0.5);
    await nextFrame();

    const steps: Array<() => void> = [
      () => {
        textures.getWheelBowlTexture({
          bowlOuter: 1,
          bowlInner: 0.92,
          ballTrack: 0.86,
          deflector: 0.72,
          deflectorCount: 8,
        });
      },
      () => {
        // The single most expensive bake in the engine.
        const order = getWheelOrder(wheelType);
        const pockets = WheelManager.buildPockets(config.wheel);
        textures.getWheelHeadTexture(
          order,
          (value) => pockets.find((pocket) => pocket.value === value)!.color,
          {
            headOuter: 0.68,
            pocket: 0.58,
            pocketInner: 0.46,
            coneOuter: 0.44,
            coneInner: 0.14,
          },
        );
      },
      () => {
        textures.getBallTexture();
        textures.getMarkerTexture();
        textures.getParticleTexture();
        textures.getWhiteTexture();
      },
      () => {
        for (const denomination of config.betting.chips) {
          textures.getChipTexture(denomination);
        }
      },
    ];

    for (let i = 0; i < steps.length; i += 1) {
      steps[i]();
      this.setProgress(0.5 + ((i + 1) / steps.length) * 0.5);
      await nextFrame();
    }

    this.setProgress(1);

    // A beat at 100% so the bar is seen to complete rather than vanishing.
    await new Promise<void>((resolve) => window.setTimeout(resolve, 180));
    this.onComplete?.();
  }

  private setProgress(value: number): void {
    const next = clamp(value, 0, 1);
    if (next <= this.progress) return;

    // Tween rather than jump: a bar that eases between steps reads as
    // continuous work even though the underlying steps are discrete.
    this.context.animations.to(this, {
      progress: next,
      duration: 0.3,
      ease: AnimationManager.EASE_UI_IN,
      overwrite: 'auto',
      onUpdate: () => this.drawBar(),
      onComplete: () => this.drawBar(),
    });
  }

  public override update(deltaSeconds: number): void {
    this.spinnerAngle += deltaSeconds * 1.4;
    this.spinner.rotation = this.spinnerAngle % TAU;
    this.spinner.alpha = 0.35 + Math.sin(this.spinnerAngle * 2) * 0.12;
  }

  /* --------------------------------------------------------------------- */
  /* Layout                                                                */
  /* --------------------------------------------------------------------- */

  public onResize(metrics: LayoutMetrics): void {
    const scale = metrics.scale;

    this.drawBackground(metrics, this.context.theme);
    this.panel.position.set(metrics.width / 2, metrics.height / 2);

    this.title.style.fontSize = Math.max(20, 34 * scale);
    this.title.position.set(0, -46 * scale);

    this.caption.style.fontSize = Math.max(11, 15 * scale);
    this.caption.position.set(0, 34 * scale);

    this.barWidth = Math.min(metrics.safeWidth * 0.62, 380 * scale);
    this.barHeight = Math.max(5, 8 * scale);

    const spinnerSize = Math.max(160, 260 * scale);
    this.spinner.width = spinnerSize;
    this.spinner.height = spinnerSize;

    this.drawBar();
  }

  private drawBar(): void {
    const width = this.barWidth;
    const height = this.barHeight;
    const radius = height / 2;

    this.barBackground.clear();
    this.barBackground
      .roundRect(-width / 2, -height / 2, width, height, radius)
      .fill({ color: this.context.theme.panelBorder, alpha: 0.7 });

    this.barFill.clear();
    const fillWidth = Math.max(height, width * this.progress);
    this.barFill
      .roundRect(-width / 2, -height / 2, fillWidth, height, radius)
      .fill({ color: this.context.theme.gold });

    this.caption.text = `${this.context.localization.t('loading.text')} ${Math.round(
      this.progress * 100,
    )}%`;
  }

  private drawBackground(metrics: LayoutMetrics, theme: Theme): void {
    const bands = 16;
    const bandHeight = Math.ceil(metrics.height / bands);

    this.background.clear();
    for (let i = 0; i < bands; i += 1) {
      this.background
        .rect(0, i * bandHeight, metrics.width, bandHeight + 1)
        .fill({ color: mixColors(theme.backgroundTop, theme.backgroundBottom, i / (bands - 1)) });
    }
  }

  public override onThemeChange(theme: Theme): void {
    this.title.tint = theme.gold;
    this.caption.tint = theme.textMuted;
    this.spinner.tint = theme.gold;
    this.drawBackground(this.context.resize.getMetrics(), theme);
    this.drawBar();
  }

  public override onLanguageChange(): void {
    this.title.text = this.context.localization.t('loading.title');
    this.drawBar();
  }

  public override destroy(): void {
    this.context.animations.killTweensOf(this);
    this.onComplete = undefined;
    super.destroy();
  }
}

/** Yield to the browser so a paint can happen between synchronous steps. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
