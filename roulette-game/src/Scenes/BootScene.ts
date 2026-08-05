import { Graphics } from 'pixi.js';
import { Scene, GameContext } from './Scene';
import { GameEvent, LayoutMetrics, Theme } from '../Types';
import { Logger } from '../Utilities/Logger';

/**
 * First scene on the stack.
 *
 * Does the work that must happen before anything can be drawn - bitmap font
 * installation and audio-context construction - and paints a plain gradient so
 * the canvas is never a white flash while that happens.
 *
 * Kept deliberately thin. Anything that can wait until the loading screen is
 * visible belongs in {@link LoadingScene} instead, because work done here is
 * work done with no progress indication on screen.
 */
export class BootScene extends Scene {
  private readonly log = Logger.create('BootScene');
  private readonly background = new Graphics();

  public constructor(context: GameContext) {
    super(context);
  }

  public async init(): Promise<void> {
    this.container.addChild(this.background);

    // Bitmap fonts are installed and reference-counted by `Game`, not here:
    // they outlive any single scene, and pairing the install with the engine's
    // own lifetime is what keeps the reference count balanced when a mount is
    // torn down before boot finishes.

    // Constructing the audio graph early means the first user gesture can
    // unlock it, rather than the gesture arriving before there is a context.
    await this.context.audio.init();

    this.context.bus.emit(GameEvent.BOOT_COMPLETE);
    this.log.debug('boot complete');
  }

  public onResize(metrics: LayoutMetrics): void {
    this.drawBackground(metrics, this.context.theme);
  }

  public override onThemeChange(theme: Theme): void {
    const metrics = this.context.resize.getMetrics();
    this.drawBackground(metrics, theme);
  }

  /**
   * Vertical gradient approximated with horizontal bands.
   *
   * A real gradient needs a shader or a baked texture; sixteen bands are
   * indistinguishable at this scale and cost nothing to redraw on resize.
   */
  private drawBackground(metrics: LayoutMetrics, theme: Theme): void {
    const bands = 16;
    const bandHeight = Math.ceil(metrics.height / bands);

    this.background.clear();
    for (let i = 0; i < bands; i += 1) {
      const t = i / (bands - 1);
      this.background
        .rect(0, i * bandHeight, metrics.width, bandHeight + 1)
        .fill({ color: mixColors(theme.backgroundTop, theme.backgroundBottom, t) });
    }
  }
}

/** Linear interpolation between two packed RGB colours. */
export function mixColors(from: number, to: number, t: number): number {
  const fr = (from >> 16) & 0xff;
  const fg = (from >> 8) & 0xff;
  const fb = from & 0xff;
  const tr = (to >> 16) & 0xff;
  const tg = (to >> 8) & 0xff;
  const tb = to & 0xff;

  const r = Math.round(fr + (tr - fr) * t);
  const g = Math.round(fg + (tg - fg) * t);
  const b = Math.round(fb + (tb - fb) * t);
  return (r << 16) | (g << 8) | b;
}
