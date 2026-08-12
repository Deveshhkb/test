import gsap from "gsap";
import { CARD_LAYOUT, SHOE_POSITION, TIMING } from "../config/gameConfig";
import { CardSprite } from "../entities/CardSprite";

export interface Point {
  x: number;
  y: number;
}

export interface HandSlot extends Point {
  rotation: number;
}

/**
 * Computes where each card of a hand sits.
 *
 * Cards step to the right and down in the classic dealt-hand staircase, the
 * step shrinks as the hand grows so a large hand never leaves the felt, and the
 * whole fan stays centred on the hand's origin.
 */
export function computeHandSlots(count: number, origin: Point): HandSlot[] {
  if (count <= 0) return [];

  const { spread, stagger, rotationStep, maxSpan, width } = CARD_LAYOUT;
  const gaps = Math.max(1, count - 1);
  const step = count > 1 ? Math.min(spread, (maxSpan - width) / gaps) : 0;
  const verticalStep = step === 0 ? 0 : stagger * (step / spread);

  const totalWidth = step * (count - 1);
  const totalHeight = verticalStep * (count - 1);
  const startX = origin.x - totalWidth / 2;
  const startY = origin.y - totalHeight / 2;
  const centreIndex = (count - 1) / 2;

  return Array.from({ length: count }, (_, index) => ({
    x: startX + step * index,
    y: startY + verticalStep * index,
    rotation: ((index - centreIndex) * rotationStep * Math.PI) / 180,
  }));
}

/** Resolves when a tween completes, and also when it is interrupted. */
export function whenDone(
  tween: gsap.core.Tween | gsap.core.Timeline,
): Promise<void> {
  return new Promise((resolve) => {
    tween.eventCallback("onComplete", () => resolve());
    tween.eventCallback("onInterrupt", () => resolve());
  });
}

/**
 * Card motion: dealing out of the shoe, re-fanning a hand as it grows and
 * sweeping the table at the end of a round. All sequencing is GSAP timelines
 * rather than chained timeouts, so it can be paused, killed or inspected.
 */
export class CardAnimator {
  /** Deals one card from the shoe to its slot, flipping it in flight if needed. */
  deal(
    sprite: CardSprite,
    slot: HandSlot,
    options: { faceUp: boolean; delay?: number } = { faceUp: true },
  ): Promise<void> {
    sprite.position.set(SHOE_POSITION.x, SHOE_POSITION.y);
    sprite.rotation = -0.12;
    sprite.scale.set(0.86);
    sprite.setFaceUp(false);

    const duration = TIMING.cardDeal;
    const timeline = gsap.timeline({ delay: options.delay ?? 0 });

    timeline
      .to(sprite, {
        x: slot.x,
        y: slot.y,
        rotation: slot.rotation,
        duration,
        ease: "power2.out",
      })
      .to(
        sprite.scale,
        { x: 1, y: 1, duration: duration * 0.7, ease: "back.out(1.4)" },
        0,
      );

    if (options.faceUp) {
      const flipStart = duration * 0.45;
      const half = TIMING.cardFlip / 2;
      timeline
        .to(
          sprite.scale,
          {
            x: 0,
            duration: half,
            ease: "power1.in",
            onComplete: () => sprite.setFaceUp(true),
          },
          flipStart,
        )
        .to(
          sprite.scale,
          { x: 1, duration: half, ease: "power1.out" },
          flipStart + half,
        );
    }

    sprite.trackTween(timeline);
    return whenDone(timeline);
  }

  /** Re-fans a hand in place after a card has been added. */
  relayout(
    sprites: readonly CardSprite[],
    origin: Point,
    animated = true,
  ): void {
    this.relayoutTo(
      sprites,
      computeHandSlots(sprites.length, origin),
      animated,
    );
  }

  /** Moves cards onto pre-computed slots; extra slots are ignored. */
  relayoutTo(
    sprites: readonly CardSprite[],
    slots: readonly HandSlot[],
    animated = true,
  ): void {
    sprites.forEach((sprite, index) => {
      const slot = slots[index];
      if (!slot) return;
      if (!animated) {
        sprite.position.set(slot.x, slot.y);
        sprite.rotation = slot.rotation;
        return;
      }
      gsap.to(sprite, {
        x: slot.x,
        y: slot.y,
        rotation: slot.rotation,
        duration: 0.24,
        ease: "power2.out",
        overwrite: "auto",
      });
    });
  }

  /** Sweeps a finished hand off the felt toward the discard tray. */
  clear(sprites: readonly CardSprite[], target: Point): Promise<void> {
    if (sprites.length === 0) return Promise.resolve();

    const timeline = gsap.timeline();
    sprites.forEach((sprite, index) => {
      timeline.to(
        sprite,
        {
          x: target.x,
          y: target.y,
          rotation: 0.5,
          alpha: 0,
          duration: 0.34,
          ease: "power2.in",
        },
        index * 0.045,
      );
      timeline.to(
        sprite.scale,
        { x: 0.8, y: 0.8, duration: 0.34, ease: "power2.in" },
        index * 0.045,
      );
    });

    return whenDone(timeline);
  }
}
