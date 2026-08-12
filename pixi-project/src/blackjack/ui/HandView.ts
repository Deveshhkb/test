import {
  CardAnimator,
  Point,
  computeHandSlots,
  whenDone,
} from "../animation/CardAnimation";
import { CardPool } from "../entities/CardPool";
import { CardSprite } from "../entities/CardSprite";
import { Card } from "../game/Card";

/**
 * Visual representation of one hand: owns its card sprites, keeps the fan
 * centred on its origin, and exposes the deal/reveal/clear animations the
 * controller drives. Used for both the dealer and every seat.
 */
export class HandView {
  private readonly sprites: CardSprite[] = [];

  constructor(
    private readonly pool: CardPool,
    private readonly animator: CardAnimator,
    private origin: Point,
  ) {}

  get cards(): readonly CardSprite[] {
    return this.sprites;
  }

  get size(): number {
    return this.sprites.length;
  }

  get isEmpty(): boolean {
    return this.sprites.length === 0;
  }

  setOrigin(origin: Point): void {
    this.origin = origin;
    this.animator.relayout(this.sprites, this.origin, false);
  }

  /** Adds a card and animates it from the shoe into the re-fanned hand. */
  async dealCard(card: Card, faceUp: boolean, delay = 0): Promise<void> {
    const sprite = this.pool.acquire();
    sprite.setCard(card, false);

    // The fan is recomputed for the larger hand: cards already on the felt
    // slide into their new slots while the new card flies to the last one.
    const slots = computeHandSlots(this.sprites.length + 1, this.origin);
    this.animator.relayoutTo(this.sprites, slots);

    this.sprites.push(sprite);
    await this.animator.deal(sprite, slots[slots.length - 1], {
      faceUp,
      delay,
    });
  }

  /** Flips the dealer's hole card. */
  async revealCard(index: number): Promise<void> {
    const sprite = this.sprites[index];
    if (!sprite || sprite.isFaceUp) return;
    await whenDone(sprite.flip());
  }

  /** Sweeps every card toward the discard tray and recycles the sprites. */
  async clear(target: Point): Promise<void> {
    if (this.sprites.length === 0) return;
    const sprites = [...this.sprites];
    this.sprites.length = 0;
    await this.animator.clear(sprites, target);
    for (const sprite of sprites) this.pool.release(sprite);
  }

  /** Immediate teardown, used when the game is destroyed. */
  dispose(): void {
    for (const sprite of this.sprites) this.pool.release(sprite);
    this.sprites.length = 0;
  }
}
