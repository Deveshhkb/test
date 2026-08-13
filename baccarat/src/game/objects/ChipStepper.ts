import { Container, Graphics, Sprite } from "pixi.js";

import { CHIP_SIZE, Palette } from "../Constants";
import type { GameContext } from "../GameContext";
import { Ease } from "../managers/AnimationManager";
import { Sfx } from "../managers/AudioManager";

/**
 * Denomination selector as a stepper: `[−] (chip) [+]`.
 *
 * One chip is on screen at a time and the arrows walk the ladder, which is how
 * the reference table does it — it costs a third of the width of a full chip
 * tray and survives a 360 px phone without shrinking the chip to illegibility.
 * The arrows disable at the ends of the ladder rather than wrapping, so the
 * player always knows where they are in the range.
 */
export class ChipStepper extends Container {
  private readonly ctx: GameContext;
  private readonly minus = new Container();
  private readonly plus = new Container();
  private readonly minusArt = new Graphics();
  private readonly plusArt = new Graphics();
  private readonly chipHolder = new Container();
  private readonly chip: Sprite;

  private readonly detachers: Array<() => void> = [];
  private index = 0;
  private buttonRadius = 46;
  private chipScale = 1;

  constructor(ctx: GameContext) {
    super();
    this.ctx = ctx;

    this.chip = new Sprite(ctx.assets.get(`chip_${ctx.config.chips[0]?.value ?? 1}`));
    this.chip.anchor.set(0.5);
    this.chipHolder.addChild(this.chip);

    this.minus.addChild(this.minusArt);
    this.plus.addChild(this.plusArt);

    this.minus.label = "chip-minus";
    this.plus.label = "chip-plus";
    this.addChild(this.minus, this.chipHolder, this.plus);

    this.detachers.push(
      ctx.input.makeInteractive(this.minus, {
        sound: false,
        onTap: () => this.step(-1),
        onPressStart: () => this.press(this.minus, true),
        onPressEnd: () => this.press(this.minus, false),
      }),
      ctx.input.makeInteractive(this.plus, {
        sound: false,
        onTap: () => this.step(1),
        onPressStart: () => this.press(this.plus, true),
        onPressEnd: () => this.press(this.plus, false),
      }),
    );

    this.draw();
  }

  private step(direction: number): void {
    const next = this.index + direction;
    if (next < 0 || next >= this.ctx.config.chips.length) {
      this.nudge(direction);
      return;
    }
    this.ctx.bets.selectChip(next);
    this.ctx.audio.play(Sfx.ChipPlace, { volume: 0.45 });
  }

  private press(target: Container, down: boolean): void {
    this.ctx.animation.to(target.scale, {
      x: down ? 0.9 : 1,
      y: down ? 0.9 : 1,
      duration: down ? 0.08 : 0.2,
      ease: Ease.uiIn,
    });
  }

  /** Small bounce when the player hits the end of the chip ladder. */
  private nudge(direction: number): void {
    this.ctx.animation.killTweensOf(this.chipHolder);
    this.ctx.animation.fromTo(
      this.chipHolder,
      { x: this.chipHolder.x + direction * 10 },
      { x: this.chipHolder.x, duration: 0.35, ease: "elastic.out(1.4, 0.4)" },
    );
  }

  /* ---------------------------------------------------------------- *
   * Layout
   * ---------------------------------------------------------------- */

  resizeTo(width: number, height: number): void {
    const chipDiameter = Math.min(height, width * 0.34);
    this.chipScale = chipDiameter / CHIP_SIZE;
    this.buttonRadius = chipDiameter * 0.42;

    const gap = chipDiameter * 0.2;
    const offset = chipDiameter / 2 + gap + this.buttonRadius;

    this.chipHolder.scale.set(this.chipScale);
    this.chipHolder.position.set(0, 0);
    this.minus.position.set(-offset, 0);
    this.plus.position.set(offset, 0);

    this.draw();
  }

  private draw(): void {
    const r = this.buttonRadius;
    const enabledMinus = this.index > 0;
    const enabledPlus = this.index < this.ctx.config.chips.length - 1;

    drawStepperButton(this.minusArt, r, "minus", enabledMinus);
    drawStepperButton(this.plusArt, r, "plus", enabledPlus);
    this.minus.alpha = enabledMinus ? 1 : 0.45;
    this.plus.alpha = enabledPlus ? 1 : 0.45;
  }

  /** Reflects the manager's selection, which may change from a shortcut key. */
  setSelected(index: number): void {
    const clamped = Math.max(0, Math.min(index, this.ctx.config.chips.length - 1));
    if (clamped === this.index) return;
    this.index = clamped;

    const value = this.ctx.config.chips[clamped]?.value;
    if (value !== undefined) this.chip.texture = this.ctx.assets.get(`chip_${value}`);

    this.ctx.animation.killTweensOf(this.chipHolder.scale);
    this.ctx.animation.fromTo(
      this.chipHolder.scale,
      { x: this.chipScale * 1.22, y: this.chipScale * 1.22 },
      { x: this.chipScale, y: this.chipScale, duration: 0.28, ease: Ease.uiIn },
    );
    this.draw();
  }

  /** Stage-space origin for a chip flying to the layout. */
  originGlobal(): { x: number; y: number } {
    const point = this.chipHolder.toGlobal({ x: 0, y: 0 });
    return { x: point.x, y: point.y };
  }

  /** Rebuilds after the chip ladder changes in config. */
  refresh(): void {
    this.index = Math.min(this.index, Math.max(0, this.ctx.config.chips.length - 1));
    const value = this.ctx.config.chips[this.index]?.value;
    if (value !== undefined) this.chip.texture = this.ctx.assets.get(`chip_${value}`);
    this.draw();
  }

  setEnabled(enabled: boolean): void {
    this.alpha = enabled ? 1 : 0.5;
    this.minus.eventMode = enabled ? "static" : "none";
    this.plus.eventMode = enabled ? "static" : "none";
  }

  override destroy(): void {
    for (const detach of this.detachers.splice(0)) detach();
    this.ctx.animation.killTweensOf(this.chipHolder);
    this.ctx.animation.killTweensOf(this.chipHolder.scale);
    this.ctx.animation.killTweensOf(this.minus.scale);
    this.ctx.animation.killTweensOf(this.plus.scale);
    super.destroy({ children: true });
  }
}

/** Dark disc with a gold rim and a thick +/− glyph, drawn as vectors. */
function drawStepperButton(
  g: Graphics,
  radius: number,
  kind: "plus" | "minus",
  enabled: boolean,
): void {
  const bar = radius * 0.52;
  const thickness = Math.max(4, radius * 0.17);
  const rim = enabled ? Palette.gold : 0x6b6b6b;

  g.clear()
    .circle(0, 0, radius)
    .fill({ color: 0x10202c, alpha: 0.95 })
    .circle(0, 0, radius)
    .stroke({ width: Math.max(2, radius * 0.09), color: rim, alpha: 0.9 })
    .circle(0, 0, radius * 0.82)
    .stroke({ width: 1, color: 0xffffff, alpha: 0.12 });

  g.moveTo(-bar, 0).lineTo(bar, 0);
  if (kind === "plus") g.moveTo(0, -bar).lineTo(0, bar);
  g.stroke({ width: thickness, color: enabled ? Palette.goldBright : 0x8a8a8a, cap: "round" });
}
