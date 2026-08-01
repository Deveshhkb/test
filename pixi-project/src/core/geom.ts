/**
 * Tiny rectangle helper used by the layout system.
 *
 * Regions are always produced by *carving* slices off a parent rectangle,
 * which is what structurally guarantees that docked panels can never overlap
 * each other, on any screen size or orientation.
 */
export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Rect implements RectLike {
  constructor(
    public x = 0,
    public y = 0,
    public width = 0,
    public height = 0,
  ) {}

  get left() {
    return this.x;
  }

  get right() {
    return this.x + this.width;
  }

  get top() {
    return this.y;
  }

  get bottom() {
    return this.y + this.height;
  }

  get centerX() {
    return this.x + this.width / 2;
  }

  get centerY() {
    return this.y + this.height / 2;
  }

  clone(): Rect {
    return new Rect(this.x, this.y, this.width, this.height);
  }

  /** Returns a copy shrunk by the given padding on every side. */
  inset(top: number, right = top, bottom = top, left = right): Rect {
    return new Rect(
      this.x + left,
      this.y + top,
      Math.max(0, this.width - left - right),
      Math.max(0, this.height - top - bottom),
    );
  }

  /** Removes `size` from the top of this rect (mutating) and returns the slice. */
  carveTop(size: number): Rect {
    const h = Math.min(size, this.height);
    const slice = new Rect(this.x, this.y, this.width, h);
    this.y += h;
    this.height -= h;
    return slice;
  }

  carveBottom(size: number): Rect {
    const h = Math.min(size, this.height);
    const slice = new Rect(this.x, this.bottom - h, this.width, h);
    this.height -= h;
    return slice;
  }

  carveLeft(size: number): Rect {
    const w = Math.min(size, this.width);
    const slice = new Rect(this.x, this.y, w, this.height);
    this.x += w;
    this.width -= w;
    return slice;
  }

  carveRight(size: number): Rect {
    const w = Math.min(size, this.width);
    const slice = new Rect(this.right - w, this.y, w, this.height);
    this.width -= w;
    return slice;
  }

  /** Point at normalised coordinates (0..1) inside the rect. */
  at(nx: number, ny: number): { x: number; y: number } {
    return { x: this.x + this.width * nx, y: this.y + this.height * ny };
  }

  intersects(other: RectLike, tolerance = 0): boolean {
    return (
      this.x + this.width - tolerance > other.x &&
      other.x + other.width - tolerance > this.x &&
      this.y + this.height - tolerance > other.y &&
      other.y + other.height - tolerance > this.y
    );
  }

  contains(other: RectLike, tolerance = 0.5): boolean {
    return (
      other.x >= this.x - tolerance &&
      other.y >= this.y - tolerance &&
      other.x + other.width <= this.right + tolerance &&
      other.y + other.height <= this.bottom + tolerance
    );
  }
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * Responsive sizing primitive: a preferred size expressed as a fraction of a
 * reference length, bounded by hard pixel limits so the result stays usable on
 * both a 320px phone and a 2560px monitor.
 */
export function clampedFraction(
  reference: number,
  fraction: number,
  min: number,
  max: number,
): number {
  return clamp(reference * fraction, Math.min(min, reference), max);
}

/** Uniform scale that makes `src` fit entirely inside `dst` (letterbox). */
export function fitScale(
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
): number {
  return Math.min(dstWidth / srcWidth, dstHeight / srcHeight);
}

/** Uniform scale that makes `src` cover `dst` completely (crop overflow). */
export function coverScale(
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
): number {
  return Math.max(dstWidth / srcWidth, dstHeight / srcHeight);
}
