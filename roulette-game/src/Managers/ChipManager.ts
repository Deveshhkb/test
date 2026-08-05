import { Container, Text, Texture } from 'pixi.js';
import { Chip } from '../Objects/Chip';
import { TextureFactory } from '../Game/TextureFactory';
import { AnimationManager } from './AnimationManager';
import { Bet, ChipDenomination } from '../Types';
import { Logger } from '../Utilities/Logger';
import { decomposeIntoChips, formatCompact } from '../Utilities/Helpers';
import { randomRange, createRandom } from '../Utilities/Math';

/** Where a stack of chips lives on screen, supplied by the board. */
export interface SpotPosition {
  x: number;
  y: number;
}

/** Resolves a spot id to its current screen position. */
export type SpotResolver = (spotId: string) => SpotPosition | undefined;

interface Stack {
  spotId: string;
  chips: Chip[];
  /** Total label floating above the stack. */
  label: Text;
  amount: number;
}

/**
 * Owns every chip on the felt: pooling, stacking, and the three chip
 * animations that carry the game's feel (place, collect, pay).
 *
 * ## Pooling
 * `Chip` instances are created once and recycled forever. A round that places
 * and clears 60 chips allocates zero objects after warm-up, which is what keeps
 * the GC out of the ticker and the frame time flat across a long session.
 *
 * ## Stacking
 * Real chips stack with a slight vertical offset and a little rotational
 * jitter. The jitter is drawn from a *seeded* generator so a stack looks the
 * same every time it is rebuilt (on resize, say) rather than shuffling itself.
 */
export class ChipManager {
  private readonly log = Logger.create('ChipManager');

  /** Recycled instances, keyed by nothing - any chip can become any value. */
  private readonly pool: Chip[] = [];
  private readonly stacks = new Map<string, Stack>();
  private readonly random = createRandom(0x5eed);

  /** Diameter of a chip in screen pixels; updated on resize. */
  private chipSize = 34;
  /** Vertical offset between chips in a stack, as a fraction of chip size. */
  private static readonly STACK_OFFSET = 0.13;
  /** Beyond this the stack stops growing visually and the label carries the value. */
  private static readonly MAX_VISIBLE_PER_STACK = 8;

  public constructor(
    private readonly layer: Container,
    private readonly textures: TextureFactory,
    private readonly animations: AnimationManager,
    private denominations: readonly ChipDenomination[],
  ) {}

  public updateDenominations(denominations: readonly ChipDenomination[]): void {
    this.denominations = denominations;
  }

  public setChipSize(size: number): void {
    this.chipSize = size;
    for (const stack of this.stacks.values()) {
      for (const chip of stack.chips) chip.setDiameter(size);
      stack.label.style.fontSize = Math.max(9, size * 0.42);
    }
  }

  public getChipSize(): number {
    return this.chipSize;
  }

  /* --------------------------------------------------------------------- */
  /* Stack synchronisation                                                 */
  /* --------------------------------------------------------------------- */

  /**
   * Bring the felt in line with the authoritative bet state.
   *
   * Called after every `BETS_CHANGED` and on every resize. Stacks that no
   * longer have a bet are recycled; the rest are repositioned and relabelled.
   */
  public syncStacks(bets: readonly Bet[], resolve: SpotResolver): void {
    const live = new Set(bets.map((bet) => bet.spotId));

    for (const spotId of [...this.stacks.keys()]) {
      if (!live.has(spotId)) this.removeStack(spotId, false);
    }

    for (const bet of bets) {
      const position = resolve(bet.spotId);
      if (!position) continue;
      this.renderStack(bet, position);
    }
  }

  /**
   * Fly a chip from the tray onto a spot, then fold it into the stack.
   *
   * The arc is a two-segment tween rather than a straight line: chips in a live
   * studio are pushed across the felt, they do not teleport. The overshoot on
   * the `back.out` landing is the single detail that makes placement feel
   * tactile.
   */
  public animatePlacement(
    value: number,
    from: SpotPosition,
    to: SpotPosition,
    stackIndex: number,
  ): void {
    const denomination = this.resolveDenomination(value);
    const chip = this.acquire(denomination);
    chip.position.set(from.x, from.y);
    chip.scale.set(0.55);
    chip.alpha = 0.9;
    this.layer.addChild(chip);

    const landingY = to.y - stackIndex * this.chipSize * ChipManager.STACK_OFFSET;

    const timeline = this.animations.timeline({
      onComplete: () => {
        // The flying chip is transient - the durable stack is rebuilt from the
        // authoritative bet state by `syncStacks`.
        this.release(chip);
      },
    });

    timeline
      .to(chip, {
        x: to.x,
        y: landingY,
        duration: 0.34,
        ease: 'power2.out',
      })
      .to(
        chip.scale,
        { x: 1, y: 1, duration: 0.34, ease: AnimationManager.EASE_CHIP_PLACE },
        '<',
      )
      .to(chip, { alpha: 1, duration: 0.14 }, '<')
      .to(chip, { alpha: 0, duration: 0.001 });
  }

