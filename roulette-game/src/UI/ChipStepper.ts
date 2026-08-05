import { Container, Graphics, Sprite } from 'pixi.js';
import { TextureFactory } from '../Game/TextureFactory';
import { AnimationManager } from '../Managers/AnimationManager';
import { ChipDenomination, Theme } from '../Types';

/**
 * Denomination selector: a single chip flanked by minus and plus steppers.
 *
 * This is the reference client's model, and it is a better fit for a wide chip
 * ladder than a tray: a tray has to shrink every chip as denominations are
 * added, whereas a stepper shows one chip at a readable size regardless of how
 * many there are. The trade-off is that reaching a distant denomination takes
 * several taps, which is why the steppers auto-repeat is worth adding later.
 */
export class ChipStepper extends Container {
  private readonly minusButton = new Container();
  private readonly plusButton = new Container();
  private readonly minusGraphic = new Graphics();
  private readonly plusGraphic = new Graphics();
  private readonly chip: Sprite;

  private index = 0;
  private size = 90;
  private enabled = true;

  /** Fired when the selected denomination changes. */
  public onSelect?: (value: number) => void;

  public constructor(
    private denominations: readonly ChipDenomination[],
    private readonly textures: TextureFactory,
    private readonly animations: AnimationManager,
    private theme: Theme,
  ) {
    super();

    this.chip = new Sprite(textures.getChipTexture(denominations[0]));
    this.chip.anchor.set(0.5);

    this.minusButton.addChild(this.minusGraphic);
    this.plusButton.addChild(this.plusGraphic);

    for (const [button, delta] of [
      [this.minusButton, -1],
      [this.plusButton, 1],
    ] as Array<[Container, number]>) {
      button.eventMode = 'static';
      button.cursor = 'pointer';
      button.on('pointertap', () => this.step(delta));
    }

    this.addChild(this.minusButton, this.chip, this.plusButton);
  }

  /* --------------------------------------------------------------------- */
  /* Layout                                                                */
  /* --------------------------------------------------------------------- */

  public resize(width: number, height: number, scale: number): void {
    // Three elements across the box: stepper, chip, stepper.
    this.size = Math.min(height * 0.92, width / 3.4, 110 * scale);
    const gap = this.size * 0.42;
    const stepperRadius = this.size * 0.36;

    this.chip.width = this.size;
    this.chip.height = this.size;
    this.chip.position.set(0, 0);

    this.minusButton.position.set(-(this.size / 2 + gap + stepperRadius * 0.4), 0);
    this.plusButton.position.set(this.size / 2 + gap + stepperRadius * 0.4, 0);

    this.drawStepper(this.minusGraphic, stepperRadius, false);
    this.drawStepper(this.plusGraphic, stepperRadius, true);
  }

  /** Dark disc with a gold rim and a bright glyph. */
  private drawStepper(graphic: Graphics, radius: number, plus: boolean): void {
    const bar = radius * 0.5;
    const thickness = Math.max(3, radius * 0.2);

    graphic.clear();
    graphic
      .circle(0, 3, radius)
      .fill({ color: 0x000000, alpha: 0.4 });
    graphic
      .circle(0, 0, radius)
      .fill({ color: 0x243311 })
      .stroke({ width: Math.max(2, radius * 0.13), color: this.theme.gold });

    graphic
      .rect(-bar, -thickness / 2, bar * 2, thickness)
      .fill({ color: this.theme.gold });
    if (plus) {
      graphic
        .rect(-thickness / 2, -bar, thickness, bar * 2)
        .fill({ color: this.theme.gold });
    }
  }

  /* --------------------------------------------------------------------- */
  /* Selection                                                             */
  /* --------------------------------------------------------------------- */

  /** Move up or down the ladder. Clamped, not wrapped - wrapping from the
   *  highest stake straight to the lowest is a good way to lose a player's
   *  money for them. */
  private step(delta: number): void {
    if (!this.enabled) return;

    const next = Math.min(this.denominations.length - 1, Math.max(0, this.index + delta));
    if (next === this.index) return;

    this.index = next;
    this.applySelection(true);
    this.onSelect?.(this.denominations[this.index].value);
  }

  /** @param notify false when reflecting an external change. */
  public select(value: number, notify: boolean): void {
    const index = this.denominations.findIndex((d) => d.value === value);
    if (index === -1 || index === this.index) return;

    this.index = index;
    this.applySelection(true);
    if (notify) this.onSelect?.(value);
  }

  public getSelected(): number {
    return this.denominations[this.index]?.value ?? 0;
  }

  private applySelection(animate: boolean): void {
    this.chip.texture = this.textures.getChipTexture(this.denominations[this.index]);
    this.chip.width = this.size;
    this.chip.height = this.size;

    if (!animate) return;
    // A quick spin-and-pop reads as the chip being swapped rather than recoloured.
    this.animations.fromTo(
      this.chip.scale,
      { x: this.chip.scale.x * 0.72, y: this.chip.scale.y * 0.72 },
      { x: this.chip.scale.x, y: this.chip.scale.y, duration: 0.3, ease: 'back.out(3)' },
    );
  }

  public updateDenominations(denominations: readonly ChipDenomination[]): void {
    this.denominations = denominations;
    this.index = Math.min(this.index, denominations.length - 1);
    this.applySelection(false);
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.alpha = enabled ? 1 : 0.45;
    this.minusButton.eventMode = enabled ? 'static' : 'none';
    this.plusButton.eventMode = enabled ? 'static' : 'none';
  }

  public setTheme(theme: Theme): void {
    this.theme = theme;
  }

  /** Screen position of the chip - the origin of a placement flight. */
  public getChipGlobalPosition(): { x: number; y: number } {
    return this.chip.getGlobalPosition();
  }

  public override destroy(): void {
    this.animations.killTweensOf(this.chip.scale);
    super.destroy({ children: true, texture: false });
  }
}
