import { Container, Graphics, Sprite } from "pixi.js";
import { CARD_LAYOUT, COLORS } from "../config/gameConfig";
import { TextureFactory } from "../utils/textures";

/**
 * The dealing shoe. Cards visually originate here, and the stack thins out as
 * the shoe is depleted so the table reads as a real game in progress.
 */
export class ShoeSprite extends Container {
  private readonly stack: Sprite[] = [];

  constructor(textures: TextureFactory) {
    super();

    const width = CARD_LAYOUT.width * 0.92;
    const height = CARD_LAYOUT.height * 0.92;

    const holder = new Graphics()
      .roundRect(-width * 0.78, -height * 0.62, width * 1.56, height * 1.24, 14)
      .fill({ color: 0x9fd4e8, alpha: 0.16 })
      .roundRect(-width * 0.78, -height * 0.62, width * 1.56, height * 1.24, 14)
      .stroke({ width: 2, color: 0xcfeaf5, alpha: 0.45 })
      .roundRect(-width * 0.7, height * 0.36, width * 1.4, 14, 6)
      .fill({ color: 0xffffff, alpha: 0.12 });
    this.addChild(holder);

    for (let i = 0; i < 4; i += 1) {
      const card = new Sprite(textures.cardBack());
      card.anchor.set(0.5);
      card.setSize(width, height);
      card.position.set(-i * 2.2, -i * 2.6);
      this.stack.push(card);
      this.addChild(card);
    }

    this.addChild(
      new Graphics()
        .roundRect(-width * 0.78, -height * 0.62, width * 1.56, 10, 5)
        .fill({ color: COLORS.goldLight, alpha: 0.22 }),
    );

    this.rotation = -0.12;
  }

  /** Reflects how much of the shoe is left (0..1) in the visible stack height. */
  setFill(ratio: number): void {
    const visible = Math.max(1, Math.round(ratio * this.stack.length));
    this.stack.forEach((card, index) => {
      card.visible = index < visible;
    });
  }
}
