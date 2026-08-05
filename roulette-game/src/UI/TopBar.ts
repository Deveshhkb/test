import { BitmapText, Container, Graphics } from 'pixi.js';
import { AnimationManager } from '../Managers/AnimationManager';
import { FONT } from '../Game/Fonts';
import { Localization } from '../Localization';
import { HistoryEntry, PocketColor, Theme } from '../Types';
import { formatCurrency } from '../Utilities/Helpers';

/** One slot in the recent-numbers strip. */
interface Slot {
  fill: Graphics;
  label: BitmapText;
}

/**
 * The bar across the top of the table: recent numbers, the game title and the
 * table limits.
 *
 * The history strip is a single gold-outlined capsule divided into fixed slots
 * rather than a row of separate badges. That is what the reference prints, and
 * it has a practical advantage - the strip occupies the same footprint whether
 * it holds zero results or its full capacity, so the title never shifts.
 */
export class TopBar extends Container {
  private readonly background = new Graphics();
  private readonly stripFrame = new Graphics();
  private readonly slotLayer = new Container();
  private readonly title: BitmapText;
  private readonly limits: BitmapText;

  private readonly slots: Slot[] = [];
  private barWidth = 0;
  private barHeight = 0;
  private scale_ = 1;

  /** Number of results the strip shows. */
  private static readonly CAPACITY = 5;

  public constructor(
    private readonly animations: AnimationManager,
    private theme: Theme,
    localization: Localization,
  ) {
    super();

    this.title = new BitmapText({
      text: localization.t('app.title').toUpperCase(),
      style: { fontFamily: FONT.UI, fontSize: 40, fill: theme.gold },
    });
    this.title.anchor.set(0.5);

    this.limits = new BitmapText({
      text: '',
      style: { fontFamily: FONT.UI, fontSize: 20, fill: theme.text },
    });
    this.limits.anchor.set(1, 0.5);

    for (let i = 0; i < TopBar.CAPACITY; i += 1) {
      const fill = new Graphics();
      const label = new BitmapText({
        text: '',
        style: { fontFamily: FONT.NUMBER, fontSize: 20, fill: 0xffffff },
      });
      label.anchor.set(0.5);
      this.slotLayer.addChild(fill, label);
      this.slots.push({ fill, label });
    }

    this.addChild(this.background, this.slotLayer, this.stripFrame, this.title, this.limits);
  }

  /* --------------------------------------------------------------------- */
  /* Layout                                                                */
  /* --------------------------------------------------------------------- */

  public resize(width: number, height: number, scale: number): void {
    this.barWidth = width;
    this.barHeight = height;
    this.scale_ = scale;

    this.title.style.fontSize = Math.max(18, 38 * scale);
    this.title.position.set(width / 2, height / 2);
    this.title.tint = this.theme.gold;

    this.limits.style.fontSize = Math.max(11, 19 * scale);
    this.limits.position.set(width - 20 * scale, height / 2);
    this.limits.tint = this.theme.text;

    this.background.clear();
    this.background.rect(0, 0, width, height).fill({ color: this.theme.topBar });

    this.drawStrip();
  }

  /** Gold capsule with internal dividers, sized from the bar height. */
  private drawStrip(): void {
    const scale = this.scale_;
    const padding = 14 * scale;
    const slotWidth = Math.max(24, 56 * scale);
    const height = Math.min(this.barHeight * 0.62, 48 * scale);
    const width = slotWidth * TopBar.CAPACITY;
    const top = (this.barHeight - height) / 2;
    const radius = height / 2;

    this.stripFrame.clear();
    this.stripFrame
      .roundRect(padding, top, width, height, radius)
      .fill({ color: 0x1a1a1a, alpha: 0.85 })
      .stroke({ width: Math.max(2, 3 * scale), color: this.theme.gold });

    // Dividers between slots.
    for (let i = 1; i < TopBar.CAPACITY; i += 1) {
      const x = padding + slotWidth * i;
      this.stripFrame
        .moveTo(x, top + 2)
        .lineTo(x, top + height - 2)
        .stroke({ width: Math.max(1, 1.5 * scale), color: 0x000000, alpha: 0.8 });
    }

    this.slots.forEach((slot, index) => {
      const x = padding + slotWidth * (index + 0.5);
      slot.label.style.fontSize = height * 0.5;
      slot.label.position.set(x, top + height / 2);
      slot.fill.position.set(x, top + height / 2);
      // Geometry is stored on the slot so `update` can recolour without
      // recomputing the layout.
      slot.fill.scale.set(1);
      (slot.fill as Graphics & { slotSize?: { w: number; h: number } }).slotSize = {
        w: slotWidth,
        h: height,
      };
    });
  }

  /* --------------------------------------------------------------------- */
  /* Content                                                               */
  /* --------------------------------------------------------------------- */

  public setLimits(min: number, max: number, currency: string): void {
    this.limits.text = `MIN: ${formatCurrency(min, currency)}   MAKS: ${formatCurrency(max, currency)}`;
    // Re-anchor after the text changes width.
    this.limits.position.set(this.barWidth - 20 * this.scale_, this.barHeight / 2);
  }

  /**
   * Fill the strip, newest first. Slots beyond the available history stay
   * empty rather than collapsing, so the capsule keeps its shape.
   */
  public update(entries: readonly HistoryEntry[]): void {
    this.slots.forEach((slot, index) => {
      const entry = entries[index];
      slot.fill.clear();

      if (!entry) {
        slot.label.text = '';
        return;
      }

      const size = (slot.fill as Graphics & { slotSize?: { w: number; h: number } }).slotSize;
      if (size) {
        slot.fill
          .rect(-size.w / 2 + 2, -size.h / 2 + 3, size.w - 4, size.h - 6)
          .fill({ color: this.colorFor(entry.color) });
      }
      slot.label.text = String(entry.number);
    });

    // The newest result flashes in; the rest simply shift along.
    const leading = this.slots[0];
    if (entries[0] && leading) {
      this.animations.fromTo(
        leading.label.scale,
        { x: 0.3, y: 0.3 },
        { x: 1, y: 1, duration: 0.4, ease: 'back.out(2.4)' },
      );
    }
  }

  private colorFor(color: PocketColor): number {
    if (color === PocketColor.RED) return this.theme.red;
    if (color === PocketColor.BLACK) return this.theme.black;
    return this.theme.green;
  }

  public setTheme(theme: Theme): void {
    this.theme = theme;
  }

  public setLocalization(localization: Localization): void {
    this.title.text = localization.t('app.title').toUpperCase();
  }

  public override destroy(): void {
    for (const slot of this.slots) this.animations.killTweensOf(slot.label.scale);
    super.destroy({ children: true, texture: false });
  }
}
