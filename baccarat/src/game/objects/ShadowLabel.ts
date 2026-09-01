import { BitmapText, Container } from "pixi.js";

export interface ShadowLabelOptions {
  readonly text?: string;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly tint?: number;
  /** Shadow colour; defaults to near-black. */
  readonly shadowTint?: number;
  readonly shadowAlpha?: number;
  /** Shadow offset as a fraction of font size. */
  readonly shadowOffset?: number;
  readonly anchorX?: number;
  readonly anchorY?: number;
}

/**
 * BitmapText with a drop shadow behind it.
 *
 * Text sitting directly on a mid-tone felt is the single worst legibility
 * problem in a casino layout: white on crimson has barely 3:1 contrast and goes
 * to mush the moment a chip or a card slides under it. A hard dark shadow costs
 * one extra draw and makes every label readable against anything.
 */
export class ShadowLabel extends Container {
  private readonly shadow: BitmapText;
  private readonly face: BitmapText;
  private offsetRatio: number;

  constructor(options: ShadowLabelOptions) {
    super();

    const style = { fontFamily: options.fontFamily, fontSize: options.fontSize };
    const anchorX = options.anchorX ?? 0.5;
    const anchorY = options.anchorY ?? 0.5;
    this.offsetRatio = options.shadowOffset ?? 0.075;

    this.shadow = new BitmapText({ text: options.text ?? "", style });
    this.shadow.anchor.set(anchorX, anchorY);
    this.shadow.tint = options.shadowTint ?? 0x000000;
    this.shadow.alpha = options.shadowAlpha ?? 0.72;

    this.face = new BitmapText({ text: options.text ?? "", style });
    this.face.anchor.set(anchorX, anchorY);
    this.face.tint = options.tint ?? 0xffffff;

    this.addChild(this.shadow, this.face);
    this.applyOffset(options.fontSize);
  }

  private applyOffset(fontSize: number): void {
    const offset = Math.max(1, fontSize * this.offsetRatio);
    this.shadow.position.set(offset, offset);
  }

  get text(): string {
    return this.face.text;
  }

  set text(value: string) {
    this.face.text = value;
    this.shadow.text = value;
  }

  /** Tints the face only; the shadow stays dark. */
  setTint(tint: number): void {
    this.face.tint = tint;
  }

  setFontScale(scale: number): void {
    this.face.scale.set(scale);
    this.shadow.scale.set(scale);
    this.applyOffset(this.face.style.fontSize * scale);
  }

  /** Width of the rendered glyphs, ignoring the shadow offset. */
  get textWidth(): number {
    return this.face.width;
  }

  get textHeight(): number {
    return this.face.height;
  }

  override destroy(): void {
    super.destroy({ children: true });
  }
}
