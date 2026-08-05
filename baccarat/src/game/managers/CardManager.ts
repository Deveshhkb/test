import type { Container } from "pixi.js";

import { CARD_HEIGHT, CARD_WIDTH, POOL_SIZE_CARDS } from "../Constants";
import { ObjectPool } from "../core/ObjectPool";
import type { GameContext } from "../GameContext";
import { Card } from "../objects/Card";
import type { Deck } from "../objects/Deck";
import { Ease } from "./AnimationManager";
import { Sfx } from "./AudioManager";
import { HandSide, type DealStep } from "../types";
import { Logger } from "../utils/Logger";

/** Player and banker each hold at most three cards. */
const MAX_CARDS_PER_HAND = 3;

interface HandView {
  readonly anchor: Container;
  readonly cards: Card[];
  /** +1 lays the third card out to the right, -1 to the left. */
  readonly outward: number;
}

/**
 * Everything that happens to a card between the shoe and the discard tray.
 *
 * Owns the card pool, the per-hand layout maths and the deal/reveal timelines.
 * Deliberately knows nothing about *why* a card is being dealt — the game
 * manager decides that from the rules and simply asks for the motion.
 */
export class CardManager {
  private readonly log = Logger.create("cards");
  private readonly ctx: GameContext;
  private readonly pool: ObjectPool<Card>;

  private layer: Container | null = null;
  private deck: Deck | null = null;
  private discardPoint: () => { x: number; y: number } = () => ({ x: 0, y: 0 });

  private readonly hands: Record<HandSide, HandView>;

  constructor(ctx: GameContext) {
    this.ctx = ctx;
    // No prewarm here: this manager is constructed during boot, before the
    // atlas exists, and a Card resolves its textures in its constructor.
    this.pool = new ObjectPool<Card>(() => new Card(ctx), {
      max: POOL_SIZE_CARDS * 2,
      name: "cards",
    });

    this.hands = {
      [HandSide.Player]: { anchor: null as unknown as Container, cards: [], outward: -1 },
      [HandSide.Banker]: { anchor: null as unknown as Container, cards: [], outward: 1 },
    };
  }

  /* ---------------------------------------------------------------- *
   * Wiring
   * ---------------------------------------------------------------- */

  attach(options: {
    layer: Container;
    deck: Deck;
    playerAnchor: Container;
    bankerAnchor: Container;
    discardPoint: () => { x: number; y: number };
  }): void {
    this.layer = options.layer;
    this.deck = options.deck;
    this.discardPoint = options.discardPoint;
    (this.hands[HandSide.Player] as { anchor: Container }).anchor = options.playerAnchor;
    (this.hands[HandSide.Banker] as { anchor: Container }).anchor = options.bankerAnchor;

    // Safe now: the game scene only attaches after the atlas is baked.
    this.pool.prewarm(POOL_SIZE_CARDS);
  }

  /** Re-points every pooled card at a rebuilt atlas. */
  refreshTextures(): void {
    this.pool.forEach((card) => card.refreshTextures());
  }

  get cardCount(): number {
    return this.hands[HandSide.Player].cards.length + this.hands[HandSide.Banker].cards.length;
  }

  cardsOf(side: HandSide): readonly Card[] {
    return this.hands[side].cards;
  }

  /* ---------------------------------------------------------------- *
   * Dealing
   * ---------------------------------------------------------------- */

  /**
   * Slides one card from the shoe to its slot, face down.
   * Resolves when it settles, so callers can await a whole sequence.
   */
  deal(step: DealStep, options: { faceUp?: boolean } = {}): Promise<void> {
    const hand = this.hands[step.side];
    if (!hand.anchor || !this.layer) {
      this.log.warn("deal() before attach()");
      return Promise.resolve();
    }
    // Hard invariant of the game — a fourth card means we are animating a
    // stale round, so drop it rather than corrupting the layout.
    if (hand.cards.length >= MAX_CARDS_PER_HAND) {
      this.log.warn(`ignored a ${hand.cards.length + 1}th card for ${step.side}`);
      return Promise.resolve();
    }

    const card = this.pool.acquire();
    card.setCard(step.card);
    card.setFaceUp(false);
    hand.anchor.addChild(card);
    hand.cards.push(card);

    // Start at the shoe, in the hand's local space.
    const origin = this.deck?.originGlobal() ?? { x: 0, y: 0 };
    const local = hand.anchor.toLocal(origin);
    card.position.set(local.x, local.y);
    card.rotation = -0.35 * hand.outward;
    card.alpha = 0;

    const duration = this.ctx.config.animation.dealDuration;
    this.ctx.audio.play(Sfx.CardDeal, { volume: 0.75 });

    // Re-flow the whole hand: adding a third card nudges the pair over.
    const targets = this.computeLayout(step.side, hand.cards.length);
    this.applyLayout(step.side, targets, duration, hand.cards.length - 1);

    return new Promise((resolve) => {
      const target = targets[hand.cards.length - 1]!;
      const timeline = this.ctx.animation.timeline({
        onComplete: () => {
          if (options.faceUp) void card.flip().then(() => resolve());
          else resolve();
        },
      });

      timeline
        .to(card, { alpha: 1, duration: duration * 0.25, ease: Ease.linear }, 0)
        .to(
          card,
          {
            x: target.x,
            y: target.y,
            rotation: target.rotation,
            duration,
            ease: Ease.deal,
          },
          0,
        );
    });
  }

