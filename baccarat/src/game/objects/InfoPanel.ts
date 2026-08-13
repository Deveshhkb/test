import { BitmapText, Container, Graphics } from "pixi.js";

import { Fonts, Palette } from "../Constants";
import type { GameContext } from "../GameContext";
import { Ease } from "../managers/AnimationManager";
import { BetType } from "../types";
import { formatMoney } from "../utils/Helpers";
import { ActionButton } from "./ActionButton";

interface InfoRow {
  readonly name: BitmapText;
  readonly odds: BitmapText;
  readonly limit: BitmapText;
}

/**
 * The paytable behind the ⓘ button: what each wager pays and what it accepts.
 *
 * Built from config rather than hard-coded copy, so changing a payout or a
 * limit at runtime updates this panel with everything else — there is no second
 * place for the numbers to drift out of sync.
 */
export class InfoPanel extends Container {
  private readonly ctx: GameContext;
  private readonly scrim = new Graphics();
  private readonly frame = new Graphics();
  private readonly title: BitmapText;
  private readonly heading: InfoRow;
  private readonly rows: InfoRow[] = [];
  private readonly closeButton: ActionButton;

  private open = false;
  private boxWidth = 620;
  private boxHeight = 380;

  constructor(ctx: GameContext) {
    super();
    this.ctx = ctx;

    this.title = new BitmapText({
      text: ctx.config.tableName.toUpperCase(),
      style: { fontFamily: Fonts.Label, fontSize: 34 },
    });
    this.title.anchor.set(0.5, 0);
    this.title.tint = Palette.goldBright;

    this.heading = this.makeRow(0x9aa0a6);
    this.closeButton = new ActionButton(ctx, {
      icon: "close",
      highlight: true,
      onTap: () => this.setOpen(false),
    });

    this.addChild(this.scrim, this.frame, this.title);
    this.addRow(this.heading);
    this.addChild(this.closeButton);

    this.visible = false;
    this.alpha = 0;

    // The scrim swallows taps so the table cannot be bet on behind the panel.
    ctx.input.makeInteractive(this.scrim, { sound: false, onTap: () => this.setOpen(false) });
  }

  private makeRow(tint: number): InfoRow {
    const make = (align: number, font: string): BitmapText => {
      const text = new BitmapText({ text: "", style: { fontFamily: font, fontSize: 26 } });
      text.anchor.set(align, 0.5);
      text.tint = tint;
      return text;
    };
    return { name: make(0, Fonts.Label), odds: make(0.5, Fonts.Numeric), limit: make(1, Fonts.Numeric) };
  }

  private addRow(row: InfoRow): void {
    this.addChild(row.name, row.odds, row.limit);
  }

  get isOpen(): boolean {
    return this.open;
  }

  /* ---------------------------------------------------------------- *
   * Content
   * ---------------------------------------------------------------- */

  /** Rebuilds from the live config. Called on open and after `updateConfig`. */
  refresh(): void {
    const { strings, payouts, limits, features, currencySymbol, locale } = this.ctx.config;

    const active: Array<{ type: BetType; label: string }> = [
      { type: BetType.Player, label: strings.player },
      { type: BetType.Banker, label: strings.banker },
      { type: BetType.Tie, label: strings.tie },
    ];
    if (features.sidebets) {
      active.push(
        { type: BetType.PlayerPair, label: strings.playerPair },
        { type: BetType.BankerPair, label: strings.bankerPair },
        { type: BetType.PerfectPair, label: strings.perfectPair },
        { type: BetType.Natural, label: strings.natural },
      );
    }

    while (this.rows.length < active.length) {
      const row = this.makeRow(0xffffff);
      this.rows.push(row);
      this.addRow(row);
    }

    this.title.text = this.ctx.config.tableName.toUpperCase();
    this.heading.name.text = "";
    this.heading.odds.text = "1:1";
    this.heading.limit.text = `${strings.min} / ${strings.max}`;
    this.heading.odds.alpha = 0;

    const money = (value: number): string => formatMoney(value, currencySymbol, locale, 0);

    this.rows.forEach((row, i) => {
      const entry = active[i];
      const visible = entry !== undefined;
      row.name.visible = visible;
      row.odds.visible = visible;
      row.limit.visible = visible;
      if (!entry) return;

      const odds = payouts[entry.type];
      row.name.text = entry.label.toUpperCase();
      row.odds.text = `${Number.isInteger(odds) ? odds : odds.toFixed(2)}:1`;
      row.limit.text = `${money(limits[entry.type].min)} - ${money(limits[entry.type].max)}`;
    });

    this.layoutRows();
  }

