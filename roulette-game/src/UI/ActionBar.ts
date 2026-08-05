import { BitmapText, Container, Graphics } from 'pixi.js';
import { AnimationManager } from '../Managers/AnimationManager';
import { FONT } from '../Game/Fonts';
import { Localization } from '../Localization';
import { Theme } from '../Types';

export enum TableAction {
  SPIN = 'SPIN',
  SPECIAL_BETS = 'SPECIAL_BETS',
  CLEAR_BETS = 'CLEAR_BETS',
}

interface ActionButton {
  action: TableAction;
  container: Container;
  disc: Graphics;
  icon: Graphics;
  label: BitmapText;
  labelPlate: Graphics;
  enabled: boolean;
  hovered: boolean;
}

/**
 * The action cluster in the bottom-right: SPIN, special bets and clear.
 *
 * Buttons are circular gold-rimmed discs sitting on a dark navy housing, with a
 * captioned plate beneath each - the reference client's arrangement.
 *
 * Clear only appears once there is something to clear. Showing a permanently
 * dead control is worse than showing none: it occupies attention and teaches
 * the player to ignore that corner of the screen.
 */
export class ActionBar extends Container {
  private readonly housing = new Graphics();
  private readonly buttons: ActionButton[] = [];

  private discRadius = 42;

  public onAction?: (action: TableAction) => void;

  public constructor(
    private readonly animations: AnimationManager,
    private theme: Theme,
    private localization: Localization,
  ) {
    super();
    this.addChild(this.housing);

    for (const action of [TableAction.SPIN, TableAction.SPECIAL_BETS, TableAction.CLEAR_BETS]) {
      this.buttons.push(this.createButton(action));
    }
  }

  private createButton(action: TableAction): ActionButton {
    const container = new Container();
    const disc = new Graphics();
    const icon = new Graphics();
    const labelPlate = new Graphics();

    const label = new BitmapText({
      text: this.labelFor(action),
      style: { fontFamily: FONT.UI, fontSize: 14, fill: 0x8ef0c6 },
    });
    label.anchor.set(0.5);

    container.addChild(disc, icon, labelPlate, label);
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const button: ActionButton = {
      action,
      container,
      disc,
      icon,
      label,
      labelPlate,
      enabled: true,
      hovered: false,
    };

    container.on('pointerover', () => {
      button.hovered = true;
      this.drawButton(button);
    });
    container.on('pointerout', () => {
      button.hovered = false;
      this.drawButton(button);
    });
    container.on('pointertap', () => {
      if (!button.enabled) return;
      this.animations.punch(container, 0.14, 0.3);
      this.onAction?.(action);
    });

    this.addChild(container);
    return button;
  }

  private labelFor(action: TableAction): string {
    switch (action) {
      case TableAction.SPIN:
        return this.localization.t('action.spin').toUpperCase();
      case TableAction.SPECIAL_BETS:
        return this.localization.t('action.specialBets').toUpperCase();
      default:
        return this.localization.t('action.clearBets').toUpperCase();
    }
  }

  /* --------------------------------------------------------------------- */
  /* Layout                                                                */
  /* --------------------------------------------------------------------- */

  public resize(width: number, height: number, scale: number): void {
    const visible = this.buttons.filter((button) => button.container.visible);
    if (visible.length === 0) return;

    this.discRadius = Math.min(height * 0.33, 48 * scale, width / (visible.length * 2.9));

    // Draw first so every caption plate has measured itself, then space the
    // buttons by the widest plate. Spacing by the disc alone is what lets long
    // localised captions ("KOSONGKAN TARUHAN") run into their neighbours.
    for (const button of visible) this.drawButton(button);
    const widestPlate = Math.max(...visible.map((button) => button.labelPlate.width));

    const spacing = Math.max(this.discRadius * 2.3, widestPlate + 10 * scale);
    const totalWidth = spacing * (visible.length - 1);
    const centreY = -height * 0.04;

    // The cluster sits at the right-hand end of the housing, as in the
    // reference, with a margin equal to half a plate so nothing touches the edge.
    const rightMargin = widestPlate / 2 + 12 * scale;
    const startX = width / 2 - rightMargin - totalWidth;

    visible.forEach((button, index) => {
      button.container.position.set(startX + spacing * index, centreY);
    });

    // Housing: a rounded navy bar running off the right edge of the screen.
    const housingHeight = this.discRadius * 1.5;
    this.housing.clear();
    this.housing
      .roundRect(-width / 2, centreY - housingHeight / 2, width, housingHeight, housingHeight / 2)
      .fill({ color: this.theme.actionBar })
      .stroke({ width: Math.max(1, scale), color: this.theme.panelBorder });
  }

