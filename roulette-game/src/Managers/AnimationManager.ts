import gsap from 'gsap';
import type { Container } from 'pixi.js';
import { Logger } from '../Utilities/Logger';

/**
 * Central owner of every tween in the engine.
 *
 * Nothing calls `gsap` directly except this module and the two physics-heavy
 * objects (Wheel/Ball) that need bespoke timelines. Routing animation through
 * one place buys three things that matter in production:
 *
 * 1. `pause()`/`resume()` genuinely stop the game - a tab switch mid-spin does
 *    not leave the ball somewhere impossible.
 * 2. `destroy()` kills every tween, so a React unmount cannot leave GSAP
 *    holding references to destroyed Pixi objects (the classic "cannot read
 *    property of null" crash a few frames after teardown).
 * 3. A single `timeScale` knob drives turbo mode and QA fast-forward.
 */
export class AnimationManager {
  private readonly log = Logger.create('AnimationManager');
  /** Every animation handed out, so teardown is exhaustive. */
  private readonly tracked = new Set<gsap.core.Animation>();
  private speed = 1;
  private paused = false;
  private static easesRegistered = false;

  /* --------------------------------------------------------------------- */
  /* Named eases - the motion vocabulary of the game                        */
  /* --------------------------------------------------------------------- */

  /** Chip settling onto the felt: fast out, soft landing, tiny overshoot. */
  public static readonly EASE_CHIP_PLACE = 'back.out(1.7)';
  /** Chip flying to the player on a win. */
  public static readonly EASE_CHIP_COLLECT = 'power2.in';
  /** Panel / banner entrance. */
  public static readonly EASE_UI_IN = 'power3.out';
  public static readonly EASE_UI_OUT = 'power2.in';
  /** Wheel spin-up and spin-down. */
  public static readonly EASE_WHEEL_ACCEL = 'power1.in';
  public static readonly EASE_WHEEL_DECEL = 'power2.out';
  /**
   * Ball losing energy on the rim. A real ball decays close to exponentially,
   * which `power1.out` under-sells and `power3.out` over-sells; an exponent of
   * 2.2 sits in the pocket between them. Registered below as a custom ease
   * because GSAP's built-in powers are integer-only.
   */
  public static readonly EASE_BALL_TRACK = 'ballTrack';
  /** The final crawl into a pocket. */
  public static readonly EASE_BALL_SETTLE = 'ballSettle';

  public constructor() {
    AnimationManager.registerEases();
    // Recover gracefully from a backgrounded tab: without lag smoothing GSAP
    // would try to catch up a 10-second gap in one frame and teleport the ball.
    gsap.ticker.lagSmoothing(500, 33);
  }

  /**
   * Custom eases are global to GSAP, so they are installed exactly once even
   * when several engine instances share a page.
   */
  private static registerEases(): void {
    if (AnimationManager.easesRegistered) return;
    AnimationManager.easesRegistered = true;

    gsap.registerEase(AnimationManager.EASE_BALL_TRACK, (t) => 1 - Math.pow(1 - t, 2.2));
    // Very long tail: the ball spends most of the settle window barely moving,
    // which is what makes the last half-second read as friction, not as a stop.
    gsap.registerEase(AnimationManager.EASE_BALL_SETTLE, (t) => 1 - Math.pow(1 - t, 3.4));
  }

  /* --------------------------------------------------------------------- */
  /* Timeline factory                                                      */
  /* --------------------------------------------------------------------- */

  /** Create a tracked timeline. Always prefer this over `gsap.timeline()`. */
  public timeline(vars?: gsap.TimelineVars): gsap.core.Timeline {
    const timeline = gsap.timeline({
      ...vars,
      paused: vars?.paused ?? this.paused,
      onComplete: () => {
        this.tracked.delete(timeline);
        vars?.onComplete?.();
      },
    });
    timeline.timeScale(this.speed);
    this.tracked.add(timeline);
    return timeline;
  }

  /** Create a tracked tween. */
  public to(target: gsap.TweenTarget, vars: gsap.TweenVars): gsap.core.Tween {
    const tween = gsap.to(target, vars);
    this.track(tween);
    return tween;
  }

  public from(target: gsap.TweenTarget, vars: gsap.TweenVars): gsap.core.Tween {
    const tween = gsap.from(target, vars);
    this.track(tween);
    return tween;
  }

  public fromTo(
    target: gsap.TweenTarget,
    from: gsap.TweenVars,
    to: gsap.TweenVars,
  ): gsap.core.Tween {
    const tween = gsap.fromTo(target, from, to);
    this.track(tween);
    return tween;
  }

