import gsap from 'gsap';
import type { Container, Sprite, Text } from 'pixi.js';

/**
 * Central GSAP animation library. Every tween is registered so it can be
 * killed on scene teardown (no leaked tweens, no callbacks firing on
 * destroyed display objects).
 */
class AnimationManager {
  private live = new Set<gsap.core.Tween | gsap.core.Timeline>();

  private track<T extends gsap.core.Tween | gsap.core.Timeline>(animation: T): T {
    this.live.add(animation);
    // Chain onto existing callbacks — eventCallback() REPLACES, and tweens
    // (incl. gsap.delayedCall) may already carry an onComplete.
    for (const event of ['onComplete', 'onInterrupt'] as const) {
      const previous = animation.eventCallback(event) as ((...a: unknown[]) => void) | null;
      animation.eventCallback(event, (...args: unknown[]) => {
        this.live.delete(animation);
        previous?.(...args);
      });
    }
    return animation;
  }

  killAll(): void {
    for (const animation of [...this.live]) animation.kill();
    this.live.clear();
  }

  kill(target: object): void {
    gsap.killTweensOf(target);
  }

  to(target: object, vars: gsap.TweenVars): gsap.core.Tween {
    return this.track(gsap.to(target, vars));
  }

  from(target: object, vars: gsap.TweenVars): gsap.core.Tween {
    return this.track(gsap.from(target, vars));
  }

  timeline(vars?: gsap.TimelineVars): gsap.core.Timeline {
    return this.track(gsap.timeline(vars));
  }

  delay(seconds: number): Promise<void> {
    return new Promise((resolve) =>
      this.track(gsap.delayedCall(seconds, resolve) as unknown as gsap.core.Tween),
    );
  }

  // ---- reusable presets -------------------------------------------------

  /** Tactile press for any interactive display object. */
  buttonPress(target: Container): void {
    this.kill(target.scale);
    gsap.fromTo(
      target.scale,
      { x: 0.92, y: 0.92 },
      { x: 1, y: 1, duration: 0.3, ease: 'back.out(3)' },
    );
  }

  /** Pop + settle used on winning symbols. */
  winPulse(target: Container, scaleTo = 1.18): gsap.core.Timeline {
    const tl = this.timeline({ repeat: 1 });
    tl.to(target.scale, { x: scaleTo, y: scaleTo, duration: 0.22, ease: 'sine.out' });
    tl.to(target.scale, { x: 1, y: 1, duration: 0.22, ease: 'sine.in' });
    return tl;
  }

  bounceIn(target: Container, duration = 0.5): gsap.core.Tween {
    target.scale.set(0);
    return this.to(target.scale, { x: 1, y: 1, duration, ease: 'back.out(2.2)' });
  }

  flash(target: Sprite | Container, times = 3): gsap.core.Timeline {
    const tl = this.timeline();
    for (let i = 0; i < times; i++) {
      tl.to(target, { alpha: 0.25, duration: 0.08 }).to(target, { alpha: 1, duration: 0.08 });
    }
    return tl;
  }

  /** Soft looping glow via alpha oscillation (paired with a glow sprite). */
  glowLoop(target: Container): gsap.core.Tween {
    return this.to(target, {
      alpha: 0.35,
      duration: 0.55,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });
  }

  popIn(target: Container): gsap.core.Timeline {
    const tl = this.timeline();
    target.alpha = 0;
    target.scale.set(0.6);
    tl.to(target, { alpha: 1, duration: 0.18 }, 0);
    tl.to(target.scale, { x: 1, y: 1, duration: 0.45, ease: 'back.out(2)' }, 0);
    return tl;
  }

  popOut(target: Container): gsap.core.Timeline {
    const tl = this.timeline();
    tl.to(target.scale, { x: 0.7, y: 0.7, duration: 0.25, ease: 'back.in(2)' }, 0);
    tl.to(target, { alpha: 0, duration: 0.22 }, 0.05);
    return tl;
  }

  /** Animated number counter (big wins, floating win amounts). */
  counter(
    text: Text,
    from: number,
    to: number,
    duration: number,
    format: (v: number) => string,
    onUpdate?: () => void,
  ): gsap.core.Tween {
    const proxy = { value: from };
    return this.to(proxy, {
      value: to,
      duration,
      ease: 'power1.out',
      onUpdate: () => {
        text.text = format(proxy.value);
        onUpdate?.();
      },
    });
  }

  /** Camera shake on any container (used for mega wins). */
  shake(target: Container, intensity = 12, duration = 0.6): gsap.core.Timeline {
    const tl = this.timeline();
    const steps = 10;
    const baseX = target.x;
    const baseY = target.y;
    for (let i = 0; i < steps; i++) {
      const falloff = 1 - i / steps;
      tl.to(target, {
        x: baseX + (Math.random() - 0.5) * 2 * intensity * falloff,
        y: baseY + (Math.random() - 0.5) * 2 * intensity * falloff,
        duration: duration / steps,
        ease: 'none',
      });
    }
    tl.to(target, { x: baseX, y: baseY, duration: duration / steps });
    return tl;
  }

  /** Floating win amount that rises and fades. */
  floatUp(target: Container, distance = 90): gsap.core.Timeline {
    const tl = this.timeline();
    tl.fromTo(target, { alpha: 0 }, { alpha: 1, duration: 0.2 }, 0);
    tl.to(target, { y: target.y - distance, duration: 1.4, ease: 'power1.out' }, 0);
    tl.to(target, { alpha: 0, duration: 0.4 }, 1.0);
    return tl;
  }
}

export const animations = new AnimationManager();
