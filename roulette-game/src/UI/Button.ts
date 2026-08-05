import { BitmapText, Container, Graphics } from 'pixi.js';
import { FONT } from '../Game/Fonts';
import { Theme } from '../Types';

export interface ButtonOptions {
  label: string;
  width: number;
  height: number;
  /** Visual weight - `primary` gets the gold fill. */
  variant?: 'primary' | 'secondary' | 'danger';
  onPress: () => void;
}

/**
 * Reusable UI button.
 *
 * Drawn as a `Graphics` + `BitmapText` pair rather than a sprite so it can
 * re-skin on a theme change with no new textures. It redraws only on state
 * change (hover/press/enable/resize), never per frame.
 *
 * Press feedback is applied on `pointerdown` rather than on tap: on a touch
 * screen the visual acknowledgement has to land before the finger lifts, or the
 * control feels broken regardless of how fast the logic is.
 */
export class Button extends Container {
  private readonly background = new Graphics();
  private readonly labelText: BitmapText;

  private buttonWidth: number;
  private buttonHeight: number;
  private variant: NonNullable<ButtonOptions['variant']>;
  private enabled = true;
  private hovered = false;
  private pressed = false;

  public constructor(
    options: ButtonOptions,
    private theme: Theme,
  ) {
    super();
    this.buttonWidth = options.width;
    this.buttonHeight = options.height;
    this.variant = options.variant ?? 'secondary';
    this.onPress = options.onPress;

    this.labelText = new BitmapText({
      text: options.label,
      style: { fontFamily: FONT.UI, fontSize: options.height * 0.38, fill: 0xffffff },
    });
    this.labelText.anchor.set(0.5);

    this.addChild(this.background, this.labelText);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointerover', this.handleOver);
    this.on('pointerout', this.handleOut);
    this.on('pointerdown', this.handleDown);
    this.on('pointerup', this.handleUp);
    this.on('pointerupoutside', this.handleUpOutside);
    this.on('pointertap', this.handleTap);

    this.redraw();
  }

  private readonly onPress: () => void;

  /* --------------------------------------------------------------------- */
  /* State                                                                 */
  /* --------------------------------------------------------------------- */

  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.eventMode = enabled ? 'static' : 'none';
    this.cursor = enabled ? 'pointer' : 'default';
    if (!enabled) {
      this.hovered = false;
      this.pressed = false;
    }
    this.redraw();
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setLabel(label: string): void {
    this.labelText.text = label;
  }

  public setTheme(theme: Theme): void {
    this.theme = theme;
    this.redraw();
  }

  public resize(width: number, height: number): void {
    this.buttonWidth = width;
    this.buttonHeight = height;
    this.labelText.style.fontSize = height * 0.38;
    this.redraw();
  }

  public getButtonSize(): { width: number; height: number } {
    return { width: this.buttonWidth, height: this.buttonHeight };
  }

  /* --------------------------------------------------------------------- */
  /* Pointer handling                                                      */
  /* --------------------------------------------------------------------- */

  private readonly handleOver = (): void => {
    if (!this.enabled) return;
    this.hovered = true;
    this.redraw();
  };

  private readonly handleOut = (): void => {
    this.hovered = false;
    this.pressed = false;
    this.redraw();
  };

  private readonly handleDown = (): void => {
    if (!this.enabled) return;
    this.pressed = true;
    this.redraw();
  };

  private readonly handleUp = (): void => {
    this.pressed = false;
    this.redraw();
  };

  private readonly handleUpOutside = (): void => {
    this.pressed = false;
    this.hovered = false;
    this.redraw();
  };

  private readonly handleTap = (): void => {
    if (!this.enabled) return;
    this.onPress();
  };

  /* --------------------------------------------------------------------- */
  /* Drawing                                                               */
  /* --------------------------------------------------------------------- */

  private redraw(): void {
    const width = this.buttonWidth;
    const height = this.buttonHeight;
    const radius = height * 0.26;

    const palette = this.palette();
    const fill = this.pressed ? palette.pressed : this.hovered ? palette.hover : palette.base;

    this.background.clear();

    // Shadow, dropped only when the button is raised.
    if (!this.pressed && this.enabled) {
      this.background
        .roundRect(-width / 2, -height / 2 + height * 0.06, width, height, radius)
        .fill({ color: 0x000000, alpha: 0.35 });
    }

    this.background
      .roundRect(-width / 2, -height / 2, width, height, radius)
      .fill({ color: fill, alpha: this.enabled ? 1 : 0.35 })
      .stroke({
        width: Math.max(1, height * 0.045),
        color: palette.border,
        alpha: this.enabled ? 0.9 : 0.3,
      });

    // Top-edge sheen sells the raised surface.
    if (this.enabled && !this.pressed) {
      this.background
        .roundRect(-width / 2 + height * 0.1, -height / 2 + height * 0.08, width - height * 0.2, height * 0.3, radius * 0.6)
        .fill({ color: 0xffffff, alpha: 0.1 });
    }

    this.labelText.tint = this.enabled ? palette.text : this.theme.textMuted;
    this.labelText.alpha = this.enabled ? 1 : 0.6;
    // Nudge the label down while pressed so the whole control reads as travelling.
    this.labelText.position.set(0, this.pressed ? height * 0.04 : 0);
  }

  private palette(): {
    base: number;
    hover: number;
    pressed: number;
    border: number;
    text: number;
  } {
    switch (this.variant) {
      case 'primary':
        return {
          base: this.theme.gold,
          hover: this.theme.highlight,
          pressed: this.theme.goldDark,
          border: this.theme.goldDark,
          text: 0x1a1408,
        };
      case 'danger':
        return {
          base: this.theme.danger,
          hover: 0xf05555,
          pressed: 0xa82828,
          border: 0x7a1d1d,
          text: 0xffffff,
        };
      default:
        return {
          base: this.theme.panel,
          hover: this.theme.panelBorder,
          pressed: 0x061009,
          border: this.theme.panelBorder,
          text: this.theme.text,
        };
    }
  }

  public override destroy(): void {
    this.removeAllListeners();
    super.destroy({ children: true, texture: false });
  }
}