  /** Promise-returning delay that participates in pause/resume and teardown. */
  public wait(seconds: number): Promise<void> {
    return new Promise((resolve) => {
      const tween = gsap.to({}, { duration: seconds, onComplete: resolve });
      this.track(tween);
    });
  }

  /* --------------------------------------------------------------------- */
  /* Reusable motion primitives                                            */
  /* --------------------------------------------------------------------- */

  /**
   * Attention pulse used on the winning cell, the countdown at last call and
   * newly-added history entries.
   */
  public pulse(
    target: Container,
    options: { scale?: number; duration?: number; repeat?: number } = {},
  ): gsap.core.Tween {
    const { scale = 1.12, duration = 0.42, repeat = -1 } = options;
    const baseX = target.scale.x;
    const baseY = target.scale.y;

    return this.to(target.scale, {
      x: baseX * scale,
      y: baseY * scale,
      duration,
      repeat,
      yoyo: true,
      ease: 'sine.inOut',
      overwrite: 'auto',
    });
  }

  /** Fade a display object in from nothing. */
  public fadeIn(target: Container, duration = 0.28, delay = 0): gsap.core.Tween {
    target.alpha = 0;
    target.visible = true;
    return this.to(target, {
      alpha: 1,
      duration,
      delay,
      ease: AnimationManager.EASE_UI_IN,
      overwrite: 'auto',
    });
  }

  /** Fade out and optionally hide, so an invisible panel costs no draw call. */
  public fadeOut(target: Container, duration = 0.22, hide = true): gsap.core.Tween {
    return this.to(target, {
      alpha: 0,
      duration,
      ease: AnimationManager.EASE_UI_OUT,
      overwrite: 'auto',
      onComplete: () => {
        if (hide) target.visible = false;
      },
    });
  }

  /** Slide-and-fade entrance for HUD panels. */
  public slideIn(
    target: Container,
    from: { x?: number; y?: number },
    duration = 0.42,
  ): gsap.core.Tween {
    const targetX = target.x;
    const targetY = target.y;
    target.x = targetX + (from.x ?? 0);
    target.y = targetY + (from.y ?? 0);
    target.alpha = 0;
    target.visible = true;

    return this.to(target, {
      x: targetX,
      y: targetY,
      alpha: 1,
      duration,
      ease: AnimationManager.EASE_UI_IN,
      overwrite: 'auto',
    });
  }

  /** Short, sharp scale punch - button presses and chip drops. */
  public punch(target: Container, amount = 0.16, duration = 0.3): gsap.core.Tween {
    const baseX = target.scale.x;
    const baseY = target.scale.y;
    target.scale.set(baseX * (1 + amount), baseY * (1 + amount));

    return this.to(target.scale, {
      x: baseX,
      y: baseY,
      duration,
      ease: 'elastic.out(1, 0.55)',
      overwrite: 'auto',
    });
  }

  /* --------------------------------------------------------------------- */
  /* Global control                                                        */
  /* --------------------------------------------------------------------- */

  public setSpeed(speed: number): void {
    this.speed = Math.max(0.1, speed);
    for (const animation of this.tracked) animation.timeScale(this.speed);
  }

  public getSpeed(): number {
    return this.speed;
  }

  public pause(): void {
    if (this.paused) return;
    this.paused = true;
    for (const animation of this.tracked) animation.pause();
  }

  public resume(): void {
    if (!this.paused) return;
    this.paused = false;
    for (const animation of this.tracked) animation.resume();
  }

  public isPaused(): boolean {
    return this.paused;
  }

  /** Kill every tween touching a target - call before destroying an object. */
  public killTweensOf(target: gsap.TweenTarget): void {
    gsap.killTweensOf(target);
  }

  /** Stop everything without tearing the manager down (used by `reset()`). */
  public killAll(): void {
    for (const animation of this.tracked) animation.kill();
    this.tracked.clear();
  }

  public destroy(): void {
    this.killAll();
    this.log.debug('destroyed');
  }

  /**
   * Register an animation for global control and self-eviction.
   *
   * The existing `onComplete` is chained rather than replaced - overwriting it
   * would silently swallow the caller's completion logic, which is a
   * particularly nasty class of bug to track down inside a payout sequence.
   */
  private track(animation: gsap.core.Animation): void {
    animation.timeScale(this.speed);
    if (this.paused) animation.pause();
    this.tracked.add(animation);

    const existing = animation.eventCallback('onComplete');
    animation.eventCallback('onComplete', () => {
      this.tracked.delete(animation);
      existing?.call(animation);
    });
  }
}
