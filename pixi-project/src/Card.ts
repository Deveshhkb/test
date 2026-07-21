import { Container, Sprite, Texture } from "pixi.js";
import gsap from "gsap";

export class Card extends Container {
  private front: Sprite;
  private back: Sprite;
  private isFlipped = false;

  constructor(backTexture: Texture, frontTexture: Texture) {
    super();

    // Back of the card
    this.back = new Sprite(backTexture);
    this.back.anchor.set(0.5);
    this.back.scale.set(0.75);
    this.addChild(this.back);

    // Front of the card
    this.front = new Sprite(frontTexture);
    this.front.anchor.set(0.5);
    this.front.visible = false;
    this.addChild(this.front);
  }

  public placeAt(x: number, y: number) {
    this.position.set(x, y);
  }

  public flip(delay: number = 0): Promise<void> {
    return new Promise(resolve => {
      if (this.isFlipped) {
        resolve();
        return;
      }
      this.isFlipped = true;

      gsap.to(this.back.scale, {
        x: 0,
        duration: 0.3,
        delay,
        onComplete: () => {
          this.back.visible = false;
          this.front.visible = true;
          this.front.scale.set(0, 1.05);
          gsap.to(this.front.scale, {
            x: 1,
            y: 1,
            duration: 0.3,
            onComplete: () => resolve(),
          });
        },
      });
    });
  }
}