  private drawButton(button: ActionButton): void {
    const radius = this.discRadius;
    const accent = button.enabled
      ? button.hovered
        ? 0x7fe3ff
        : this.theme.gold
      : this.theme.textMuted;

    button.disc.clear();
    button.disc.circle(0, radius * 0.1, radius).fill({ color: 0x000000, alpha: 0.45 });
    button.disc
      .circle(0, 0, radius)
      .fill({ color: 0x0b2b24 })
      .stroke({ width: Math.max(2.5, radius * 0.12), color: accent });
    button.disc
      .circle(0, 0, radius * 0.82)
      .stroke({ width: Math.max(1, radius * 0.05), color: 0x000000, alpha: 0.5 });

    this.drawIcon(button, radius * 0.52, accent);

    // Caption plate under the disc, sized to whatever the caption turns out to
    // be rather than to a fixed multiple of the disc.
    const plateHeight = radius * 0.46;
    const plateY = radius * 1.12;

    button.label.style.fontSize = Math.max(8, plateHeight * 0.56);
    button.label.text = this.labelFor(button.action);
    const plateWidth = Math.max(radius * 1.8, button.label.width + plateHeight * 1.1);
    button.label.position.set(0, plateY + plateHeight / 2);
    button.label.tint = button.enabled ? 0x9ef5d0 : this.theme.textMuted;

    button.labelPlate.clear();
    button.labelPlate
      .rect(-plateWidth / 2, plateY, plateWidth, plateHeight)
      .fill({ color: 0x0d2a22, alpha: 0.95 })
      .stroke({ width: 1, color: accent, alpha: 0.7 });

    button.container.alpha = button.enabled ? 1 : 0.5;
    button.container.cursor = button.enabled ? 'pointer' : 'default';
  }

  /** Per-action glyph, drawn rather than sprited so it re-skins with the theme. */
  private drawIcon(button: ActionButton, size: number, color: number): void {
    const g = button.icon;
    g.clear();

    switch (button.action) {
      case TableAction.SPIN: {
        // Circular arrow: a three-quarter arc with a head at the end.
        const start = -Math.PI * 0.55;
        const end = Math.PI * 1.1;
        g.moveTo(Math.cos(start) * size, Math.sin(start) * size)
          .arc(0, 0, size, start, end)
          .stroke({ width: size * 0.34, color, cap: 'round' });

        const tip = end;
        const hx = Math.cos(tip) * size;
        const hy = Math.sin(tip) * size;
        g.moveTo(hx - size * 0.42, hy - size * 0.1)
          .lineTo(hx + size * 0.34, hy - size * 0.24)
          .lineTo(hx + size * 0.02, hy + size * 0.46)
          .closePath()
          .fill({ color });
        break;
      }
      case TableAction.SPECIAL_BETS: {
        // A stack of coins.
        const coinWidth = size * 1.15;
        const coinHeight = size * 0.28;
        for (let i = 0; i < 4; i += 1) {
          const y = size * 0.62 - i * coinHeight * 1.05;
          g.ellipse(0, y, coinWidth, coinHeight).fill({ color });
          g.ellipse(0, y, coinWidth, coinHeight).stroke({ width: 1, color: 0x000000, alpha: 0.4 });
        }
        break;
      }
      default: {
        // Cross.
        const arm = size * 0.85;
        const thickness = size * 0.3;
        g.moveTo(-arm, -arm).lineTo(arm, arm).stroke({ width: thickness, color, cap: 'round' });
        g.moveTo(arm, -arm).lineTo(-arm, arm).stroke({ width: thickness, color, cap: 'round' });
        break;
      }
    }
  }

  /* --------------------------------------------------------------------- */
  /* State                                                                 */
  /* --------------------------------------------------------------------- */

  public setEnabled(action: TableAction, enabled: boolean): void {
    const button = this.buttons.find((candidate) => candidate.action === action);
    if (!button || button.enabled === enabled) return;
    button.enabled = enabled;
    this.drawButton(button);
  }

  public setAllEnabled(enabled: boolean): void {
    for (const button of this.buttons) {
      button.enabled = enabled;
      this.drawButton(button);
    }
  }

  /**
   * Show or hide a button. Returns true when visibility changed, so the caller
   * knows a re-layout is needed.
   */
  public setVisibleAction(action: TableAction, visible: boolean): boolean {
    const button = this.buttons.find((candidate) => candidate.action === action);
    if (!button || button.container.visible === visible) return false;

    button.container.visible = visible;
    if (visible) this.animations.fadeIn(button.container, 0.2);
    return true;
  }

  public setTheme(theme: Theme): void {
    this.theme = theme;
    for (const button of this.buttons) this.drawButton(button);
  }

  public setLocalization(localization: Localization): void {
    this.localization = localization;
    for (const button of this.buttons) this.drawButton(button);
  }

  public override destroy(): void {
    for (const button of this.buttons) {
      button.container.removeAllListeners();
      this.animations.killTweensOf(button.container);
    }
    super.destroy({ children: true, texture: false });
  }
}
