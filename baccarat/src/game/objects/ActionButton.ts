import { BitmapText, Container, Graphics } from "pixi.js";

import { Fonts, Palette } from "../Constants";
import type { GameContext } from "../GameContext";
import { Ease } from "../managers/AnimationManager";
import { shade } from "../utils/Helpers";

export type ActionIcon = "clear" | "deal" | "history" | "undo" | "repeat" | "double" | "menu" | "sound" | "info" | "settings" | "close";

export interface ActionButtonOptions {
  readonly icon: ActionIcon;
  /** Pill caption under the disc. Omit for a bare icon button. */
  readonly caption?: string;
  /** Pill colour; the reference uses green for the two primary actions. */
  readonly captionColor?: number;
  /** Gold treatment for the emphasised control. */
  readonly highlight?: boolean;
  /** Renders text in place of a vector glyph (used for "2×"). */
  readonly glyphText?: string;
  readonly onTap: () => void;
}

/**
 * A round control with an optional caption pill beneath it.
 *
 * This is the reference table's button vocabulary: a dark disc carrying a
 * vector glyph, with a coloured label pill under the two actions that matter
 * (clear and deal). Icons are drawn rather than textured so they stay crisp at
 * any DPI and cost nothing in the atlas.
 */
export class ActionButton extends Container {
  private readonly ctx: GameContext;
  private readonly options: ActionButtonOptions;
  private readonly disc = new Graphics();
  private readonly glyph = new Graphics();
  private readonly pill = new Graphics();
  private readonly caption: BitmapText | null;

  private radius = 42;
  private captionMaxWidth = 0;
  private glyphLabel: BitmapText | null = null;
  private enabled = true;
  private hovering = false;
  private active = false;
  private detach: (() => void) | null = null;

  constructor(ctx: GameContext, options: ActionButtonOptions) {
    super();
    this.ctx = ctx;
    this.options = options;

    this.addChild(this.disc, this.glyph);

    if (options.glyphText) {
      this.glyphLabel = new BitmapText({
        text: options.glyphText,
        style: { fontFamily: Fonts.Numeric, fontSize: 34 },
      });
      this.glyphLabel.anchor.set(0.5);
      this.addChild(this.glyphLabel);
    }

    if (options.caption) {
      this.caption = new BitmapText({
        text: options.caption.toUpperCase(),
        style: { fontFamily: Fonts.Label, fontSize: 20 },
      });
      this.caption.anchor.set(0.5);
      this.addChild(this.pill, this.caption);
    } else {
      this.caption = null;
    }

    this.label = `btn-${options.icon}`;
    this.draw();
    this.detach = ctx.input.makeInteractive(this, {
      onTap: () => {
        if (!this.enabled) {
          this.refuse();
          return;
        }
        options.onTap();
      },
      onPressStart: () => {
        if (!this.enabled) return;
        this.ctx.animation.to(this.scale, { x: 0.9, y: 0.9, duration: 0.08 });
      },
      onPressEnd: () => {
        this.ctx.animation.to(this.scale, { x: 1, y: 1, duration: 0.2, ease: Ease.uiIn });
      },
      onHover: (hovering) => {
        this.hovering = hovering;
        this.draw();
      },
    });
  }

  setRadius(radius: number): void {
    this.radius = radius;
    this.draw();
  }

