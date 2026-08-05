import { BitmapText, Container, Graphics } from 'pixi.js';
import { AnimationManager } from '../Managers/AnimationManager';
import { FONT } from '../Game/Fonts';
import { Localization } from '../Localization';
import { Theme } from '../Types';
import { formatCurrency } from '../Utilities/Helpers';

/** Actions the bar can raise. */
export enum BottomBarAction {
  INFO = 'INFO',
  SETTINGS = 'SETTINGS',
  SOUND = 'SOUND',
}

/**
 * The status bar along the bottom: cash on the left, stake on the right, and
 * the info / settings affordances.
 *
 * Deliberately flat and black. It is the one region of the screen that never
 * animates, which is what makes the two numbers on it easy to read at a glance
 * while everything above them is moving.
 */
export class BottomBar extends Container {
  private readonly background = new Graphics();
  private readonly icons = new Graphics();
  private readonly cashCaption: BitmapText;
  private readonly cashValue: BitmapText;
  private readonly stakeCaption: BitmapText;
  private readonly stakeValue: BitmapText;

  private currency = '$';
  private scale_ = 1;
  private barWidth = 0;
  private barHeight = 0;
  /** Hit regions for the icon row, in local space. */
  private readonly hitBoxes: Array<{ action: BottomBarAction; x: number; radius: number }> = [];

  public onAction?: (action: BottomBarAction) => void;

  public constructor(
    private readonly animations: AnimationManager,
    private theme: Theme,
    private localization: Localization,
  ) {
    super();

    this.cashCaption = this.makeLabel(FONT.UI, 0xe8c96a);
    this.cashValue = this.makeLabel(FONT.NUMBER, 0xffffff);
    this.stakeCaption = this.makeLabel(FONT.UI, 0xe8c96a);
    this.stakeValue = this.makeLabel(FONT.NUMBER, 0xffffff);
    this.stakeCaption.anchor.set(1, 0.5);
    this.stakeValue.anchor.set(1, 0.5);

    this.addChild(
      this.background,
      this.icons,
      this.cashCaption,
      this.cashValue,
      this.stakeCaption,
      this.stakeValue,
    );

    this.eventMode = 'static';
    this.on('pointertap', this.handleTap);
  }

  private makeLabel(fontFamily: string, tint: number): BitmapText {
    const label = new BitmapText({ text: '', style: { fontFamily, fontSize: 20, fill: tint } });
    label.anchor.set(0, 0.5);
    return label;
  }

  /* --------------------------------------------------------------------- */
  /* Layout                                                                */
  /* --------------------------------------------------------------------- */

  public resize(width: number, height: number, scale: number): void {
    this.barWidth = width;
    this.barHeight = height;
    this.scale_ = scale;

    const captionSize = Math.max(12, 22 * scale);
    const valueSize = Math.max(13, 24 * scale);
    const midY = height / 2;

    this.background.clear();
    this.background.rect(0, 0, width, height).fill({ color: this.theme.bottomBar });

    /* Icons: info circle, then settings gear, along the left. */
    const iconRadius = Math.min(height * 0.34, 18 * scale);
    const infoX = 22 * scale + iconRadius;
    const gearX = infoX + iconRadius * 2.6;

    this.hitBoxes.length = 0;
    this.hitBoxes.push({ action: BottomBarAction.INFO, x: infoX, radius: iconRadius * 1.3 });
    this.hitBoxes.push({ action: BottomBarAction.SETTINGS, x: gearX, radius: iconRadius * 1.3 });

    this.icons.clear();
    this.drawInfoIcon(infoX, midY, iconRadius);
    this.drawGearIcon(gearX, midY, iconRadius * 0.62);

    /* Cash on the left, after the icons. */
    const cashX = gearX + iconRadius * 2.2;
    this.cashCaption.style.fontSize = captionSize;
    this.cashValue.style.fontSize = valueSize;
    this.cashCaption.position.set(cashX, midY);
    this.cashValue.position.set(cashX + this.cashCaption.width + 12 * scale, midY);

    /* Stake on the right. */
    this.stakeValue.style.fontSize = valueSize;
    this.stakeCaption.style.fontSize = captionSize;
    this.stakeValue.position.set(width - 22 * scale, midY);
    this.stakeCaption.position.set(
      width - 22 * scale - this.stakeValue.width - 12 * scale,
      midY,
    );

    this.hitArea = null;
  }

