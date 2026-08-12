import { Container, Graphics, Text } from "pixi.js";
import { ResultAnimator } from "../animation/ResultAnimation";
import { COLORS, DESIGN_WIDTH } from "../config/gameConfig";
import { BadgeTone } from "./ScoreBadge";
import { TEXT_STYLES } from "./textStyles";

const TONE_TINTS: Record<BadgeTone, number> = {
  neutral: 0xffffff,
  win: COLORS.win,
  lose: COLORS.lose,
  push: COLORS.push,
  blackjack: COLORS.goldLight,
};

/** Centre-table banner announcing the outcome of the round. */
export class ResultPanel extends Container {
  private readonly backdrop = new Graphics();
  private readonly title: Text;
  private readonly subtitle: Text;
  private readonly animator = new ResultAnimator();

  constructor(y = 430) {
    super();

    this.backdrop
      .roundRect(-390, -80, 780, 160, 26)
      .fill({ color: 0x03080f, alpha: 0.6 });

    this.title = new Text({ text: "", style: TEXT_STYLES.resultBanner });
    this.title.anchor.set(0.5);
    this.title.y = -22;

    this.subtitle = new Text({ text: "", style: TEXT_STYLES.resultSub });
    this.subtitle.anchor.set(0.5);
    this.subtitle.y = 44;

    this.addChild(this.backdrop, this.title, this.subtitle);
    this.position.set(DESIGN_WIDTH / 2, y);
    this.visible = false;
    this.alpha = 0;
    this.eventMode = "none";
  }

  async show(title: string, subtitle: string, tone: BadgeTone): Promise<void> {
    this.title.text = title;
    this.title.style.fill = TONE_TINTS[tone];
    this.subtitle.text = subtitle;
    this.subtitle.visible = subtitle.length > 0;
    await this.animator.bannerIn(this);
    if (tone === "blackjack") this.animator.celebrate(this);
  }

  async hide(): Promise<void> {
    if (!this.visible) return;
    await this.animator.bannerOut(this);
  }
}