  /** Flips every face-down card in a hand, one after another. */
  async reveal(side: HandSide, options: { squeeze?: boolean } = {}): Promise<void> {
    const hand = this.hands[side];
    for (const card of hand.cards) {
      if (card.isFaceUp) continue;
      if (options.squeeze && this.ctx.config.features.squeezeReveal) await card.squeeze();
      else await card.flip();
    }
  }

  /** Flips a single card by index — used for the decisive third card. */
  async revealCard(side: HandSide, index: number, squeeze = false): Promise<void> {
    const card = this.hands[side].cards[index];
    if (!card || card.isFaceUp) return;
    if (squeeze && this.ctx.config.features.squeezeReveal) await card.squeeze();
    else await card.flip();
  }

  /* ---------------------------------------------------------------- *
   * Layout
   * ---------------------------------------------------------------- */

  /**
   * Positions for a hand of `count` cards, centred on the anchor.
   *
   * The third card lies rotated a quarter turn beside the pair — the physical
   * convention at a baccarat table, and the reason a 3-card hand is wider than
   * it is tall.
   */
  private computeLayout(
    side: HandSide,
    count: number,
  ): Array<{ x: number; y: number; rotation: number }> {
    const { cardSpacing, thirdCardOffset, thirdCardRotation, cardScale } = this.ctx.config.table;
    const w = CARD_WIDTH * cardScale;
    const h = CARD_HEIGHT * cardScale;
    const outward = this.hands[side].outward;

    const pairWidth = w * 2 + cardSpacing;
    const thirdWidth = count > 2 ? h + thirdCardOffset : 0;
    const totalWidth = pairWidth + thirdWidth;

    // Shift the pair back toward the anchor centre once a third card appears.
    const pairCentre = outward > 0 ? -(totalWidth - pairWidth) / 2 : (totalWidth - pairWidth) / 2;

    const positions: Array<{ x: number; y: number; rotation: number }> = [
      { x: pairCentre - (w + cardSpacing) / 2, y: 0, rotation: 0 },
      { x: pairCentre + (w + cardSpacing) / 2, y: 0, rotation: 0 },
    ];

    if (count > 2) {
      positions.push({
        x: pairCentre + outward * (pairWidth / 2 + thirdCardOffset + h / 2),
        y: 0,
        rotation: thirdCardRotation,
      });
    }

    return positions.slice(0, Math.max(count, 2));
  }

  /** Tweens already-placed cards to their new slots. */
  private applyLayout(
    side: HandSide,
    targets: Array<{ x: number; y: number; rotation: number }>,
    duration: number,
    skipIndex: number,
  ): void {
    const cards = this.hands[side].cards;
    cards.forEach((card, index) => {
      if (index === skipIndex) return;
      const target = targets[index];
      if (!target) return;
      if (Math.abs(card.x - target.x) < 0.5 && Math.abs(card.y - target.y) < 0.5) return;
      this.ctx.animation.to(card, {
        x: target.x,
        y: target.y,
        duration: duration * 0.8,
        ease: Ease.uiOut,
      });
    });
  }

  /** Re-applies layout without animation, after a resize or a config change. */
  relayout(): void {
    for (const side of [HandSide.Player, HandSide.Banker]) {
      const hand = this.hands[side];
      const targets = this.computeLayout(side, hand.cards.length);
      hand.cards.forEach((card, index) => {
        const target = targets[index];
        if (!target) return;
        card.position.set(target.x, target.y);
        card.rotation = target.rotation;
      });
    }
  }

  /* ---------------------------------------------------------------- *
   * Result presentation
   * ---------------------------------------------------------------- */

  highlight(side: HandSide): void {
    for (const card of this.hands[side].cards) card.setHighlighted(true);
  }

  dim(side: HandSide): void {
    for (const card of this.hands[side].cards) card.setDimmed(true);
  }

  clearPresentation(): void {
    for (const side of [HandSide.Player, HandSide.Banker]) {
      for (const card of this.hands[side].cards) {
        card.setHighlighted(false, 0.15);
        card.setDimmed(false, 0.15);
      }
    }
  }

  /* ---------------------------------------------------------------- *
   * Clearing
   * ---------------------------------------------------------------- */

  /** Sweeps every card into the discard tray and returns them to the pool. */
  collect(): Promise<void> {
    const all: Card[] = [
      ...this.hands[HandSide.Player].cards,
      ...this.hands[HandSide.Banker].cards,
    ];
    this.hands[HandSide.Player].cards.length = 0;
    this.hands[HandSide.Banker].cards.length = 0;

    if (all.length === 0) return Promise.resolve();

    const duration = this.ctx.config.animation.clearDuration;
    this.ctx.audio.play(Sfx.CardSlide, { volume: 0.5 });

    return new Promise((resolve) => {
      const timeline = this.ctx.animation.timeline({ onComplete: resolve });
      all.forEach((card, index) => {
        const parent = card.parent;
        const target = parent ? parent.toLocal(this.discardPoint()) : { x: 0, y: 0 };
        timeline.to(
          card,
          {
            x: target.x,
            y: target.y,
            rotation: 0.5,
            alpha: 0,
            duration,
            ease: "power2.in",
            onComplete: () => this.pool.release(card),
          },
          index * 0.04,
        );
      });
    });
  }

  /** Immediate teardown of the table, no animation. */
  clearImmediate(): void {
    for (const side of [HandSide.Player, HandSide.Banker]) {
      const cards = this.hands[side].cards.splice(0);
      for (const card of cards) this.pool.release(card);
    }
  }

  reset(): void {
    this.clearImmediate();
  }

  destroy(): void {
    this.clearImmediate();
    this.pool.destroy();
    this.layer = null;
    this.deck = null;
  }
}