  /* ---------------------------------------------------------------- *
   * Layout
   * ---------------------------------------------------------------- */

  resizeTo(screenWidth: number, screenHeight: number): void {
    this.boxWidth = Math.min(640, screenWidth * 0.86);
    this.boxHeight = Math.min(420, screenHeight * 0.8);

    this.scrim.clear().rect(0, 0, screenWidth, screenHeight).fill({ color: 0x000000, alpha: 0.62 });
    this.scrim.position.set(-screenWidth / 2, -screenHeight / 2);

    const w = this.boxWidth;
    const h = this.boxHeight;
    this.frame
      .clear()
      .roundRect(-w / 2, -h / 2, w, h, 16)
      .fill({ color: 0x0d1218, alpha: 0.97 })
      .roundRect(-w / 2, -h / 2, w, h, 16)
      .stroke({ width: 2.5, color: Palette.gold, alpha: 0.9 });

    this.title.position.set(0, -h / 2 + 18);
    this.title.scale.set(Math.min(1, w / 620));
    this.closeButton.setRadius(Math.max(14, w * 0.035));
    this.closeButton.position.set(w / 2 - 14, -h / 2 + 14);

    this.layoutRows();
  }

  private layoutRows(): void {
    const w = this.boxWidth;
    const h = this.boxHeight;
    const top = -h / 2 + 78;
    const usable = h - 100;
    const count = Math.max(1, this.rows.filter((row) => row.name.visible).length + 1);
    const step = Math.min(46, usable / count);
    const scale = Math.min(1, w / 620, step / 34);

    const place = (row: InfoRow, y: number): void => {
      row.name.position.set(-w / 2 + 28, y);
      row.odds.position.set(0, y);
      row.limit.position.set(w / 2 - 28, y);
      row.name.scale.set(scale);
      row.odds.scale.set(scale);
      row.limit.scale.set(scale);
    };

    place(this.heading, top);
    let index = 0;
    for (const row of this.rows) {
      if (!row.name.visible) continue;
      index += 1;
      place(row, top + index * step);
    }
  }

  /* ---------------------------------------------------------------- *
   * Visibility
   * ---------------------------------------------------------------- */

  toggle(): boolean {
    this.setOpen(!this.open);
    return this.open;
  }

  setOpen(open: boolean): void {
    if (this.open === open) return;
    this.open = open;
    if (open) this.refresh();

    this.ctx.animation.killTweensOf(this);
    this.ctx.animation.killTweensOf(this.scale);

    if (open) {
      this.visible = true;
      this.ctx.animation.to(this, { alpha: 1, duration: 0.2 });
      this.ctx.animation.fromTo(
        this.scale,
        { x: 0.9, y: 0.9 },
        { x: 1, y: 1, duration: 0.32, ease: Ease.uiIn },
      );
    } else {
      this.ctx.animation.to(this, {
        alpha: 0,
        duration: 0.2,
        onComplete: () => {
          this.visible = false;
        },
      });
    }
  }

  override destroy(): void {
    this.ctx.animation.killTweensOf(this);
    this.ctx.animation.killTweensOf(this.scale);
    this.rows.length = 0;
    super.destroy({ children: true });
  }
}
