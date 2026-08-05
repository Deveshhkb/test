import { BitmapText, Container, Graphics } from 'pixi.js';
import { AnimationManager } from '../Managers/AnimationManager';
import { FONT } from '../Game/Fonts';
import { Localization } from '../Localization';
import { GameState, Theme } from '../Types';
import { formatCurrency } from '../Utilities/Helpers';
import { clamp, TAU } from '../Utilities/Math';

/** One label/value readout in the HUD strip. */
interface Readout {
  container: Container;
  caption: BitmapText;
  value: BitmapText;
}

/**
 * Heads-up display: balance, total stake, last win, the countdown ring and the
 * round status message.
 *
 * The countdown ring is the only thing here that redraws continuously, and it
 * is quantised to whole percent so it re-tessellates ~100 times over a 25
 * second countdown rather than 1,500 times.
 */
export class Hud extends Container {
  private readonly background = new Graphics();
  private readonly balance: Readout;
  private readonly totalBet: Readout;
  private readonly lastWin: Readout;

  private readonly timerContainer = new Container();
  private readonly timerRing = new Graphics();
  private readonly timerText: BitmapText;

  private readonly statusText: BitmapText;
  private readonly statusBackground = new Graphics();
  /** Positioned by the layout solver. Never animated. */
  private readonly statusContainer = new Container();
  /**
   * Animated by `setStatus`. Splitting layout position from animation offset is
   * what stops a running entrance tween from snapping the pill back to a stale
   * coordinate when a resize lands mid-animation - the two would otherwise
   * fight over the same `x`/`y`, and GSAP's `overwrite` would win.
   */
  private readonly statusInner = new Container();

  private scale_ = 1;
  private timerRadius = 30;
  /** Last drawn ring progress, quantised - guards the redraw. */
  private lastRingStep = -1;
  private urgent = false;
  private currency = '$';

  public constructor(
    private readonly animations: AnimationManager,
    private theme: Theme,
    private localization: Localization,
  ) {
    super();

    this.balance = this.createReadout(localization.t('label.balance'));
    this.totalBet = this.createReadout(localization.t('label.totalBet'));
    this.lastWin = this.createReadout(localization.t('label.lastWin'));

    this.timerText = new BitmapText({
      text: '0',
      style: { fontFamily: FONT.NUMBER, fontSize: 26, fill: theme.text },
    });
    this.timerText.anchor.set(0.5);
    this.timerContainer.addChild(this.timerRing, this.timerText);
    this.timerContainer.visible = false;

    this.statusText = new BitmapText({
      text: '',
      style: { fontFamily: FONT.UI, fontSize: 20, fill: theme.text },
    });
    this.statusText.anchor.set(0.5);
    this.statusInner.addChild(this.statusBackground, this.statusText);
    this.statusContainer.addChild(this.statusInner);
    this.statusContainer.visible = false;

    this.addChild(
      this.background,
      this.balance.container,
      this.totalBet.container,
      this.lastWin.container,
      this.timerContainer,
      this.statusContainer,
    );
  }

  private createReadout(caption: string): Readout {
    const container = new Container();

    const captionText = new BitmapText({
      text: caption.toUpperCase(),
      style: { fontFamily: FONT.UI, fontSize: 11, fill: this.theme.textMuted },
    });
    captionText.anchor.set(0.5, 1);

    const valueText = new BitmapText({
      text: '0',
      style: { fontFamily: FONT.NUMBER, fontSize: 20, fill: this.theme.text },
    });
    valueText.anchor.set(0.5, 0);

    container.addChild(captionText, valueText);
    return { container, caption: captionText, value: valueText };
  }

  public setCurrency(currency: string): void {
    this.currency = currency;
  }

  /* --------------------------------------------------------------------- */
  /* Layout                                                                */
  /* --------------------------------------------------------------------- */

