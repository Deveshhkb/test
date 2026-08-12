import { Container, Graphics, Rectangle, Text } from "pixi.js";
import gsap from "gsap";
import { Point } from "../animation/CardAnimation";
import { ChipAnimator } from "../animation/ChipAnimation";
import { COLORS, SeatConfig } from "../config/gameConfig";
import { TextureFactory } from "../utils/textures";
import { formatCurrency } from "../utils/currency";
import { ChipStackView } from "./ChipStackView";
import { BadgeTone, ScoreBadge } from "./ScoreBadge";
import { TEXT_STYLES } from "./textStyles";

const BOX_WIDTH = 190;
const BOX_HEIGHT = 250;

/** Local offsets inside a seat, chosen so chips, cards and labels never clash. */
const CHIP_OFFSET: Point = { x: -58, y: 74 };
const HAND_OFFSET: Point = { x: 30, y: -62 };
const LABEL_OFFSET: Point = { x: -58, y: 146 };
const SCORE_OFFSET: Point = { x: 86, y: 74 };
const RESULT_OFFSET: Point = { x: 86, y: 146 };

export interface BetSpotCallbacks {
  onPlace: (seatId: number) => void;
  onRemove: (seatId: number) => void;
}

/**
 * One betting position: the printed box, its chip stack, the wager label, the
 * running hand total and the round result. It renders state and forwards
 * pointer intent; it never decides whether a bet is legal.
 */
export class BetSpot extends Container {
  readonly seatId: number;
  readonly stack: ChipStackView;
  /**
   * Score and result badges live in their own container so they can be added
   * to a layer above the cards; a five-card fan would otherwise cover them.
   */
  readonly badges = new Container();

  private readonly box = new Graphics();
  private readonly highlight = new Graphics();
  private readonly hint: Text;
  private readonly betLabel: Text;
  private readonly scoreBadge = new ScoreBadge();
  private readonly resultBadge = new ScoreBadge(120);
  private interactiveSpot = false;
  private activeSeat = false;
  private highlightTween: gsap.core.Tween | null = null;

  constructor(
    private readonly seat: SeatConfig,
    chipLayer: Container,
    textures: TextureFactory,
    chipAnimator: ChipAnimator,
    private readonly callbacks: BetSpotCallbacks,
  ) {
    super();
    this.seatId = seat.id;
    this.position.set(seat.x, seat.y);

    this.drawBox();
    this.addChild(this.highlight, this.box);

    this.hint = new Text({
      text: "CLICK TO\nPLACE BET",
      style: TEXT_STYLES.seatHint,
    });
    this.hint.anchor.set(0.5);
    this.hint.alpha = 0.75;
    this.addChild(this.hint);

    this.betLabel = new Text({ text: "", style: TEXT_STYLES.betAmount });
    this.betLabel.anchor.set(0.5);
    this.betLabel.position.set(LABEL_OFFSET.x, LABEL_OFFSET.y);
    this.betLabel.visible = false;
    this.addChild(this.betLabel);

    this.scoreBadge.position.set(SCORE_OFFSET.x, SCORE_OFFSET.y);
    this.resultBadge.position.set(RESULT_OFFSET.x, RESULT_OFFSET.y);
    this.badges.position.set(seat.x, seat.y);
    this.badges.addChild(this.scoreBadge, this.resultBadge);

    this.stack = new ChipStackView(
      chipLayer,
      textures,
      chipAnimator,
      this.chipAnchor,
    );

    this.eventMode = "static";
    this.hitArea = new Rectangle(
      -BOX_WIDTH / 2,
      -BOX_HEIGHT / 2,
      BOX_WIDTH,
      BOX_HEIGHT,
    );
    this.cursor = "default";
    this.attachEvents();
  }

  /** Where cards for this seat are fanned, in design space. */
  get handOrigin(): Point {
    return { x: this.seat.x + HAND_OFFSET.x, y: this.seat.y + HAND_OFFSET.y };
  }

  /** Where chips land, in design space. */
  get chipAnchor(): Point {
    return { x: this.seat.x + CHIP_OFFSET.x, y: this.seat.y + CHIP_OFFSET.y };
  }

