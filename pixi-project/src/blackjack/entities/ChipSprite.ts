import { Container, Sprite } from "pixi.js";
import { TextureFactory } from "../utils/textures";

export const CHIP_DIAMETER = 74;

/** A casino chip: the generated chip texture plus a contact shadow. */
export class ChipSprite extends Container {
  private readonly shadow: Sprite;
  private readonly disc: Sprite;
  private valueAmount = 0;

  constructor(
    private readonly textures: TextureFactory,
    value: number,
    diameter = CHIP_DIAMETER,
  ) {
    super();

    this.shadow = new Sprite(this.textures.softShadow(96, 96));
    this.shadow.anchor.set(0.5);
    this.shadow.width = diameter * 1.3;
    this.shadow.height = diameter * 0.7;
    this.shadow.y = diameter * 0.32;
    this.shadow.alpha = 0.45;

    this.disc = new Sprite();
    this.disc.anchor.set(0.5);

    this.addChild(this.shadow, this.disc);
    this.setValue(value, diameter);
  }

  get value(): number {
    return this.valueAmount;
  }

  setValue(value: number, diameter = this.disc.width || CHIP_DIAMETER): void {
    this.valueAmount = value;
    this.disc.texture = this.textures.chip(value);
    this.disc.setSize(diameter, diameter);
  }

  setShadowVisible(visible: boolean): void {
    this.shadow.visible = visible;
  }
}
