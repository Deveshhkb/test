import { BitmapText, Container, Graphics } from "pixi.js";

import { Fonts, Palette } from "../Constants";
import type { GameContext } from "../GameContext";
import { formatAmount } from "../utils/Helpers";

interface Readout {
  readonly caption: BitmapText;
  readonly value: BitmapText;
  current: number;
}

/**
 * Wallet and stake readout.
 *
 * Values roll rather than jump — a balance that ticks up after a win is worth
 * a surprising amount of perceived quality — and every number is BitmapText, so
 * a rolling counter costs no texture uploads.
 */
export class InfoBar extends Container {
  private readonly ctx: GameContext;
  private readonly backdrop = new Graphics();
  private readonly balance: Readout;
  private readonly bet: Readout;
  private readonly win: Readout;
  private readonly commission: Readout;
  private readonly tableLabel: BitmapText;

  private width_ = 900;
  private height_ = 78;

  constructor(ctx: GameContext) {
    super();
    this.ctx = ctx;

    this.tableLabel = new BitmapText({
      text: ctx.config.tableName.toUpperCase(),
      style: { fontFamily: Fonts.Label, fontSize: 20 },
    });
    this.tableLabel.anchor.set(0, 0.5);
    this.tableLabel.tint = Palette.gold;

    this.balance = this.makeReadout("BALANCE");
    this.bet = this.makeReadout("TOTAL BET");
    this.win = this.makeReadout("POTENTIAL WIN");
    this.commission = this.makeReadout("COMMISSION");

    this.addChild(this.backdrop, this.tableLabel);
    for (const readout of [this.balance, this.bet, this.win, this.commission]) {
      this.addChild(readout.caption, readout.value);
    }

    this.commission.caption.visible = ctx.config.features.commissionDisplay;
    this.commission.value.visible = ctx.config.features.commissionDisplay;
  }

  private makeReadout(caption: string): Readout {
    const captionText = new BitmapText({
      text: caption,
      style: { fontFamily: Fonts.Label, fontSize: 17 },
    });
    captionText.anchor.set(0.5, 1);
    captionText.alpha = 0.62;

    const valueText = new BitmapText({
      text: "0",
      style: { fontFamily: Fonts.Numeric, fontSize: 32 },
    });
    valueText.anchor.set(0.5, 0);

    return { caption: captionText, value: valueText, current: 0 };
  }

  resizeTo(width: number, height: number, compact: boolean): void {
    this.width_ = width;
    this.height_ = height;

    this.backdrop
      .clear()
      .roundRect(0, 0, width, height, 14)
      .fill({ color: 0x04120c, alpha: 0.74 })
      .roundRect(0, 0, width, height, 14)
      .stroke({ width: 1.5, color: Palette.gold, alpha: 0.28 });

    this.tableLabel.position.set(18, height / 2);
    this.tableLabel.visible = !compact;

    const readouts = this.visibleReadouts();
    const left = compact ? 12 : this.tableLabel.width + 44;
    const usable = width - left - 18;
    const step = usable / readouts.length;
    const scale = compact ? 0.78 : Math.min(1, step / 190);

    readouts.forEach((readout, index) => {
      const x = left + step * (index + 0.5);
      readout.caption.position.set(x, height * 0.44);
      readout.value.position.set(x, height * 0.46);
      readout.caption.scale.set(scale);
      readout.value.scale.set(scale);
    });
  }

  private visibleReadouts(): Readout[] {
    const out = [this.balance, this.bet, this.win];
    if (this.ctx.config.features.commissionDisplay) out.push(this.commission);
    return out;
  }

  /* ---------------------------------------------------------------- *
   * Values
   * ---------------------------------------------------------------- */

  setBalance(value: number, animate = true): void {
    this.setValue(this.balance, value, animate);
  }

  setBet(value: number): void {
    this.setValue(this.bet, value, false);
    this.bet.value.tint = value > 0 ? Palette.goldBright : Palette.white;
  }

  setPotentialWin(value: number): void {
    this.setValue(this.win, value, false);
    this.win.value.tint = value > 0 ? Palette.tie : Palette.white;
  }

  setCommission(value: number): void {
    this.setValue(this.commission, value, false);
    this.commission.value.tint = value > 0 ? Palette.danger : Palette.white;
  }

  private setValue(readout: Readout, value: number, animate: boolean): void {
    const locale = this.ctx.config.locale;
    if (!animate || Math.abs(value - readout.current) < 1) {
      readout.current = value;
      readout.value.text = formatAmount(Math.round(value), locale);
      return;
    }

    const from = readout.current;
    readout.current = value;
    this.ctx.animation.counter(from, value, 0.7, (current) => {
      readout.value.text = formatAmount(Math.round(current), locale);
    });
  }

  refreshLabels(): void {
    this.tableLabel.text = this.ctx.config.tableName.toUpperCase();
    const showCommission = this.ctx.config.features.commissionDisplay;
    this.commission.caption.visible = showCommission;
    this.commission.value.visible = showCommission;
    this.resizeTo(this.width_, this.height_, this.ctx.metrics.isPortrait);
  }

  override destroy(): void {
    for (const readout of [this.balance, this.bet, this.win, this.commission]) {
      this.ctx.animation.killTweensOf(readout.value);
    }
    super.destroy({ children: true });
  }
}
