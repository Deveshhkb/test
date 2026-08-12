import gsap from "gsap";
import { Container } from "pixi.js";
import { whenDone } from "./CardAnimation";

/**
 * Result presentation timings. The banner arrives with a small overshoot, holds
 * while the player reads it, then leaves quickly so the next round is never
 * gated on a long animation.
 */
export class ResultAnimator {
  bannerIn(target: Container): Promise<void> {
    gsap.killTweensOf(target);
    gsap.killTweensOf(target.scale);
    target.visible = true;

    const timeline = gsap.timeline();
    timeline
      .fromTo(
        target,
        { alpha: 0 },
        { alpha: 1, duration: 0.18, ease: "power1.out" },
        0,
      )
      .fromTo(
        target.scale,
        { x: 0.72, y: 0.72 },
        { x: 1, y: 1, duration: 0.42, ease: "back.out(1.7)" },
        0,
      );
    return whenDone(timeline);
  }

  bannerOut(target: Container): Promise<void> {
    gsap.killTweensOf(target);
    const timeline = gsap.timeline();
    timeline
      .to(target, { alpha: 0, duration: 0.22, ease: "power1.in" }, 0)
      .to(
        target.scale,
        { x: 0.9, y: 0.9, duration: 0.22, ease: "power1.in" },
        0,
      )
      .call(() => {
        target.visible = false;
      });
    return whenDone(timeline);
  }

  /** Short attention pulse used for blackjack. */
  celebrate(target: Container): void {
    gsap.fromTo(
      target.scale,
      { x: 1, y: 1 },
      {
        x: 1.08,
        y: 1.08,
        duration: 0.24,
        yoyo: true,
        repeat: 3,
        ease: "sine.inOut",
      },
    );
  }
}