  /* --------------------------------------------------------------------- */
  /* Round-end animations                                                  */
  /* --------------------------------------------------------------------- */

  /**
   * Losing chips: a brief dim, then a sweep toward the dealer side of the
   * table. Staggered so 20 losing stacks read as one gesture rather than 20.
   */
  public animateLoss(spotIds: readonly string[], sweepTo: SpotPosition, duration = 0.75): void {
    let index = 0;
    for (const spotId of spotIds) {
      const stack = this.stacks.get(spotId);
      if (!stack) continue;

      const delay = index * 0.035;
      index += 1;

      for (const chip of stack.chips) {
        chip.setTint(0x6b6b6b);
        this.animations.to(chip, {
          x: sweepTo.x,
          y: sweepTo.y,
          alpha: 0,
          duration,
          delay,
          ease: 'power2.in',
        });
        this.animations.to(chip.scale, { x: 0.5, y: 0.5, duration, delay, ease: 'power2.in' });
      }
      this.animations.to(stack.label, { alpha: 0, duration: 0.2, delay });
    }
  }

  /**
   * Winning chips: the stake pulses, then stake + winnings travel to the
   * balance readout.
   *
   * Returns a promise so the payout state can wait for the visuals to land
   * before advancing - the balance number must not tick up before the chips
   * arrive, or the causality reads backwards.
   */
  public animateWin(
    spotIds: readonly string[],
    collectTo: SpotPosition,
    duration = 0.85,
  ): Promise<void> {
    const targets = spotIds.map((id) => this.stacks.get(id)).filter((s): s is Stack => !!s);
    if (targets.length === 0) return Promise.resolve();

    return new Promise((resolve) => {
      const timeline = this.animations.timeline({ onComplete: resolve });

      targets.forEach((stack, index) => {
        const delay = index * 0.06;

        // Pulse: "this one won".
        for (const chip of stack.chips) {
          timeline.to(
            chip.scale,
            { x: 1.22, y: 1.22, duration: 0.16, yoyo: true, repeat: 1, ease: 'sine.inOut' },
            delay,
          );
        }
        timeline.to(
          stack.label.scale,
          { x: 1.3, y: 1.3, duration: 0.16, yoyo: true, repeat: 1, ease: 'sine.inOut' },
          delay,
        );

        // Collect: chips arc to the balance, trailing slightly apart so the
        // stack visibly comes apart rather than sliding as one block.
        stack.chips.forEach((chip, chipIndex) => {
          timeline.to(
            chip,
            {
              x: collectTo.x + randomRange(this.random, -8, 8),
              y: collectTo.y + randomRange(this.random, -6, 6),
              alpha: 0,
              duration,
              ease: AnimationManager.EASE_CHIP_COLLECT,
            },
            delay + 0.36 + chipIndex * 0.03,
          );
          timeline.to(
            chip.scale,
            { x: 0.42, y: 0.42, duration, ease: AnimationManager.EASE_CHIP_COLLECT },
            delay + 0.36 + chipIndex * 0.03,
          );
        });

        timeline.to(stack.label, { alpha: 0, duration: 0.24 }, delay + 0.36);
      });
    });
  }

  /** Clear everything, optionally with a quick fade. */
  public clearAll(animated = false): void {
    for (const spotId of [...this.stacks.keys()]) this.removeStack(spotId, animated);
  }

  public destroy(): void {
    this.clearAll(false);
    for (const chip of this.pool) chip.destroy({ children: true });
    this.pool.length = 0;
  }

  /* --------------------------------------------------------------------- */
  /* Stack rendering                                                       */
  /* --------------------------------------------------------------------- */

