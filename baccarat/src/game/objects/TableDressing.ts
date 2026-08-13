import { BitmapText, Container, Graphics, Text } from "pixi.js";

import { BetType } from "../types";

import { Fonts, Palette } from "../Constants";
import type { GameContext } from "../GameContext";
import { formatMoney, shade } from "../utils/Helpers";

/**
 * Static furniture that makes the felt read as a physical table.
 *
 * None of it is interactive and none of it animates, so every piece is drawn
 * once per layout pass and never touched again — the cheapest possible way to
 * buy the "this is a real table" impression.
 */

/** The MIN / MAKS placard standing at the back of the table. */
export class LimitSign extends Container {
  private readonly ctx: GameContext;
  private readonly board = new Graphics();
  private readonly minText: BitmapText;
  private readonly maxText: BitmapText;

  constructor(ctx: GameContext) {
    super();
    this.ctx = ctx;

    this.minText = new BitmapText({ text: "", style: { fontFamily: Fonts.Label, fontSize: 26 } });
    this.maxText = new BitmapText({ text: "", style: { fontFamily: Fonts.Label, fontSize: 26 } });
    this.minText.anchor.set(0, 0.5);
    this.maxText.anchor.set(0, 0.5);

    this.addChild(this.board, this.minText, this.maxText);
    this.refresh();
  }

  resizeTo(width: number): void {
    const height = width * 0.42;
    const legHeight = height * 0.22;

    this.board
      .clear()
      // Stand.
      .roundRect(-width * 0.34, height * 0.5, width * 0.68, legHeight, legHeight * 0.4)
      .fill(0x1d4a56)
      // Board face.
      .roundRect(-width / 2, -height / 2, width, height, height * 0.1)
      .fill(0x14343d)
      .roundRect(-width / 2, -height / 2, width, height, height * 0.1)
      .stroke({ width: Math.max(1.5, width * 0.012), color: 0x2f7286, alpha: 0.9 })
      // Glass highlight across the top third.
      .roundRect(-width / 2 + 4, -height / 2 + 4, width - 8, height * 0.34, height * 0.08)
      .fill({ color: 0xffffff, alpha: 0.05 });

    const scale = Math.min(1, width / 240);
    this.minText.scale.set(scale);
    this.maxText.scale.set(scale);
    this.minText.position.set(-width * 0.36, -height * 0.19);
    this.maxText.position.set(-width * 0.36, height * 0.19);
  }

  /** Reads the Player line's limits — the table minimum and maximum. */
  refresh(): void {
    const { strings, limits, currencySymbol, locale } = this.ctx.config;
    const limit = limits[BetType.Player];
    const money = (value: number): string => formatMoney(value, currencySymbol, locale, 0);
    this.minText.text = `${strings.min}:  ${money(limit.min)}`;
    this.maxText.text = `${strings.max}:  ${money(limit.max)}`;
  }

  override destroy(): void {
    super.destroy({ children: true });
  }
}

/** The dealer's chip float: a wooden tray of coloured columns. */
export class ChipRack extends Container {
  private readonly art = new Graphics();
  private readonly colors: readonly number[];

  constructor(ctx: GameContext) {
    super();
    this.colors = ctx.config.chips.map((chip) => chip.color);
    this.addChild(this.art);
  }

  resizeTo(width: number, height: number): void {
    const columns = Math.max(6, this.colors.length + 2);
    const slot = width / columns;

    this.art
      .clear()
      .roundRect(-width / 2, -height / 2, width, height, height * 0.16)
      .fill(0x3d2a16)
      .roundRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, height * 0.14)
      .fill(0x5a3f21);

    for (let i = 0; i < columns; i++) {
      const color = this.colors[i % this.colors.length] ?? 0xcccccc;
      const x = -width / 2 + slot * (i + 0.5);
      // A column of chips seen edge-on: stacked ellipses.
      for (let s = 0; s < 3; s++) {
        this.art
          .ellipse(x, -height * 0.16 + s * height * 0.17, slot * 0.36, height * 0.11)
          .fill(shade(color, s === 0 ? 0.12 : -0.08 * s));
      }
    }

    this.art
      .roundRect(-width / 2, -height / 2, width, height, height * 0.16)
      .stroke({ width: 2, color: 0x2a1a0c, alpha: 0.85 })
      .rect(-width / 2 + 3, height * 0.22, width - 6, height * 0.1)
      .fill({ color: 0x000000, alpha: 0.25 });
  }

  override destroy(): void {
    super.destroy({ children: true });
  }
}

/** The card shoe: a metal wedge with a lit indicator, sitting on the felt. */
export class CardShoeCase extends Container {
  private readonly art = new Graphics();

  constructor() {
    super();
    this.addChild(this.art);
  }

  resizeTo(width: number, height: number): void {
    this.art
      .clear()
      // Body, angled toward the dealer.
      .moveTo(-width / 2, height / 2)
      .lineTo(-width * 0.34, -height / 2)
      .lineTo(width / 2, -height / 2)
      .lineTo(width / 2, height / 2)
      .closePath()
      .fill(0x9aa3ab)
      .moveTo(-width / 2, height / 2)
      .lineTo(-width * 0.34, -height / 2)
      .lineTo(width / 2, -height / 2)
      .lineTo(width / 2, height / 2)
      .closePath()
      .stroke({ width: 2, color: 0x5c646b })
      // Indicator screen.
      .roundRect(-width * 0.1, -height * 0.28, width * 0.5, height * 0.55, 6)
      .fill(0x241206)
      .roundRect(-width * 0.1, -height * 0.28, width * 0.5, height * 0.55, 6)
      .stroke({ width: 2, color: Palette.gold, alpha: 0.8 })
      .circle(width * 0.15, 0, height * 0.16)
      .fill({ color: 0xe07a12, alpha: 0.9 })
      // Top rail highlight.
      .moveTo(-width * 0.3, -height * 0.44)
      .lineTo(width * 0.44, -height * 0.44)
      .stroke({ width: 3, color: 0xffffff, alpha: 0.25 });
  }

  override destroy(): void {
    super.destroy({ children: true });
  }
}

/**
 * The house name printed on the felt.
 *
 * Plain `Text` on purpose: it is set once per layout pass and never re-rendered,
 * so the bitmap-font rule does not apply and an outlined display face reads far
 * better than a rasterised glyph set would.
 */
export class TableLogo extends Container {
  private readonly ctx: GameContext;
  private caption: Text | null = null;

  constructor(ctx: GameContext) {
    super();
    this.ctx = ctx;
  }

  resizeTo(width: number): void {
    const fontSize = Math.max(24, width * 0.075);
    this.caption?.destroy();

    this.caption = new Text({
      text: this.ctx.config.tableName.toUpperCase(),
      style: {
        fontFamily: this.ctx.config.theme.fontFamily,
        fontSize,
        fontWeight: "700",
        fontStyle: "italic",
        letterSpacing: fontSize * 0.16,
        fill: { color: 0xffffff, alpha: 0.05 },
        stroke: { color: 0xffffff, width: Math.max(1.5, fontSize * 0.035), alpha: 0.18 },
      },
    });
    this.caption.anchor.set(0.5);
    this.addChild(this.caption);
  }

  override destroy(): void {
    this.caption = null;
    super.destroy({ children: true });
  }
}