  public resize(width: number, height: number, scale: number): void {
    this.scale_ = scale;

    const captionSize = Math.max(9, 11 * scale);
    const valueSize = Math.max(13, 19 * scale);
    const readouts = [this.balance, this.totalBet, this.lastWin];

    // The countdown always takes the right-hand slice and the three readouts
    // share what is left. Centring the timer in portrait - the obvious
    // alternative - drops it straight on top of the middle readout.
    const readoutArea = width * 0.76;
    const columnWidth = readoutArea / readouts.length;

    readouts.forEach((readout, index) => {
      readout.caption.style.fontSize = captionSize;
      readout.value.style.fontSize = valueSize;
      readout.caption.tint = this.theme.textMuted;
      readout.value.tint = this.theme.text;
      readout.caption.position.set(0, -2 * scale);
      readout.value.position.set(0, 2 * scale);
      readout.container.position.set(columnWidth * (index + 0.5), height / 2);
    });

    this.timerRadius = Math.min(height * 0.4, 34 * scale, width * 0.1);
    this.timerText.style.fontSize = this.timerRadius * 0.85;
    this.timerContainer.position.set(width - this.timerRadius - 12 * scale, height / 2);
    // Force a ring redraw at the new radius.
    this.lastRingStep = -1;

    this.background.clear();
    this.background
      .roundRect(0, 0, width, height, 10 * scale)
      .fill({ color: this.theme.panel, alpha: 0.88 })
      .stroke({ width: Math.max(1, scale), color: this.theme.panelBorder });

    this.statusText.style.fontSize = Math.max(12, 19 * scale);
    this.drawStatusBackground();
  }

  /**
   * Place the status pill.
   *
   * Driven by the scene's layout solver rather than derived from the HUD's own
   * box: the pill needs a row of its own, and only the solver knows where the
   * free space is in the current orientation.
   *
   * @param x,y position in this container's local space.
   */
  public setStatusPosition(x: number, y: number): void {
    this.statusContainer.position.set(x, y);
  }

  public setTheme(theme: Theme): void {
    this.theme = theme;
  }

  public setLocalization(localization: Localization): void {
    this.localization = localization;
    this.balance.caption.text = localization.t('label.balance').toUpperCase();
    this.totalBet.caption.text = localization.t('label.totalBet').toUpperCase();
    this.lastWin.caption.text = localization.t('label.lastWin').toUpperCase();
  }

  /* --------------------------------------------------------------------- */
  /* Values                                                                */
  /* --------------------------------------------------------------------- */

  /**
   * Roll the balance to a new figure.
   *
   * Counting up rather than snapping is what makes a win feel paid rather than
   * merely reported. The tween runs on a proxy so the text object is only
   * touched from `onUpdate`.
   */
  public setBalance(value: number, animate = true): void {
    if (!animate) {
      this.balance.value.text = formatCurrency(value, this.currency, 0);
      return;
    }

    const current = parseFloat(this.balance.value.text.replace(/[^\d.-]/g, '')) || 0;
    const proxy = { value: current };

    this.animations.to(proxy, {
      value,
      duration: 0.7,
      ease: 'power2.out',
      overwrite: 'auto',
      onUpdate: () => {
        this.balance.value.text = formatCurrency(proxy.value, this.currency, 0);
      },
      onComplete: () => {
        this.balance.value.text = formatCurrency(value, this.currency, 0);
      },
    });
  }

  public setTotalBet(value: number): void {
    this.totalBet.value.text = formatCurrency(value, this.currency, 0);
    if (value > 0) this.animations.punch(this.totalBet.value, 0.18, 0.28);
  }

  public setLastWin(value: number): void {
    this.lastWin.value.text = formatCurrency(value, this.currency, 0);
    this.lastWin.value.tint = value > 0 ? this.theme.success : this.theme.text;
    if (value > 0) this.animations.punch(this.lastWin.container, 0.22, 0.4);
  }

  /* --------------------------------------------------------------------- */
  /* Countdown                                                             */
  /* --------------------------------------------------------------------- */

  public showTimer(): void {
    this.timerContainer.visible = true;
    this.animations.fadeIn(this.timerContainer, 0.2);
  }

  public hideTimer(): void {
    if (!this.timerContainer.visible) return;
    this.animations.fadeOut(this.timerContainer, 0.25);
    this.urgent = false;
  }

