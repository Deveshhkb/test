import { BitmapText, Container, Graphics } from "pixi.js";

import { Fonts, Palette } from "../Constants";
import type { GameContext } from "../GameContext";
import { Ease } from "../managers/AnimationManager";
import { shade } from "../utils/Helpers";

export interface ButtonOptions {
  readonly label: string;
  readonly width?: number;
  readonly height?: number;
  readonly color?: number;
  readonly icon?: string;
  readonly onTap: () => void;
}

/**
 * The one button in the game.
 *
 * Handles its own enabled/disabled visuals and press feedback so every control
 * in the bar behaves identically — a small thing that is very obvious when it
 * is missing.
 */
export class Button extends Container {
  private readonly ctx: GameContext;
  private readonly bg = new Graphics();
  private readonly caption: BitmapText;
  private readonly icon: BitmapText | null;
  private readonly options: ButtonOptions;
  private detach: (() => void) | null = null;

  private w: number;
  private h: number;
  private enabled = true;
  private hovering = false;

  constructor(ctx: GameContext, options: ButtonOptions) {
    super();
    this.ctx = ctx;
    this.options = options;
    this.w = options.width ?? 132;
    this.h = options.height ?? 62;

    this.caption = new BitmapText({
      text: options.label.toUpperCase(),
      style: { fontFamily: Fonts.Label, fontSize: 22 },
    });
    this.caption.anchor.set(0.5);

    if (options.icon) {
      this.icon = new BitmapText({
        text: options.icon,
        style: { fontFamily: Fonts.Label, fontSize: 26 },
      });
      this.icon.anchor.set(0.5);
    } else {
      this.icon = null;
    }

    this.addChild(this.bg, this.caption);
    if (this.icon) this.addChild(this.icon);

    this.redraw();
    this.bindInput();
  }

  resizeTo(width: number, height: number): void {
    this.w = width;
    this.h = height;
    this.redraw();
  }

  setLabel(text: string): void {
    this.caption.text = text.toUpperCase();
    this.redraw();
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.cursor = enabled ? "pointer" : "default";
    this.redraw();
    this.ctx.animation.to(this, { alpha: enabled ? 1 : 0.42, duration: 0.18 });
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  private redraw(): void {
    const color = this.options.color ?? Palette.feltLight;
    const top = shade(color, this.hovering && this.enabled ? 0.3 : 0.16);
    const bottom = shade(color, -0.35);
    const radius = Math.min(14, this.h / 2);

    this.bg
      .clear()
      .roundRect(-this.w / 2, -this.h / 2, this.w, this.h, radius)
      .fill(bottom)
      .roundRect(-this.w / 2, -this.h / 2, this.w, this.h * 0.55, radius)
      .fill({ color: top, alpha: 0.9 })
      .roundRect(-this.w / 2, -this.h / 2, this.w, this.h, radius)
      .stroke({ width: 1.5, color: Palette.gold, alpha: this.enabled ? 0.55 : 0.2 });

    const hasIcon = this.icon !== null;
    this.caption.position.set(0, hasIcon ? this.h * 0.16 : 0);
    this.caption.scale.set(Math.min(1, this.w / 130));
    if (this.icon) {
      this.icon.position.set(0, -this.h * 0.18);
      this.icon.scale.set(Math.min(1, this.w / 130));
    }
  }

  private bindInput(): void {
    this.detach = this.ctx.input.makeInteractive(this, {
      onTap: () => {
        if (!this.enabled) return;
        this.options.onTap();
      },
      onPressStart: () => {
        if (!this.enabled) return;
        this.ctx.animation.to(this.scale, { x: 0.94, y: 0.94, duration: 0.08 });
      },
      onPressEnd: () => {
        this.ctx.animation.to(this.scale, { x: 1, y: 1, duration: 0.22, ease: Ease.uiIn });
      },
      onHover: (hovering) => {
        this.hovering = hovering;
        this.redraw();
      },
    });
  }

  override destroy(): void {
    this.detach?.();
    this.detach = null;
    this.ctx.animation.killTweensOf(this);
    this.ctx.animation.killTweensOf(this.scale);
    super.destroy({ children: true });
  }
}
