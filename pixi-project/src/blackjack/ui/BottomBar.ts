import { Container, Graphics, Text } from "pixi.js";
import gsap from "gsap";
import { Point } from "../animation/CardAnimation";
import { COLORS, DESIGN_HEIGHT, DESIGN_WIDTH } from "../config/gameConfig";
import { formatCurrency } from "../utils/currency";
import { CasinoButton } from "./components/CasinoButton";
import { TEXT_STYLES } from "./textStyles";

const BAR_HEIGHT = 66;
/** Overdraw beyond the design bounds so the bar reaches letterboxed edges. */
const BLEED = 900;
const BAR_TOP = DESIGN_HEIGHT - BAR_HEIGHT;
const CENTER_Y = BAR_TOP + BAR_HEIGHT / 2;

export interface BottomBarCallbacks {
  onInfo: () => void;
  onStrategy: () => void;
  onToggleSound: (enabled: boolean) => void;
}

/**
 * Status strip: cash, total bet and last win, plus the info, sound and
 * strategy controls. Money readouts count up rather than snapping, which makes
 * settlement legible without an extra popup.
 */
export class BottomBar extends Container {
  private readonly balanceValue: Text;
  private readonly betValue: Text;
  private readonly winValue: Text;
  private readonly winLabel: Text;
  private readonly soundButton: CasinoButton;
  private readonly counters = { balance: 0, win: 0 };
  private soundOn = true;

  constructor(callbacks: BottomBarCallbacks) {
    super();

    this.addChild(
      new Graphics()
        .rect(-BLEED, BAR_TOP, DESIGN_WIDTH + BLEED * 2, BAR_HEIGHT + BLEED)
        .fill({ color: COLORS.panel, alpha: 0.92 })
        .moveTo(-BLEED, BAR_TOP)
        .lineTo(DESIGN_WIDTH + BLEED, BAR_TOP)
        .stroke({ width: 2, color: COLORS.gold, alpha: 0.35 }),
    );

    const infoButton = new CasinoButton({
      width: 52,
      shape: "circle",
      variant: "dark",
      icon: (g) => {
        g.circle(0, -8, 3.2).fill({ color: COLORS.goldLight });
        g.roundRect(-3, -2, 6, 16, 3).fill({ color: COLORS.goldLight });
      },
      onTap: callbacks.onInfo,
    });
    infoButton.position.set(52, CENTER_Y);

    this.soundButton = new CasinoButton({
      width: 52,
      shape: "circle",
      variant: "dark",
      icon: (g) => {
        g.moveTo(-12, -5)
          .lineTo(-5, -5)
          .lineTo(3, -13)
          .lineTo(3, 13)
          .lineTo(-5, 5)
          .lineTo(-12, 5)
          .closePath()
          .fill({ color: COLORS.goldLight });
        g.arc(4, 0, 9, -0.9, 0.9).stroke({
          width: 2.5,
          color: COLORS.goldLight,
        });
      },
      onTap: () => {
        this.soundOn = !this.soundOn;
        this.refreshSoundVisual();
        callbacks.onToggleSound(this.soundOn);
      },
    });
    this.soundButton.position.set(122, CENTER_Y);

    const strategyButton = new CasinoButton({
      width: 176,
      height: 48,
      shape: "pill",
      variant: "dark",
      label: "STRATEGY",
      labelStyle: TEXT_STYLES.buttonLabelSmall,
      onTap: callbacks.onStrategy,
    });
    strategyButton.position.set(DESIGN_WIDTH - 108, CENTER_Y);

    const cashLabel = label("CASH", 186);
    this.balanceValue = value(266);

    const betLabel = label("TOTAL BET", 700);
    this.betValue = value(852);

    this.winLabel = label("WIN", 1140);
    this.winValue = value(1216, 0xffe08a);
    this.winLabel.alpha = 0;
    this.winValue.alpha = 0;

    this.addChild(
      infoButton,
      this.soundButton,
      strategyButton,
      cashLabel,
      this.balanceValue,
      betLabel,
      this.betValue,
      this.winLabel,
      this.winValue,
    );
  }

  /** Target for winning chips flying into the balance. */
  get balanceAnchor(): Point {
    return { x: 300, y: CENTER_Y };
  }

  setBalance(amount: number, animated = true): void {
    if (!animated) {
      this.counters.balance = amount;
      this.balanceValue.text = formatCurrency(amount);
      return;
    }
    gsap.to(this.counters, {
      balance: amount,
      duration: 0.5,
      ease: "power2.out",
      overwrite: "auto",
      onUpdate: () => {
        this.balanceValue.text = formatCurrency(this.counters.balance);
      },
    });
  }

  setTotalBet(amount: number): void {
    this.betValue.text = formatCurrency(amount);
  }

  setWin(amount: number): void {
    const visible = amount > 0;
    gsap.to([this.winLabel, this.winValue], {
      alpha: visible ? 1 : 0,
      duration: 0.25,
      overwrite: "auto",
    });
    if (!visible) {
      this.counters.win = 0;
      this.winValue.text = formatCurrency(0);
      return;
    }
    this.counters.win = 0;
    gsap.to(this.counters, {
      win: amount,
      duration: 0.6,
      ease: "power2.out",
      overwrite: "auto",
      onUpdate: () => {
        this.winValue.text = formatCurrency(this.counters.win);
      },
    });
  }

  setSoundOn(enabled: boolean): void {
    this.soundOn = enabled;
    this.refreshSoundVisual();
  }

  private refreshSoundVisual(): void {
    this.soundButton.alpha = this.soundOn ? 1 : 0.45;
  }
}

function label(text: string, x: number): Text {
  const item = new Text({ text, style: TEXT_STYLES.statLabel });
  item.anchor.set(0, 0.5);
  item.position.set(x, CENTER_Y);
  return item;
}

function value(x: number, color?: number): Text {
  const style = color ? TEXT_STYLES.statValue.clone() : TEXT_STYLES.statValue;
  if (color) style.fill = color;
  const item = new Text({ text: formatCurrency(0), style });
  item.anchor.set(0, 0.5);
  item.position.set(x, CENTER_Y);
  return item;
}
