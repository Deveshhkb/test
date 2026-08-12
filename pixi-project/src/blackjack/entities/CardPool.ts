import { Container } from "pixi.js";
import { CardSprite } from "./CardSprite";
import { TextureFactory } from "../utils/textures";

/**
 * Recycles card sprites between rounds. Creating a handful of sprites once and
 * reusing them avoids per-round allocation and texture churn on low-end
 * devices, where garbage collection is the main cause of dropped frames.
 */
export class CardPool {
  private readonly available: CardSprite[] = [];
  private readonly inUse = new Set<CardSprite>();

  constructor(
    private readonly layer: Container,
    private readonly textures: TextureFactory,
    prewarm = 12,
  ) {
    for (let i = 0; i < prewarm; i += 1) {
      this.available.push(new CardSprite(this.textures));
    }
  }

  acquire(): CardSprite {
    const sprite = this.available.pop() ?? new CardSprite(this.textures);
    sprite.reset();
    this.inUse.add(sprite);
    this.layer.addChild(sprite);
    return sprite;
  }

  release(sprite: CardSprite): void {
    if (!this.inUse.delete(sprite)) return;
    sprite.reset();
    sprite.removeFromParent();
    this.available.push(sprite);
  }

  releaseAll(): void {
    for (const sprite of [...this.inUse]) this.release(sprite);
  }

  destroy(): void {
    this.releaseAll();
    for (const sprite of this.available) sprite.destroy({ children: true });
    this.available.length = 0;
  }
}
