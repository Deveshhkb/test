import { Container, Graphics } from "pixi.js";

import { CARD_HEIGHT, CARD_WIDTH, Fonts } from "../Constants";
import type { GameContext } from "../GameContext";
import { Ease } from "../managers/AnimationManager";
import { HandSide } from "../types";
import { shade } from "../utils/Helpers";
import { ShadowLabel } from "./ShadowLabel";

/**
 * The printed card area for one hand: a name banner over two outlined card
 * slots, with a badge that fills in with the running total once cards land.
 *
 * An empty stretch of felt where the cards *will* be reads as an unfinished
 * screen. Printing the slots tells the player where to look before anything is
 * dealt, and gives the dealt cards something to sit on afterwards — which is
 * exactly what a real layout does.
 */
export class HandZone extends Container {
  private readonly ctx: GameContext;
  private readonly side: HandSide;
  private readonly slots = new Graphics();
  private readonly banner = new Graphics();
  private readonly title: ShadowLabel;
  private readonly totalPlate = new Graphics();
  private readonly total: ShadowLabel;

  private zoneWidth = 420;
  private cardScale = 1;
  private hasHand = false;
  private value = 0;

  constructor(ctx: GameContext, side: HandSide, label: string, titleColor: number) {
    super();
    this.ctx = ctx;
    this.side = side;

    this.title = new ShadowLabel({
      text: label.toUpperCase(),
      fontFamily: Fonts.Label,
      fontSize: 46,
      tint: titleColor,
    });

    this.total = new ShadowLabel({
      text: "",
      fontFamily: Fonts.Score,
      fontSize: 64,
      tint: 0xffffff,
    });

    this.addChild(this.slots, this.banner, this.title, this.totalPlate, this.total);
  }

  /** `cardScale` matches the scale the card manager renders hands at. */
  resizeTo(width: number, cardScale: number): void {
    this.zoneWidth = width;
    this.cardScale = cardScale;
    this.redraw();
  }

  /** Where the hand's cards should be centred, in this zone's local space. */
  get cardAnchorY(): number {
    return 0;
  }

  private redraw(): void {
    const color = this.tone();
    const cw = CARD_WIDTH * this.cardScale;
    const ch = CARD_HEIGHT * this.cardScale;
    const gap = 10 * this.cardScale;
    const radius = 8 * this.cardScale;

    // Two card outlines, centred — the third card lies to the side and does
    // not get a printed slot, exactly as on a real felt.
    this.slots.clear();
    for (const direction of [-1, 1]) {
      const x = direction * (cw + gap) * 0.5 - cw / 2;
      this.slots.roundRect(x, -ch / 2, cw, ch, radius);
    }
    this.slots
      .fill({ color: 0x000000, alpha: this.hasHand ? 0 : 0.1 })
      .stroke({
        width: Math.max(1.5, 2 * this.cardScale),
        color: shade(color, 0.25),
        alpha: this.hasHand ? 0.1 : 0.65,
      });

    // Name banner above the slots.
    const bannerW = Math.min(this.zoneWidth, cw * 2 + gap + 40);
    const bannerH = 52 * this.cardScale + 14;
    const bannerY = -ch / 2 - bannerH - 14 * this.cardScale;

    this.banner
      .clear()
      .roundRect(-bannerW / 2, bannerY, bannerW, bannerH, bannerH * 0.28)
      .fill({ color: 0x080a10, alpha: 0.62 })
      .moveTo(-bannerW / 2 + 10, bannerY + bannerH)
      .lineTo(bannerW / 2 - 10, bannerY + bannerH)
      .stroke({ width: 2.5, color, alpha: 0.9 });

    const titleScale = Math.min(1, bannerW / 320, this.cardScale * 1.25);
    this.title.setFontScale(titleScale);
    this.title.position.set(0, bannerY + bannerH / 2);

    // Total badge, revealed with the hand.
    const plateSize = 74 * this.cardScale;
    this.totalPlate.clear();
    if (this.hasHand) {
      this.totalPlate
        .roundRect(-plateSize / 2, -plateSize / 2, plateSize, plateSize, plateSize * 0.24)
        .fill({ color: shade(color, -0.62), alpha: 0.96 })
        .roundRect(-plateSize / 2, -plateSize / 2, plateSize, plateSize, plateSize * 0.24)
        .stroke({ width: Math.max(2, 3 * this.cardScale), color: shade(color, 0.35), alpha: 1 });
    }
    this.totalPlate.position.set(0, ch / 2 + plateSize * 0.72);
    this.total.position.set(0, ch / 2 + plateSize * 0.72);
    this.total.setFontScale(this.cardScale);
    this.total.visible = this.hasHand;
  }

  private tone(): number {
    const theme = this.ctx.config.theme;
    return this.side === HandSide.Player ? theme.player : theme.banker;
  }

  /* ---------------------------------------------------------------- *
   * State
   * ---------------------------------------------------------------- */

  setHandPresent(present: boolean): void {
    if (this.hasHand === present) return;
    this.hasHand = present;
    this.redraw();
  }

  setTotal(value: number, animate = true): void {
    if (value === this.value && animate) return;
    this.value = value;
    this.total.text = String(value);
    if (!animate) return;

    this.ctx.animation.killTweensOf(this.total.scale);
    this.ctx.animation.fromTo(
      this.total.scale,
      { x: 1.45, y: 1.45 },
      { x: 1, y: 1, duration: 0.32, ease: Ease.uiIn },
    );
  }

  playWin(): void {
    this.ctx.animation.killTweensOf(this.scale);
    this.ctx.animation.fromTo(
      this.scale,
      { x: 1, y: 1 },
      { x: 1.06, y: 1.06, duration: 0.3, ease: Ease.uiIn, yoyo: true, repeat: 1 },
    );
  }

  playLose(): void {
    this.ctx.animation.to(this, { alpha: 0.5, duration: this.ctx.config.animation.loseFadeDuration });
  }

  reset(): void {
    this.ctx.animation.killTweensOf(this);
    this.ctx.animation.killTweensOf(this.scale);
    this.alpha = 1;
    this.scale.set(1);
    this.value = 0;
    this.hasHand = false;
    this.total.text = "";
    this.redraw();
  }

  setLabel(label: string): void {
    this.title.text = label.toUpperCase();
  }

  override destroy(): void {
    this.ctx.animation.killTweensOf(this);
    this.ctx.animation.killTweensOf(this.scale);
    this.ctx.animation.killTweensOf(this.total.scale);
    super.destroy({ children: true });
  }
}