  private drawInfoIcon(x: number, y: number, radius: number): void {
    this.icons
      .circle(x, y, radius)
      .stroke({ width: Math.max(1.5, radius * 0.14), color: 0xffffff });
    this.icons.circle(x, y - radius * 0.42, radius * 0.11).fill({ color: 0xffffff });
    this.icons
      .rect(x - radius * 0.1, y - radius * 0.16, radius * 0.2, radius * 0.62)
      .fill({ color: 0xffffff });
  }

  /** Eight-tooth gear, drawn as a ring with radial spokes. */
  private drawGearIcon(x: number, y: number, radius: number): void {
    const teeth = 8;
    for (let i = 0; i < teeth; i += 1) {
      const angle = (i / teeth) * Math.PI * 2;
      this.icons
        .moveTo(x + Math.cos(angle) * radius * 0.85, y + Math.sin(angle) * radius * 0.85)
        .lineTo(x + Math.cos(angle) * radius * 1.45, y + Math.sin(angle) * radius * 1.45)
        .stroke({ width: Math.max(1.5, radius * 0.42), color: 0xbfc6cc, cap: 'round' });
    }
    this.icons
      .circle(x, y, radius)
      .stroke({ width: Math.max(1.5, radius * 0.34), color: 0xbfc6cc });
  }

  /* --------------------------------------------------------------------- */
  /* Content                                                               */
  /* --------------------------------------------------------------------- */

  public setCurrency(currency: string): void {
    this.currency = currency;
  }

  /** Roll the cash figure rather than snapping it. */
  public setCash(value: number, animate = true): void {
    const write = (amount: number): void => {
      this.cashValue.text = formatCurrency(amount, this.currency);
      this.cashValue.position.set(
        this.cashCaption.x + this.cashCaption.width + 12 * this.scale_,
        this.barHeight / 2,
      );
    };

    if (!animate) {
      write(value);
      return;
    }

    const current = parseFloat(this.cashValue.text.replace(/[^\d.-]/g, '')) || 0;
    const proxy = { value: current };
    this.animations.to(proxy, {
      value,
      duration: 0.6,
      ease: 'power2.out',
      overwrite: 'auto',
      onUpdate: () => write(proxy.value),
      onComplete: () => write(value),
    });
  }

  public setStake(value: number): void {
    this.stakeValue.text = formatCurrency(value, this.currency);
    // Right-aligned, so the caption has to follow the value's width.
    this.stakeValue.position.set(this.barWidth - 22 * this.scale_, this.barHeight / 2);
    this.stakeCaption.position.set(
      this.barWidth - 22 * this.scale_ - this.stakeValue.width - 12 * this.scale_,
      this.barHeight / 2,
    );
    if (value > 0) this.animations.punch(this.stakeValue, 0.16, 0.26);
  }

  public setTheme(theme: Theme): void {
    this.theme = theme;
  }

  public setLocalization(localization: Localization): void {
    this.localization = localization;
    this.refreshCaptions();
  }

  /** Captions come from the locale bundle - "TUNAI" / "TARUHAN" in Indonesian. */
  public refreshCaptions(): void {
    this.cashCaption.text = this.localization.t('label.cash').toUpperCase();
    this.stakeCaption.text = `${this.localization.t('label.stake').toUpperCase()}:`;
  }

  private readonly handleTap = (event: { global: { x: number; y: number } }): void => {
    const local = this.toLocal(event.global);
    for (const box of this.hitBoxes) {
      if (Math.abs(local.x - box.x) <= box.radius && local.y >= 0 && local.y <= this.barHeight) {
        this.onAction?.(box.action);
        return;
      }
    }
  };

  public override destroy(): void {
    this.off('pointertap', this.handleTap);
    this.animations.killTweensOf(this.stakeValue);
    super.destroy({ children: true, texture: false });
  }
}
