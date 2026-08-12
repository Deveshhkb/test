import gsap from "gsap";
import { TIMING } from "../config/gameConfig";
import { ChipSprite } from "../entities/ChipSprite";
import { Point, whenDone } from "./CardAnimation";

/**
 * Chip motion. Chips travel along a shallow arc (a horizontal tween combined
 * with an up-then-down vertical pair) and settle with a small squash, which
 * reads as weight without the cheap-looking bounce of a single elastic ease.
 */
export class ChipAnimator {
  place(chip: ChipSprite, from: Point, to: Point, delay = 0): Promise<void> {
    chip.position.set(from.x, from.y);
    chip.scale.set(0.75);
    chip.alpha = 1;

    const duration = TIMING.chipPlace;
    const lift = Math.min(90, Math.abs(to.x - from.x) * 0.22 + 40);
    const timeline = gsap.timeline({ delay });

    timeline
      .to(chip, { x: to.x, duration, ease: "power1.inOut" }, 0)
      .to(
        chip,
        {
          y: Math.min(from.y, to.y) - lift,
          duration: duration * 0.5,
          ease: "power2.out",
        },
        0,
      )
      .to(
        chip,
        { y: to.y, duration: duration * 0.5, ease: "power2.in" },
        duration * 0.5,
      )
      .to(
        chip.scale,
        { x: 1, y: 1, duration: duration * 0.6, ease: "back.out(2)" },
        duration * 0.4,
      )
      .to(
        chip.scale,
        { x: 1.08, y: 0.92, duration: 0.06, ease: "power2.out" },
        duration,
      )
      .to(chip.scale, { x: 1, y: 1, duration: 0.12, ease: "power2.inOut" });

    return whenDone(timeline);
  }

  /** Stops any motion on these chips so a new tween starts from a clean state. */
  interrupt(chips: readonly ChipSprite[]): void {
    for (const chip of chips) {
      gsap.killTweensOf(chip);
      gsap.killTweensOf(chip.scale);
    }
  }

  /** Returns a chip to the rail, e.g. when a wager is taken back. */
  remove(chip: ChipSprite, to: Point): Promise<void> {
    const timeline = gsap.timeline();
    timeline
      .to(
        chip,
        { x: to.x, y: to.y, alpha: 0, duration: 0.24, ease: "power2.in" },
        0,
      )
      .to(chip.scale, { x: 0.6, y: 0.6, duration: 0.24, ease: "power2.in" }, 0);
    return whenDone(timeline);
  }

  /** Losing wagers slide toward the dealer and fade out. */
  collect(chips: readonly ChipSprite[], to: Point): Promise<void> {
    if (chips.length === 0) return Promise.resolve();
    const timeline = gsap.timeline();
    chips.forEach((chip, index) => {
      timeline.to(
        chip,
        { x: to.x, y: to.y, alpha: 0, duration: 0.4, ease: "power2.in" },
        index * 0.04,
      );
    });
    return whenDone(timeline);
  }

  /** Winnings fly from the seat into the balance readout. */
  payout(chips: readonly ChipSprite[], to: Point): Promise<void> {
    if (chips.length === 0) return Promise.resolve();
    const timeline = gsap.timeline();
    chips.forEach((chip, index) => {
      const at = index * 0.05;
      timeline
        .to(chip, { y: chip.y - 26, duration: 0.16, ease: "power2.out" }, at)
        .to(
          chip,
          { x: to.x, y: to.y, duration: 0.42, ease: "power2.in" },
          at + 0.16,
        )
        .to(chip, { alpha: 0, duration: 0.2, ease: "power1.in" }, at + 0.38)
        .to(
          chip.scale,
          { x: 0.5, y: 0.5, duration: 0.42, ease: "power2.in" },
          at + 0.16,
        );
    });
    return whenDone(timeline);
  }
}
