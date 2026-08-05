import { BitmapText, Container, Graphics } from "pixi.js";

import { Fonts, Palette } from "../Constants";
import type { GameContext } from "../GameContext";
import { Ease, type Tween } from "../managers/AnimationManager";
import { Sfx } from "../managers/AudioManager";
import { clamp, mapRange } from "../utils/MathUtils";
import { formatCountdown, mixColor } from "../utils/Helpers";

/**
 * Betting countdown: a sweeping ring with the seconds in the middle.
 *
 * The arc is only re-drawn when the value actually moves by a visible amount —
 * a `Graphics` rebuild every frame is one of the easiest ways to lose 60 FPS in
 * Pixi, and a countdown does not need sub-degree precision.
 */
export class Timer extends Container {
  private readonly ctx: GameContext;
  private readonly ring = new Graphics();
  private readonly track = new Graphics();
  private readonly digits: BitmapText;
  private readonly caption: BitmapText;

  private radius = 62;
  private progress = 1;
  private lastDrawnProgress = -1;
  private remaining = 0;
  private lastWholeSecond = -1;
  private urgent = false;
  private pulseTween: Tween | null = null;
  private active = false;

  constructor(ctx: GameContext) {
    super();
    this.ctx = ctx;

    this.digits = new BitmapText({
      text: "00",
      style: { fontFamily: Fonts.Countdown, fontSize: 68 },
    });
    this.digits.anchor.set(0.5);

    this.caption = new BitmapText({
      text: "",
      style: { fontFamily: Fonts.Label, fontSize: 22 },
    });
    this.caption.anchor.set(0.5);
    this.caption.alpha = 0.75;

    this.addChild(this.track, this.ring, this.digits, this.caption);
    this.visible = false;
    this.drawTrack();
  }

  setRadius(radius: number): void {
    this.radius = radius;
    this.digits.scale.set(radius / 62);
    this.caption.scale.set(radius / 62);
    this.caption.y = radius + 20;
    this.lastDrawnProgress = -1;
    this.drawTrack();
    this.drawRing();
  }

  private drawTrack(): void {
    this.track
      .clear()
      .circle(0, 0, this.radius)
      .fill({ color: 0x000000, alpha: 0.55 })
      .circle(0, 0, this.radius)
      .stroke({ width: 8, color: 0xffffff, alpha: 0.12 });
  }

  private drawRing(): void {
    const start = -Math.PI / 2;
    const end = start + Math.PI * 2 * clamp(this.progress, 0, 1);
    const color = this.urgent
      ? Palette.danger
      : mixColor(Palette.gold, Palette.tie, mapRange(this.progress, 0.3, 1, 0, 1));

    this.ring.clear();
    if (this.progress > 0.001) {
      this.ring.arc(0, 0, this.radius, start, end).stroke({
        width: 8,
        color,
        cap: "round",
      });
    }
    this.digits.tint = this.urgent ? Palette.danger : Palette.white;
  }

  /* ---------------------------------------------------------------- *
   * Driving
   * ---------------------------------------------------------------- */

  start(caption = "PLACE YOUR BETS"): void {
    this.active = true;
    this.caption.text = caption;
    this.visible = true;
    this.alpha = 0;
    this.scale.set(0.8);
    this.lastWholeSecond = -1;
    this.setUrgent(false);
    this.ctx.animation.to(this, { alpha: 1, duration: 0.28, ease: Ease.uiIn });
    this.ctx.animation.to(this.scale, { x: 1, y: 1, duration: 0.36, ease: Ease.uiIn });
  }

  /** Fed by `UPDATE_TIMER`; safe to call at any frequency. */
  update(remainingSeconds: number, totalSeconds: number): void {
    if (!this.active) return;

    this.remaining = Math.max(0, remainingSeconds);
    this.progress = totalSeconds > 0 ? clamp(this.remaining / totalSeconds, 0, 1) : 0;

    const whole = Math.ceil(this.remaining);
    if (whole !== this.lastWholeSecond) {
      this.lastWholeSecond = whole;
      this.digits.text = formatCountdown(this.remaining);
      if (whole > 0 && whole <= this.ctx.config.timing.urgentSeconds) {
        this.ctx.audio.play(whole <= 3 ? Sfx.CountdownFinal : Sfx.CountdownTick);
        this.beat();
      }
    }

    this.setUrgent(this.remaining <= this.ctx.config.timing.urgentSeconds && this.remaining > 0);

    // Redraw only on a visible change (~1/720 of the sweep).
    if (Math.abs(this.progress - this.lastDrawnProgress) > 0.0014) {
      this.lastDrawnProgress = this.progress;
      this.drawRing();
    }
  }

  private setUrgent(urgent: boolean): void {
    if (this.urgent === urgent) return;
    this.urgent = urgent;
    this.lastDrawnProgress = -1;
    this.drawRing();

    this.ctx.animation.kill(this.pulseTween);
    this.pulseTween = null;

    if (urgent) {
      this.pulseTween = this.ctx.animation.to(this.scale, {
        x: 1.08,
        y: 1.08,
        duration: 0.5,
        ease: Ease.glow,
        yoyo: true,
        repeat: -1,
      });
    } else {
      this.ctx.animation.to(this.scale, { x: 1, y: 1, duration: 0.2 });
    }
  }

  /** One-second heartbeat on the digits. */
  private beat(): void {
    this.ctx.animation.killTweensOf(this.digits.scale);
    const base = this.radius / 62;
    this.ctx.animation.fromTo(
      this.digits.scale,
      { x: base * 1.3, y: base * 1.3 },
      { x: base, y: base, duration: 0.32, ease: Ease.uiIn },
    );
  }

  stop(caption = "BETS CLOSED"): void {
    if (!this.active) return;
    this.active = false;
    this.caption.text = caption;
    this.setUrgent(false);
    this.progress = 0;
    this.lastDrawnProgress = -1;
    this.drawRing();
    this.digits.text = "00";

    this.ctx.animation.to(this, {
      alpha: 0,
      duration: 0.4,
      delay: 0.6,
      ease: Ease.uiOut,
      onComplete: () => {
        this.visible = false;
      },
    });
  }

  hideImmediately(): void {
    this.active = false;
    this.visible = false;
    this.alpha = 0;
    this.ctx.animation.kill(this.pulseTween);
    this.pulseTween = null;
  }

  override destroy(): void {
    this.ctx.animation.kill(this.pulseTween);
    this.ctx.animation.killTweensOf(this);
    this.ctx.animation.killTweensOf(this.scale);
    this.ctx.animation.killTweensOf(this.digits.scale);
    super.destroy({ children: true });
  }
}