  /**
   * Update the countdown.
   *
   * @param remaining seconds left
   * @param total     seconds the round started with
   * @param urgent    switch to the last-call styling
   */
  public setTimer(remaining: number, total: number, urgent: boolean): void {
    const seconds = Math.max(0, Math.ceil(remaining));
    const label = String(seconds);
    if (this.timerText.text !== label) {
      this.timerText.text = label;
      // A tick pulse on every whole second, stronger during last call.
      this.animations.punch(this.timerText, urgent ? 0.3 : 0.16, urgent ? 0.34 : 0.26);
    }

    const progress = total > 0 ? clamp(remaining / total, 0, 1) : 0;
    // Quantise to whole percent so the arc is not re-tessellated every frame.
    const step = Math.round(progress * 100);

    if (step !== this.lastRingStep || urgent !== this.urgent) {
      this.lastRingStep = step;
      this.drawTimerRing(step / 100, urgent);
    }

    if (urgent !== this.urgent) {
      this.urgent = urgent;
      this.timerText.tint = urgent ? this.theme.danger : this.theme.text;
    }
  }

  private drawTimerRing(progress: number, urgent: boolean): void {
    const radius = this.timerRadius;
    const thickness = Math.max(3, radius * 0.16);
    const color = urgent ? this.theme.danger : this.theme.gold;

    this.timerRing.clear();
    this.timerRing
      .circle(0, 0, radius)
      .fill({ color: 0x000000, alpha: 0.4 })
      .stroke({ width: thickness, color: this.theme.panelBorder });

    if (progress <= 0) return;

    // Sweep clockwise from 12 o'clock, draining as time runs out.
    const start = -Math.PI / 2;
    this.timerRing
      .arc(0, 0, radius, start, start + TAU * progress)
      .stroke({ width: thickness, color, cap: 'round' });
  }

  /* --------------------------------------------------------------------- */
  /* Status message                                                        */
  /* --------------------------------------------------------------------- */

  /** Announce the round state ("Place your bets", "No more bets"). */
  public setStatus(state: GameState): void {
    const key = STATUS_KEYS[state];
    if (!key) {
      this.hideStatus();
      return;
    }

    const message = this.localization.t(key);
    const emphasise = state === GameState.BETTING_CLOSED || state === GameState.LAST_CALL;

    this.statusText.text = message.toUpperCase();
    this.statusText.tint = emphasise ? this.theme.danger : this.theme.text;
    this.drawStatusBackground();

    if (!this.statusContainer.visible) {
      this.statusContainer.visible = true;
      this.statusContainer.alpha = 1;
      this.statusInner.position.set(0, 0);
      this.animations.slideIn(this.statusInner, { y: -12 * this.scale_ }, 0.34);
    } else {
      this.animations.punch(this.statusInner, 0.08, 0.3);
    }
  }

  public hideStatus(): void {
    if (!this.statusContainer.visible) return;
    this.animations.fadeOut(this.statusContainer, 0.25);
  }

  private drawStatusBackground(): void {
    const paddingX = 18 * this.scale_;
    const paddingY = 8 * this.scale_;
    const width = this.statusText.width + paddingX * 2;
    const height = this.statusText.height + paddingY * 2;

    this.statusBackground.clear();
    this.statusBackground
      .roundRect(-width / 2, -height / 2, width, height, height / 2)
      .fill({ color: this.theme.panel, alpha: 0.9 })
      .stroke({ width: Math.max(1, this.scale_), color: this.theme.panelBorder });
  }

  public override destroy(): void {
    this.animations.killTweensOf(this.timerText);
    this.animations.killTweensOf(this.statusInner);
    super.destroy({ children: true, texture: false });
  }
}

/** Which states put a message on screen, and what it says. */
const STATUS_KEYS: Partial<Record<GameState, string>> = {
  [GameState.WAITING]: 'state.waiting',
  [GameState.BETTING_OPEN]: 'state.bettingOpen',
  [GameState.LAST_CALL]: 'state.lastCall',
  [GameState.BETTING_CLOSED]: 'state.bettingClosed',
  [GameState.SPINNING]: 'state.spinning',
  [GameState.BALL_ROLLING]: 'state.ballRolling',
};
