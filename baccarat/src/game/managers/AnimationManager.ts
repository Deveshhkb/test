import gsap from "gsap";

import type { GameConfig } from "../Config";
import { Logger } from "../utils/Logger";

export type Tween = gsap.core.Tween;
export type Timeline = gsap.core.Timeline;
export type Animatable = gsap.core.Animation;

/** Named eases so timing reads consistently across the whole game. */
export const Ease = {
  /** Cards leaving the shoe: quick out, soft landing. */
  deal: "power3.out",
  /** Chips flying to a spot. */
  chip: "back.out(1.4)",
  /** Card flip halves. */
  flipOut: "power2.in",
  flipIn: "power2.out",
  /** UI panels. */
  uiIn: "back.out(1.7)",
  uiOut: "power2.in",
  /** Highlights and glows. */
  glow: "sine.inOut",
  /** Anything that must feel mechanical (timer sweep). */
  linear: "none",
  /** Payout counters. */
  count: "power1.out",
} as const;

/**
 * Central owner of every GSAP animation the engine creates.
 *
 * Nothing else calls `gsap` directly. That single rule is what makes
 * `pause()`, `resume()`, the global speed multiplier and — most importantly —
 * a leak-free `destroy()` possible: on teardown every tween created by the
 * game is killed, even ones mid-flight, so no callback can fire against a
 * destroyed display object.
 */
export class AnimationManager {
  private readonly log = Logger.create("anim");
  private readonly active = new Set<Animatable>();
  private config: GameConfig;
  private paused = false;

  constructor(config: GameConfig) {
    this.config = config;

    // GSAP's lag smoothing clamps the delta whenever a frame overruns, so a
    // stalled frame makes every tween advance by frames instead of by time.
    // In a casino round that is a correctness bug, not a smoothing nicety: the
    // engine sequences the deal on awaited timelines, so a few slow frames
    // during boot or a GC pause would stretch the round out of step with the
    // server clock. (Measured: it turned a 1.2 s boot into an 18 s one on a
    // software rasteriser.) Round timing must follow the wall clock.
    gsap.ticker.lagSmoothing(0);
  }

  updateConfig(config: GameConfig): void {
    const changed = config.animation.speedMultiplier !== this.config.animation.speedMultiplier;
    this.config = config;
    if (changed) {
      const scale = this.timeScale;
      for (const animation of this.active) animation.timeScale(scale);
    }
  }

  /** `speedMultiplier` of 0.5 means "twice as fast", so it inverts to timeScale. */
  private get timeScale(): number {
    return 1 / Math.max(0.05, this.config.animation.speedMultiplier);
  }

  /* ---------------------------------------------------------------- *
   * Factories
   * ---------------------------------------------------------------- */

  timeline(vars?: gsap.TimelineVars): Timeline {
    const timeline = gsap.timeline(vars);
    return this.track(timeline) as Timeline;
  }

  to(target: gsap.TweenTarget, vars: gsap.TweenVars): Tween {
    return this.track(gsap.to(target, vars)) as Tween;
  }

  from(target: gsap.TweenTarget, vars: gsap.TweenVars): Tween {
    return this.track(gsap.from(target, vars)) as Tween;
  }

  fromTo(target: gsap.TweenTarget, from: gsap.TweenVars, to: gsap.TweenVars): Tween {
    return this.track(gsap.fromTo(target, from, to)) as Tween;
  }

  /** Fire a callback after `seconds`, honouring pause and the speed multiplier. */
  delayedCall(seconds: number, callback: () => void): Tween {
    return this.track(gsap.delayedCall(seconds, callback)) as Tween;
  }

  /**
   * Tweens a numeric value and reports it — the payout counter and the balance
   * roll-up both run through here, so neither allocates per frame.
   */
  counter(
    from: number,
    to: number,
    seconds: number,
    onUpdate: (value: number) => void,
    onComplete?: () => void,
  ): Tween {
    const box = { value: from };
    return this.to(box, {
      value: to,
      duration: seconds,
      ease: Ease.count,
      onUpdate: () => onUpdate(box.value),
      ...(onComplete ? { onComplete } : {}),
    });
  }

  private track(animation: Animatable): Animatable {
    animation.timeScale(this.timeScale);
    if (this.paused) animation.pause();
    this.active.add(animation);

    // Chain onto any caller-supplied onComplete instead of replacing it —
    // overwriting it here would silently break every `await`ed timeline.
    const tracked = this.active;
    const existing = animation.eventCallback("onComplete");
    animation.eventCallback("onComplete", function (this: Animatable, ...args: unknown[]) {
      tracked.delete(animation);
      existing?.apply(this, args as never[]);
    });
    return animation;
  }

  /** Registers an animation created elsewhere (e.g. inside a display object). */
  adopt<T extends Animatable>(animation: T): T {
    this.track(animation);
    return animation;
  }

  /* ---------------------------------------------------------------- *
   * Control
   * ---------------------------------------------------------------- */

  pause(): void {
    if (this.paused) return;
    this.paused = true;
    for (const animation of this.active) animation.pause();
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    for (const animation of this.active) animation.resume();
  }

  get isPaused(): boolean {
    return this.paused;
  }

  /** Kills a specific animation and forgets it. */
  kill(animation: Animatable | null | undefined): void {
    if (!animation) return;
    animation.kill();
    this.active.delete(animation);
  }

  /** Kills every animation targeting a display object — used before pooling. */
  killTweensOf(target: gsap.TweenTarget): void {
    gsap.killTweensOf(target);
  }

  killAll(): void {
    for (const animation of Array.from(this.active)) animation.kill();
    this.active.clear();
    this.log.debug("all animations killed");
  }

  get activeCount(): number {
    return this.active.size;
  }

  destroy(): void {
    this.killAll();
  }
}
