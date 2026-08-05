import { Container, Graphics, Sprite } from 'pixi.js';
import { TextureFactory } from '../Game/TextureFactory';
import { AnimationManager } from '../Managers/AnimationManager';
import { ChipDenomination, Theme } from '../Types';

interface TraySlot {
  container: Container;
  sprite: Sprite;
  ring: Graphics;
  denomination: ChipDenomination;
}

/**
 * The denomination selector.
 *
 * Slots are laid out along an arc on wide screens and a straight row on narrow
 * ones. The selected chip lifts and gains a ring - the same affordance every
 * live-casino client uses, and the reason players can pick a denomination
 * without reading anything.
 */
export class ChipTray extends Container {
  private readonly background = new Graphics();
  private readonly slots: TraySlot[] = [];

  private selectedValue: number;
  private chipSize = 46;
  private enabled = true;

  /** Fired when the player picks a denomination. */
  public onSelect?: (value: number) => void;

  public constructor(
    private denominations: readonly ChipDenomination[],
    private readonly textures: TextureFactory,
    private readonly animations: AnimationManager,
    private theme: Theme,
  ) {
    super();
    this.selectedValue = denominations[0]?.value ?? 1;
    this.addChild(this.background);
    this.rebuild();
  }

  /* --------------------------------------------------------------------- */
  /* Construction                                                          */
  /* --------------------------------------------------------------------- */

  private rebuild(): void {
    for (const slot of this.slots) {
      this.animations.killTweensOf(slot.container);
      slot.container.destroy({ children: true });
    }
    this.slots.length = 0;

    for (const denomination of this.denominations) {
      const container = new Container();
      const sprite = new Sprite(this.textures.getChipTexture(denomination));
      sprite.anchor.set(0.5);

      const ring = new Graphics();

      container.addChild(ring, sprite);
      container.eventMode = 'static';
      container.cursor = 'pointer';
      container.on('pointertap', () => {
        if (this.enabled) this.select(denomination.value, true);
      });

      this.addChild(container);
      this.slots.push({ container, sprite, ring, denomination });
    }
  }

  public updateDenominations(denominations: readonly ChipDenomination[]): void {
    this.denominations = denominations;
    if (!denominations.some((d) => d.value === this.selectedValue)) {
      this.selectedValue = denominations[0]?.value ?? 1;
    }
    this.rebuild();
  }

  /* --------------------------------------------------------------------- */
  /* Layout                                                                */
  /* --------------------------------------------------------------------- */

  /**
   * Arrange the tray inside a box.
   *
   * @param arc when true the chips follow a shallow curve, as they do in a real
   *   dealer's tray. Disabled in tight portrait layouts where the vertical
   *   budget for a curve does not exist.
   */
  public resize(width: number, height: number, scale: number, arc: boolean): void {
    const count = this.slots.length;
    if (count === 0) return;

    const padding = 10 * scale;
    const available = width - padding * 2;
    const spacingLimit = available / count;

    this.chipSize = Math.min(58 * scale, height * 0.74, spacingLimit * 0.94);
    const spacing = Math.min(spacingLimit, this.chipSize * 1.14);
    const totalWidth = spacing * (count - 1);
    const startX = -totalWidth / 2;
    const arcHeight = arc ? this.chipSize * 0.32 : 0;

    this.slots.forEach((slot, index) => {
      slot.sprite.width = this.chipSize;
      slot.sprite.height = this.chipSize;

      // Parabolic lift: ends low, middle high.
      const t = count === 1 ? 0 : (index / (count - 1)) * 2 - 1;
      const lift = arcHeight * (1 - t * t);

      slot.container.position.set(startX + index * spacing, -lift);
      this.drawRing(slot, slot.denomination.value === this.selectedValue);
    });

    this.background.clear();
    this.background
      .roundRect(-width / 2, -height / 2, width, height, 12 * scale)
      .fill({ color: this.theme.panel, alpha: 0.72 })
      .stroke({ width: Math.max(1, scale), color: this.theme.panelBorder, alpha: 0.9 });

    this.applySelectionTransforms(false);
  }

  private drawRing(slot: TraySlot, selected: boolean): void {
    slot.ring.clear();
    if (!selected) return;

    const radius = this.chipSize * 0.62;
    slot.ring
      .circle(0, 0, radius)
      .stroke({ width: Math.max(2, this.chipSize * 0.07), color: this.theme.highlight });
    slot.ring.circle(0, 0, radius * 1.1).fill({ color: this.theme.highlight, alpha: 0.12 });
  }

  /* --------------------------------------------------------------------- */
  /* Selection                                                             */
  /* --------------------------------------------------------------------- */

  /** @param notify false when reflecting an external change (avoids a loop). */
  public select(value: number, notify: boolean): void {
    if (this.selectedValue === value) return;
    this.selectedValue = value;

    for (const slot of this.slots) {
      this.drawRing(slot, slot.denomination.value === value);
    }
    this.applySelectionTransforms(true);

    if (notify) this.onSelect?.(value);
  }

  public getSelected(): number {
    return this.selectedValue;
  }

  /** Lift and enlarge the selected chip; settle the rest. */
  private applySelectionTransforms(animate: boolean): void {
    for (const slot of this.slots) {
      const selected = slot.denomination.value === this.selectedValue;
      const targetScale = selected ? 1.16 : 1;
      const targetY = slot.container.y;

      if (!animate) {
        slot.container.scale.set(targetScale);
        slot.sprite.alpha = selected ? 1 : 0.82;
        continue;
      }

      this.animations.to(slot.container.scale, {
        x: targetScale,
        y: targetScale,
        duration: 0.24,
        ease: 'back.out(2.4)',
        overwrite: 'auto',
      });
      this.animations.to(slot.sprite, {
        alpha: selected ? 1 : 0.82,
        duration: 0.2,
        overwrite: 'auto',
      });

      if (selected) {
        // A small hop confirms the tap without moving the layout.
        this.animations.fromTo(
          slot.container,
          { y: targetY + this.chipSize * 0.12 },
          { y: targetY, duration: 0.3, ease: 'back.out(2)', overwrite: 'auto' },
        );
      }
    }
  }

  /* --------------------------------------------------------------------- */
  /* State                                                                 */
  /* --------------------------------------------------------------------- */

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.alpha = enabled ? 1 : 0.5;
    for (const slot of this.slots) {
      slot.container.eventMode = enabled ? 'static' : 'none';
      slot.container.cursor = enabled ? 'pointer' : 'default';
    }
  }

  public setTheme(theme: Theme): void {
    this.theme = theme;
    this.rebuild();
  }

  /** Screen position of a denomination's chip - the origin of a placement flight. */
  public getSlotGlobalPosition(value: number): { x: number; y: number } | undefined {
    const slot = this.slots.find((candidate) => candidate.denomination.value === value);
    if (!slot) return undefined;
    return slot.container.getGlobalPosition();
  }

  public override destroy(): void {
    for (const slot of this.slots) this.animations.killTweensOf(slot.container);
    super.destroy({ children: true, texture: false });
  }
}