  private renderStack(bet: Bet, position: SpotPosition): void {
    let stack = this.stacks.get(bet.spotId);

    if (!stack) {
      const label = new Text({
        text: '',
        style: {
          fontFamily: 'Arial, sans-serif',
          fontSize: Math.max(9, this.chipSize * 0.42),
          fontWeight: 'bold',
          fill: 0xffffff,
          stroke: { color: 0x000000, width: 3, join: 'round' },
        },
      });
      label.anchor.set(0.5);
      this.layer.addChild(label);
      stack = { spotId: bet.spotId, chips: [], label, amount: 0 };
      this.stacks.set(bet.spotId, stack);
    }

    // Decompose the stake into a believable pile, capped so a huge bet does not
    // grow a tower off the top of the screen.
    const composition = decomposeIntoChips(
      bet.amount,
      this.denominations.map((d) => d.value),
      ChipManager.MAX_VISIBLE_PER_STACK,
    );

    // Grow or shrink the pooled chip list to match.
    while (stack.chips.length > composition.length) {
      const chip = stack.chips.pop();
      if (chip) this.release(chip);
    }
    while (stack.chips.length < composition.length) {
      stack.chips.push(this.acquire(this.resolveDenomination(composition[stack.chips.length])));
    }

    // Bottom of the pile draws first so upper chips overlap correctly.
    composition.forEach((value, index) => {
      const chip = stack.chips[index];
      const denomination = this.resolveDenomination(value);
      chip.configure(this.textures.getChipTexture(denomination), denomination.value, this.chipSize);
      chip.spotId = bet.spotId;
      chip.stackIndex = index;
      chip.position.set(
        position.x + randomRange(this.random, -1.2, 1.2),
        position.y - index * this.chipSize * ChipManager.STACK_OFFSET,
      );
      chip.rotation = randomRange(this.random, -0.06, 0.06);
      chip.alpha = 1;
      chip.scale.set(1);
      chip.setTint(0xffffff);
      // Later chips must render above earlier ones.
      this.layer.addChild(chip);
    });

    stack.amount = bet.amount;
    // A single chip already shows its own denomination - repeating it above the
    // stack is noise, and on a dense layout it is noise that overlaps a
    // neighbouring cell.
    stack.label.text = composition.length > 1 ? formatCompact(bet.amount) : '';
    stack.label.alpha = 1;
    stack.label.scale.set(1);
    stack.label.position.set(
      position.x,
      position.y - composition.length * this.chipSize * ChipManager.STACK_OFFSET - this.chipSize * 0.52,
    );
    // Label above every chip in the stack.
    this.layer.addChild(stack.label);
  }

  private removeStack(spotId: string, animated: boolean): void {
    const stack = this.stacks.get(spotId);
    if (!stack) return;
    this.stacks.delete(spotId);

    if (!animated) {
      for (const chip of stack.chips) this.release(chip);
      stack.label.destroy();
      return;
    }

    for (const chip of stack.chips) {
      this.animations.to(chip, {
        alpha: 0,
        duration: 0.2,
        ease: 'power1.in',
        onComplete: () => this.release(chip),
      });
    }
    this.animations.to(stack.label, {
      alpha: 0,
      duration: 0.2,
      onComplete: () => stack.label.destroy(),
    });
  }

  /* --------------------------------------------------------------------- */
  /* Pool                                                                  */
  /* --------------------------------------------------------------------- */

  private acquire(denomination: ChipDenomination): Chip {
    const texture = this.textures.getChipTexture(denomination);
    const pooled = this.pool.pop();

    if (pooled) {
      pooled.reset();
      pooled.configure(texture, denomination.value, this.chipSize);
      return pooled;
    }

    const chip = new Chip(texture);
    chip.configure(texture, denomination.value, this.chipSize);
    return chip;
  }

  private release(chip: Chip): void {
    // Any tween still pointing at this chip would keep animating it after it is
    // handed to the next caller.
    this.animations.killTweensOf(chip);
    this.animations.killTweensOf(chip.scale);
    chip.removeFromParent();
    chip.reset();
    chip.visible = false;
    this.pool.push(chip);
  }

  /**
   * Nearest available denomination at or below `value`, falling back to the
   * smallest. A stake that does not decompose exactly (an operator using odd
   * currency units) still renders as a plausible chip rather than nothing.
   */
  private resolveDenomination(value: number): ChipDenomination {
    let best = this.denominations[0];
    for (const denomination of this.denominations) {
      if (denomination.value <= value && denomination.value >= best.value) best = denomination;
    }
    if (!best) {
      this.log.warn('no chip denominations configured');
      return { value, color: 0xffffff, accent: 0x888888, label: String(value) };
    }
    return best;
  }

  /** Baked textures are owned by the factory; nothing to release here. */
  public warmUp(count: number): void {
    const texture: Texture = this.textures.getChipTexture(this.denominations[0]);
    for (let i = 0; i < count; i += 1) {
      const chip = new Chip(texture);
      chip.visible = false;
      this.pool.push(chip);
    }
    this.log.debug(`pre-allocated ${count} chips`);
  }
}
