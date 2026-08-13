import { BitmapText, Container, Graphics } from "pixi.js";

import { Fonts, Palette } from "../Constants";
import type { GameContext } from "../GameContext";
import { formatMoney } from "../utils/Helpers";

/**
 * The black strip along the bottom: cash on the left, total stake on the right.
 *
 * Both figures roll rather than snap — a balance that ticks up after a win is
 * worth a surprising amount of perceived quality — and both are BitmapText, so
 * a rolling counter costs no texture uploads.
 */
export class StatusBar extends Container {
  private readonly ctx: GameContext;
  private readonly backdrop = new Graphics();
  private readonly cashLabel: BitmapText;
  private readonly cashValue: BitmapText;
  private readonly betLabel: BitmapText;
  private readonly betValue: BitmapText;

  private width_ = 900;
  private height_ = 56;
  private compact = false;
  private balance = 0;
  private bet = 0;
  /** Left inset reserved for the info/settings buttons the scene overlays. */
  private leftInset = 0;

  constructor(ctx: GameContext) {
    super();
    this.ctx = ctx;

    this.cashLabel = makeLabel(ctx.config.strings.cash, 0xffffff, 0.9);
    this.cashValue = makeValue(Palette.goldBright);
    this.betLabel = makeLabel(ctx.config.strings.totalBet, 0xffffff, 0.9);
    this.betValue = makeValue(Palette.goldBright);
    this.betLabel.anchor.set(1, 0.5);
    this.betValue.anchor.set(1, 0.5);

    this.addChild(this.backdrop, this.cashLabel, this.cashValue, this.betLabel, this.betValue);
    this.setBalance(ctx.config.startingBalance, false);
    this.setBet(0);
  }

  resizeTo(width: number, height: number, compact: boolean, leftInset = 0): void {
    this.width_ = width;
    this.height_ = height;
    this.compact = compact;
    this.leftInset = leftInset;

    this.backdrop.clear().rect(0, 0, width, height).fill({ color: 0x000000, alpha: 0.92 });

    this.betLabel.text = (compact
      ? this.ctx.config.strings.totalBetShort
      : this.ctx.config.strings.totalBet
    ).toUpperCase();

    const scale = compact ? Math.min(0.68, height / 44) : Math.min(1, height / 52);
    for (const text of [this.cashLabel, this.betLabel]) text.scale.set(scale);
    for (const text of [this.cashValue, this.betValue]) text.scale.set(scale);

    const mid = height / 2;
    const pad = compact ? 8 : 16;

    this.cashLabel.position.set(leftInset + pad, mid);
    this.cashValue.position.set(leftInset + pad + this.cashLabel.width + pad * 0.6, mid);

    this.betValue.position.set(width - pad, mid);
    this.betLabel.position.set(width - pad - this.betValue.width - pad * 0.6, mid);
  }

  /* ---------------------------------------------------------------- *
   * Values
   * ---------------------------------------------------------------- */

  setBalance(value: number, animate = true): void {
    if (!animate || Math.abs(value - this.balance) < 0.005) {
      this.balance = value;
      this.cashValue.text = this.money(value);
      this.reflow();
      return;
    }

    const from = this.balance;
    this.balance = value;
    this.ctx.animation.counter(from, value, 0.7, (current) => {
      this.cashValue.text = this.money(current);
    });
  }

  setBet(value: number): void {
    this.bet = value;
    this.betValue.text = this.money(value);
    this.betValue.tint = value > 0 ? Palette.goldBright : Palette.white;
    this.reflow();
  }

  private money(value: number): string {
    const { currencySymbol, locale, currencyDecimals } = this.ctx.config;
    return formatMoney(value, currencySymbol, locale, currencyDecimals);
  }

  /** Values change width as digits appear; keep the two blocks aligned. */
  private reflow(): void {
    this.resizeTo(this.width_, this.height_, this.compact, this.leftInset);
  }

  refreshLabels(): void {
    this.cashLabel.text = this.ctx.config.strings.cash.toUpperCase();
    this.setBalance(this.balance, false);
    this.setBet(this.bet);
  }

  override destroy(): void {
    this.ctx.animation.killTweensOf(this.cashValue);
    super.destroy({ children: true });
  }
}

function makeLabel(text: string, tint: number, alpha: number): BitmapText {
  const label = new BitmapText({
    text: text.toUpperCase(),
    style: { fontFamily: Fonts.Label, fontSize: 24 },
  });
  label.anchor.set(0, 0.5);
  label.tint = tint;
  label.alpha = alpha;
  return label;
}

function makeValue(tint: number): BitmapText {
  const value = new BitmapText({
    text: "",
    style: { fontFamily: Fonts.Numeric, fontSize: 28 },
  });
  value.anchor.set(0, 0.5);
  value.tint = tint;
  return value;
}