  /** Caps the caption pill so neighbouring buttons never overlap. */
  setCaptionMaxWidth(width: number): void {
    this.captionMaxWidth = width;
    this.draw();
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.cursor = enabled ? "pointer" : "default";
    this.draw();
    this.ctx.animation.to(this, { alpha: enabled ? 1 : 0.45, duration: 0.18 });
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  get currentRadius(): number {
    return this.radius;
  }

  /** Toggled look, used by the results-panel button. */
  setActive(active: boolean): void {
    if (this.active === active) return;
    this.active = active;
    this.draw();
  }

  setCaption(text: string): void {
    if (this.caption) this.caption.text = text.toUpperCase();
    this.draw();
  }

  /** Pulses to draw the eye — used on Deal once a stake is down. */
  callAttention(): void {
    this.ctx.animation.killTweensOf(this.scale);
    this.ctx.animation.fromTo(
      this.scale,
      { x: 1, y: 1 },
      { x: 1.09, y: 1.09, duration: 0.55, ease: Ease.glow, yoyo: true, repeat: 3 },
    );
  }

  private refuse(): void {
    this.ctx.animation.killTweensOf(this);
    this.ctx.animation.fromTo(
      this,
      { x: this.x - 5 },
      { x: this.x, duration: 0.35, ease: "elastic.out(1.5, 0.4)" },
    );
  }

  private draw(): void {
    const r = this.radius;
    const gold = this.ctx.config.theme.gold;
    const highlighted = (this.options.highlight ?? false) || this.active;

    const face = highlighted ? shade(gold, -0.45) : 0x232a33;
    const rim = !this.enabled ? 0x5c5c5c : highlighted ? Palette.goldBright : gold;

    this.disc
      .clear()
      .circle(0, 0, r)
      .fill({ color: 0x000000, alpha: 0.35 })
      .circle(0, 0, r * 0.96)
      .fill({ color: face, alpha: 0.96 })
      .circle(0, 0, r * 0.96)
      .stroke({ width: Math.max(2, r * 0.08), color: rim, alpha: this.hovering ? 1 : 0.85 })
      // Top-left specular, same treatment as the chips.
      .arc(0, 0, r * 0.82, Math.PI * 1.08, Math.PI * 1.62)
      .stroke({ width: Math.max(1.5, r * 0.06), color: 0xffffff, alpha: 0.16 });

    const ink = !this.enabled ? 0x8a8a8a : highlighted ? Palette.goldBright : 0xd6dbe1;
    if (this.glyphLabel) {
      this.glyph.clear();
      this.glyphLabel.tint = ink;
      this.glyphLabel.scale.set(r / 34);
    } else {
      drawIcon(this.glyph, this.options.icon, r * 0.5, ink);
    }

    if (this.caption) {
      const budget = this.captionMaxWidth > 0 ? this.captionMaxWidth : r * 2.9;
      this.caption.scale.set(1);
      const scale = Math.min(1, (budget - r * 0.4) / Math.max(1, this.caption.width));
      this.caption.scale.set(scale);
      const pillWidth = this.caption.width + r * 0.5;
      const pillHeight = this.caption.height + r * 0.22;
      const pillY = r + pillHeight * 0.55 + 4;
      const color = this.options.captionColor ?? 0x1f9d3a;

      this.pill
        .clear()
        .roundRect(-pillWidth / 2, pillY - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2)
        .fill({ color: this.enabled ? color : 0x4a4a4a, alpha: 0.95 })
        .roundRect(-pillWidth / 2, pillY - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2)
        .stroke({ width: 1.5, color: shade(color, 0.4), alpha: this.enabled ? 0.9 : 0.3 });

      this.caption.position.set(0, pillY);
      this.caption.tint = this.enabled ? 0xffffff : 0xa0a0a0;
    }
  }

  override destroy(): void {
    this.detach?.();
    this.detach = null;
    this.ctx.animation.killTweensOf(this);
    this.ctx.animation.killTweensOf(this.scale);
    super.destroy({ children: true });
  }
}

/* ------------------------------------------------------------------ *
 * Vector icons
 * ------------------------------------------------------------------ */

function drawIcon(g: Graphics, icon: ActionIcon, size: number, color: number): void {
  g.clear();
  const w = Math.max(2.5, size * 0.22);
  const stroke = { width: w, color, cap: "round" as const, join: "round" as const };

  switch (icon) {
    case "clear":
    case "close":
      g.moveTo(-size * 0.62, -size * 0.62)
        .lineTo(size * 0.62, size * 0.62)
        .moveTo(size * 0.62, -size * 0.62)
        .lineTo(-size * 0.62, size * 0.62)
        .stroke(stroke);
      break;

    case "deal": {
      // Two overlapping cards, the back one tilted.
      const cw = size * 0.72;
      const ch = size * 1.0;
      g.roundRect(-cw * 0.15, -ch * 0.5, cw, ch, size * 0.14)
        .fill({ color, alpha: 0.28 })
        .roundRect(-cw * 0.15, -ch * 0.5, cw, ch, size * 0.14)
        .stroke({ ...stroke, width: w * 0.8 });
      g.roundRect(-cw * 0.95, -ch * 0.38, cw, ch, size * 0.14)
        .fill({ color, alpha: 0.6 })
        .roundRect(-cw * 0.95, -ch * 0.38, cw, ch, size * 0.14)
        .stroke({ ...stroke, width: w * 0.8 });
      break;
    }

    case "history": {
      // Clock face with hands, plus the counter-clockwise arrow head.
      g.circle(0, 0, size * 0.78).stroke({ ...stroke, width: w * 0.9 });
      g.moveTo(0, -size * 0.42)
        .lineTo(0, 0)
        .lineTo(size * 0.36, size * 0.18)
        .stroke({ ...stroke, width: w * 0.85 });
      break;
    }

    // Circular arrows with a solid head — an outlined head reads as noise at
    // the size these secondary buttons are drawn.
    case "undo":
      g.arc(0, 0, size * 0.62, Math.PI * 0.15, Math.PI * 1.5).stroke({ ...stroke, width: w });
      // Head sized against the stroke so it stays visible at 20 px buttons.
      g.moveTo(-size * 0.14, -size * 0.62)
        .lineTo(-size * 0.14 + w * 1.5, -size * 0.62 + w * 1.6)
        .lineTo(-size * 0.14 - w * 1.4, -size * 0.62 + w * 1.9)
        .closePath()
        .fill({ color });
      break;

    case "repeat":
      g.arc(0, 0, size * 0.62, Math.PI * 1.15, Math.PI * 0.5).stroke({ ...stroke, width: w });
      g.moveTo(size * 0.14, size * 0.62)
        .lineTo(size * 0.14 - w * 1.5, size * 0.62 - w * 1.6)
        .lineTo(size * 0.14 + w * 1.4, size * 0.62 - w * 1.9)
        .closePath()
        .fill({ color });
      break;

    case "double":
      // Falls back to the "2×" text glyph supplied by the caller.
      break;

    case "menu":
      for (let i = -1; i <= 1; i++) {
        g.moveTo(-size * 0.7, i * size * 0.42).lineTo(size * 0.7, i * size * 0.42);
      }
      g.stroke(stroke);
      break;

    case "sound":
      g.moveTo(-size * 0.7, -size * 0.25)
        .lineTo(-size * 0.35, -size * 0.25)
        .lineTo(0, -size * 0.7)
        .lineTo(0, size * 0.7)
        .lineTo(-size * 0.35, size * 0.25)
        .lineTo(-size * 0.7, size * 0.25)
        .closePath()
        .fill({ color })
        .stroke({ ...stroke, width: w * 0.6 });
      g.arc(size * 0.1, 0, size * 0.42, -Math.PI * 0.35, Math.PI * 0.35)
        .stroke({ ...stroke, width: w * 0.65 });
      break;

    case "info":
      g.circle(0, 0, size * 0.85).stroke({ ...stroke, width: w * 0.8 });
      g.circle(0, -size * 0.42, w * 0.55).fill({ color });
      g.moveTo(0, -size * 0.1)
        .lineTo(0, size * 0.5)
        .stroke({ ...stroke, width: w * 0.9 });
      break;

    case "settings": {
      g.circle(0, 0, size * 0.34).stroke({ ...stroke, width: w * 0.8 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.moveTo(Math.cos(a) * size * 0.52, Math.sin(a) * size * 0.52).lineTo(
          Math.cos(a) * size * 0.85,
          Math.sin(a) * size * 0.85,
        );
      }
      g.stroke({ ...stroke, width: w * 0.8 });
      break;
    }
  }
}
