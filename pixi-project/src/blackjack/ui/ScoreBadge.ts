import { Container, Graphics, Text } from "pixi.js";
import gsap from "gsap";
import { COLORS } from "../config/gameConfig";
import { TEXT_STYLES } from "./textStyles";

export type BadgeTone = "neutral" | "win" | "lose" | "push" | "blackjack";

const TONE_COLORS: Record<BadgeTone, number> = {
  neutral: 0x0d1b28,
  win: 0x14683c,
  lose: 0x7a1f22,
  push: 0x6a5514,
  blackjack: 0x7a5a12,
};

const TONE_RIMS: Record<BadgeTone, number> = {
  neutral: COLORS.gold,
  win: COLORS.win,
  lose: COLORS.lose,
  push: COLORS.push,
  blackjack: COLORS.goldLight,
};

/** Compact pill showing a hand total or a round outcome. */
export class ScoreBadge extends Container {
  private readonly background = new Graphics();
  private readonly labelText: Text;
  private tone: BadgeTone = "neutral";
  private shown = false;

  constructor(private readonly minWidth = 74) {
    super();
    this.labelText = new Text({ text: "", style: TEXT_STYLES.scoreBadge });
    this.labelText.anchor.set(0.5);
    this.addChild(this.background, this.labelText);
    this.visible = false;
    this.alpha = 0;
    this.scale.set(0.8);
  }

  setValue(text: string, tone: BadgeTone = "neutral"): void {
    this.labelText.text = text;
    this.tone = tone;
    this.redraw();
    this.show();
  }

  show(): void {
    if (this.shown) return;
    this.shown = true;
    this.visible = true;
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.scale);
    gsap.to(this, { alpha: 1, duration: 0.18, ease: "power1.out" });
    gsap.fromTo(
      this.scale,
      { x: 0.7, y: 0.7 },
      { x: 1, y: 1, duration: 0.28, ease: "back.out(2)" },
    );
  }

  hide(animated = true): void {
    if (!this.shown && !this.visible) return;
    this.shown = false;
    gsap.killTweensOf(this);
    if (!animated) {
      this.visible = false;
      this.alpha = 0;
      return;
    }
    gsap.to(this, {
      alpha: 0,
      duration: 0.16,
      ease: "power1.in",
      onComplete: () => {
        this.visible = false;
      },
    });
  }

  /** Emphasises a value change (a new card, a final total). */
  bump(): void {
    gsap.fromTo(
      this.scale,
      { x: 1, y: 1 },
      {
        x: 1.18,
        y: 1.18,
        duration: 0.16,
        yoyo: true,
        repeat: 1,
        ease: "power2.out",
      },
    );
  }

  private redraw(): void {
    const paddingX = 22;
    const width = Math.max(this.minWidth, this.labelText.width + paddingX * 2);
    const height = 46;

    this.background
      .clear()
      .roundRect(-width / 2, -height / 2, width, height, height / 2)
      .fill({ color: TONE_COLORS[this.tone], alpha: 0.92 })
      .roundRect(-width / 2, -height / 2, width, height, height / 2)
      .stroke({ width: 2, color: TONE_RIMS[this.tone], alpha: 0.9 });
  }
}