  setBetAmount(amount: number): void {
    const hasBet = amount > 0;
    this.betLabel.text = hasBet ? formatCurrency(amount) : "";
    this.betLabel.visible = hasBet;
    this.hint.visible = !hasBet && this.interactiveSpot;
    if (hasBet) {
      gsap.fromTo(
        this.betLabel.scale,
        { x: 1.25, y: 1.25 },
        { x: 1, y: 1, duration: 0.22, ease: "back.out(2)", overwrite: "auto" },
      );
    }
  }

  /** Enables placing/removing chips (betting phase only). */
  setInteractive(interactive: boolean): void {
    this.interactiveSpot = interactive;
    this.eventMode = interactive ? "static" : "none";
    this.cursor = interactive ? "pointer" : "default";
    this.hint.visible = interactive && !this.betLabel.visible;
    gsap.to(this.box, {
      alpha: interactive ? 1 : 0.75,
      duration: 0.2,
      overwrite: "auto",
    });
  }

  /** Marks this seat as the one currently acting. */
  setActive(active: boolean): void {
    if (this.activeSeat === active) return;
    this.activeSeat = active;
    this.highlightTween?.kill();
    this.highlightTween = null;

    if (!active) {
      gsap.to(this.highlight, { alpha: 0, duration: 0.2, overwrite: "auto" });
      return;
    }

    this.highlight.alpha = 0.35;
    this.highlightTween = gsap.to(this.highlight, {
      alpha: 0.85,
      duration: 0.75,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }

  setScore(text: string, tone: BadgeTone = "neutral"): void {
    this.scoreBadge.setValue(text, tone);
    this.scoreBadge.bump();
  }

  hideScore(): void {
    this.scoreBadge.hide();
  }

  showResult(text: string, tone: BadgeTone): void {
    this.resultBadge.setValue(text, tone);
  }

  hideResult(): void {
    this.resultBadge.hide();
  }

  /** Returns the seat to its empty betting-phase appearance. */
  reset(): void {
    this.setActive(false);
    this.hideScore();
    this.hideResult();
    this.setBetAmount(0);
  }

  destroy(options?: Parameters<Container["destroy"]>[0]): void {
    this.highlightTween?.kill();
    gsap.killTweensOf(this.box);
    gsap.killTweensOf(this.highlight);
    this.stack.clearImmediate();
    this.badges.destroy({ children: true });
    super.destroy(options);
  }

  private drawBox(): void {
    const halfW = BOX_WIDTH / 2;
    const halfH = BOX_HEIGHT / 2;

    this.box
      .roundRect(-halfW, -halfH, BOX_WIDTH, BOX_HEIGHT, 16)
      .fill({ color: 0xffffff, alpha: 0.05 })
      .roundRect(-halfW, -halfH, BOX_WIDTH, BOX_HEIGHT, 16)
      .stroke({ width: 2.5, color: 0xbcdcf5, alpha: 0.55 })
      .roundRect(-halfW + 7, -halfH + 7, BOX_WIDTH - 14, BOX_HEIGHT - 14, 12)
      .stroke({ width: 1, color: 0xbcdcf5, alpha: 0.25 });

    this.highlight
      .roundRect(-halfW - 6, -halfH - 6, BOX_WIDTH + 12, BOX_HEIGHT + 12, 20)
      .stroke({ width: 4, color: COLORS.goldLight, alpha: 0.9 });
    this.highlight.alpha = 0;
  }

  private attachEvents(): void {
    this.on("pointertap", () => {
      if (this.interactiveSpot) this.callbacks.onPlace(this.seatId);
    });

    this.on("rightclick", (event) => {
      event.preventDefault?.();
      if (this.interactiveSpot) this.callbacks.onRemove(this.seatId);
    });

    this.on("pointerover", () => {
      if (!this.interactiveSpot) return;
      gsap.to(this.box.scale, {
        x: 1.03,
        y: 1.03,
        duration: 0.16,
        overwrite: "auto",
      });
    });

    this.on("pointerout", () => {
      gsap.to(this.box.scale, {
        x: 1,
        y: 1,
        duration: 0.16,
        overwrite: "auto",
      });
    });
  }
}
