import { Container, Rectangle, Text, type ContainerOptions } from "pixi.js";
import { layout, type LayoutContext } from "./LayoutManager";

/**
 * Base class for every scene, panel, popup and button in the game.
 *
 * Subclasses only implement `onLayout(ctx)`. Registration with the
 * LayoutManager happens automatically the moment the object is added to a
 * parent, and is torn down when it is removed or destroyed — so new UI is
 * responsive by default and cannot leak layout callbacks.
 */
export abstract class ResponsiveContainer extends Container {
  /** Lower values lay out first; containers should settle before their content. */
  protected layoutOrder = 0;

  private unregister: (() => void) | null = null;
  private boundLayout = (ctx: LayoutContext) => this.safeLayout(ctx);

  constructor(options?: ContainerOptions) {
    super(options);

    this.on("added", this.attachLayout, this);
    this.on("removed", this.detachLayout, this);
    this.on("destroyed", this.detachLayout, this);
  }

  /** Position and size this object for the given viewport. */
  protected abstract onLayout(ctx: LayoutContext): void;

  /** Re-run layout immediately using the current context. */
  refreshLayout(): void {
    if (layout.isReady) this.safeLayout(layout.current);
  }

  private attachLayout(): void {
    if (this.unregister) return;
    this.unregister = layout.register(this.boundLayout, this.layoutOrder);
  }

  private detachLayout(): void {
    this.unregister?.();
    this.unregister = null;
  }

  private safeLayout(ctx: LayoutContext): void {
    if (this.destroyed) {
      this.detachLayout();
      return;
    }
    this.onLayout(ctx);
  }

  /**
   * Sets an explicit, pointer-friendly hit area. Touch targets are grown to at
   * least `ctx.minTouch` without changing the artwork, so small icons stay
   * comfortably tappable on phones.
   *
   * `maxWidth` / `maxHeight` cap that growth at the slot the parent allocated,
   * which stops neighbouring controls from stealing each other's taps when the
   * layout is tighter than the ideal touch size.
   */
  protected setHitArea(
    width: number,
    height: number,
    ctx: LayoutContext,
    options: {
      anchored?: boolean;
      maxWidth?: number;
      maxHeight?: number;
    } = {},
  ): void {
    const {
      anchored = true,
      maxWidth = Infinity,
      maxHeight = Infinity,
    } = options;
    const w = Math.min(
      Math.max(width, ctx.minTouch),
      Math.max(width, maxWidth),
    );
    const h = Math.min(
      Math.max(height, ctx.minTouch),
      Math.max(height, maxHeight),
    );
    const x = anchored ? -w / 2 : -(w - width) / 2;
    const y = anchored ? -h / 2 : -(h - height) / 2;
    this.hitArea = new Rectangle(x, y, w, h);
  }
}

/**
 * Keeps text crisp when it lives inside a container that is scaled at runtime:
 * the glyph atlas is rasterised at (renderer resolution x world scale) instead
 * of being magnified from a 1x bitmap.
 */
export function syncTextResolution(
  text: Text,
  ctx: LayoutContext,
  worldScale = 1,
): void {
  const target = Math.min(4, Math.max(1, ctx.resolution * worldScale));
  if (Math.abs(text.resolution - target) > 0.05) {
    text.resolution = target;
  }
}
