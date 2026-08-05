import { Container } from 'pixi.js';
import { Button } from './Button';
import { Localization } from '../Localization';
import { Orientation, Theme } from '../Types';

/** Actions the bar can raise. */
export enum ControlAction {
  UNDO = 'UNDO',
  REPEAT = 'REPEAT',
  DOUBLE = 'DOUBLE',
  CLEAR = 'CLEAR',
}

/**
 * Bet-management controls: Undo, Repeat, Double, Clear.
 *
 * The bar owns only enablement and layout. Whether an action is *legal* is
 * decided by {@link BetManager}; the bar reflects that decision, so the two can
 * never disagree about, say, whether a repeat is possible.
 */
export class ControlBar extends Container {
  private readonly buttons = new Map<ControlAction, Button>();

  /** Raised when a control is pressed. */
  public onAction?: (action: ControlAction) => void;

  public constructor(theme: Theme, localization: Localization) {
    super();

    const definitions: Array<{
      action: ControlAction;
      labelKey: string;
      variant: 'primary' | 'secondary' | 'danger';
    }> = [
      { action: ControlAction.UNDO, labelKey: 'action.undo', variant: 'secondary' },
      { action: ControlAction.REPEAT, labelKey: 'action.repeat', variant: 'secondary' },
      { action: ControlAction.DOUBLE, labelKey: 'action.double', variant: 'primary' },
      { action: ControlAction.CLEAR, labelKey: 'action.clear', variant: 'danger' },
    ];

    for (const definition of definitions) {
      const button = new Button(
        {
          label: localization.t(definition.labelKey),
          width: 96,
          height: 40,
          variant: definition.variant,
          onPress: () => this.onAction?.(definition.action),
        },
        theme,
      );
      this.buttons.set(definition.action, button);
      this.addChild(button);
    }
  }

  /* --------------------------------------------------------------------- */
  /* Layout                                                                */
  /* --------------------------------------------------------------------- */

  /**
   * Lay the controls out inside a box.
   *
   * Landscape gets one row; portrait gets a 2x2 grid, which keeps every button
   * above the minimum comfortable touch target instead of shrinking four
   * controls into a phone's width.
   */
  public resize(
    width: number,
    height: number,
    scale: number,
    orientation: Orientation,
  ): void {
    const gap = 8 * scale;
    const buttons = [...this.buttons.values()];
    const twoRows = orientation === Orientation.PORTRAIT;

    const columns = twoRows ? 2 : buttons.length;
    const rows = twoRows ? 2 : 1;

    const buttonWidth = (width - gap * (columns - 1)) / columns;
    // Fill the box rather than capping at a design size. The scene's layout
    // solver has already guaranteed this box is at least a comfortable touch
    // target tall, so capping here would throw that guarantee away.
    const buttonHeight = (height - gap * (rows - 1)) / rows;

    buttons.forEach((button, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);

      button.resize(buttonWidth, buttonHeight);
      button.position.set(
        -width / 2 + buttonWidth / 2 + column * (buttonWidth + gap),
        -height / 2 + buttonHeight / 2 + row * (buttonHeight + gap),
      );
    });
  }

  /* --------------------------------------------------------------------- */
  /* State                                                                 */
  /* --------------------------------------------------------------------- */

  public setEnabled(action: ControlAction, enabled: boolean): void {
    this.buttons.get(action)?.setEnabled(enabled);
  }

  public setAllEnabled(enabled: boolean): void {
    for (const button of this.buttons.values()) button.setEnabled(enabled);
  }

  /**
   * Reflect the current betting situation in one call.
   *
   * Keeping this as a single method (rather than four `setEnabled` calls spread
   * across the scene) means there is exactly one place where "which controls
   * are live right now" is decided.
   */
  public reflect(state: {
    bettingOpen: boolean;
    hasBets: boolean;
    canUndo: boolean;
    canRepeat: boolean;
  }): void {
    this.setEnabled(ControlAction.UNDO, state.bettingOpen && state.canUndo);
    this.setEnabled(ControlAction.REPEAT, state.bettingOpen && state.canRepeat);
    this.setEnabled(ControlAction.DOUBLE, state.bettingOpen && state.hasBets);
    this.setEnabled(ControlAction.CLEAR, state.bettingOpen && state.hasBets);
  }

  public setTheme(theme: Theme): void {
    for (const button of this.buttons.values()) button.setTheme(theme);
  }

  public setLocalization(localization: Localization): void {
    this.buttons.get(ControlAction.UNDO)?.setLabel(localization.t('action.undo'));
    this.buttons.get(ControlAction.REPEAT)?.setLabel(localization.t('action.repeat'));
    this.buttons.get(ControlAction.DOUBLE)?.setLabel(localization.t('action.double'));
    this.buttons.get(ControlAction.CLEAR)?.setLabel(localization.t('action.clear'));
  }

  public override destroy(): void {
    super.destroy({ children: true, texture: false });
  }
}
