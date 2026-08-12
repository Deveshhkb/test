import { Container } from "pixi.js";
import { ChipAnimator } from "../animation/ChipAnimation";
import { Point } from "../animation/CardAnimation";
import { ChipSprite } from "../entities/ChipSprite";
import { TextureFactory } from "../utils/textures";

/** Chips beyond this count are merged into the stack to bound the sprite count. */
const MAX_VISIBLE_CHIPS = 12;
const CHIP_STEP_Y = 7;

/**
 * The stack of chips sitting on a betting box.
 *
 * Sprites live in a shared chip layer expressed in design coordinates, which
 * keeps the flight paths between the chip rail, the box and the balance
 * readout a straight coordinate-space calculation.
 */
export class ChipStackView {
  private readonly chips: ChipSprite[] = [];

  constructor(
    private readonly layer: Container,
    private readonly textures: TextureFactory,
    private readonly animator: ChipAnimator,
    private anchor: Point,
  ) {}

  get count(): number {
    return this.chips.length;
  }

  get anchorPoint(): Point {
    return this.anchor;
  }

  setAnchor(anchor: Point): void {
    this.anchor = anchor;
    this.chips.forEach((chip, index) =>
      chip.position.set(anchor.x, this.slotY(index)),
    );
  }

  /** Flies a chip from `from` onto the top of the stack. */
  async addChip(value: number, from: Point, delay = 0): Promise<void> {
    const chip = new ChipSprite(this.textures, value);
    this.layer.addChild(chip);

    const merging = this.chips.length >= MAX_VISIBLE_CHIPS;
    const index = merging ? this.chips.length - 1 : this.chips.length;
    if (!merging) this.chips.push(chip);

    chip.setShadowVisible(index === 0);
    await this.animator.place(
      chip,
      from,
      { x: this.anchor.x, y: this.slotY(index) },
      delay,
    );

    // The stack may have been cleared or settled while the chip was in flight.
    if (merging) dispose(chip);
  }

  /** Removes the top chip, sending it back toward `to`. */
  async removeTopChip(to: Point): Promise<void> {
    const chip = this.chips.pop();
    if (!chip) return;
    this.animator.interrupt([chip]);
    await this.animator.remove(chip, to);
    dispose(chip);
  }

  /** Sends the whole stack back to the rail, e.g. when the bet is cleared. */
  async removeAllTo(to: Point): Promise<void> {
    const chips = this.take();
    await Promise.all(chips.map((chip) => this.animator.remove(chip, to)));
    chips.forEach(dispose);
  }

  /** Winning wagers fly to the balance panel. */
  async payout(to: Point): Promise<void> {
    const chips = this.take();
    await this.animator.payout(chips, to);
    chips.forEach(dispose);
  }

  /** Losing wagers are swept toward the dealer. */
  async collect(to: Point): Promise<void> {
    const chips = this.take();
    await this.animator.collect(chips, to);
    chips.forEach(dispose);
  }

  clearImmediate(): void {
    this.take().forEach(dispose);
  }

  /**
   * Detaches the current chips and stops whatever they were doing, so a stack
   * cleared mid-flight cannot leave two tweens fighting over the same sprite.
   */
  private take(): ChipSprite[] {
    const chips = [...this.chips];
    this.chips.length = 0;
    this.animator.interrupt(chips);
    return chips;
  }

  private slotY(index: number): number {
    return this.anchor.y - index * CHIP_STEP_Y;
  }
}

/** Destroys a chip once, tolerating a sprite that has already been disposed. */
function dispose(chip: ChipSprite): void {
  if (chip.destroyed) return;
  chip.destroy({ children: true });
}
