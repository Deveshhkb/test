/**
 * Mutable 2D vector. Every operation writes into an existing instance so the
 * physics step allocates nothing per frame.
 */
export class Vec2 {
  constructor(
    public x = 0,
    public y = 0,
  ) {}

  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  copyFrom(v: Vec2): this {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  add(x: number, y: number): this {
    this.x += x;
    this.y += y;
    return this;
  }

  addScaled(v: Vec2, s: number): this {
    this.x += v.x * s;
    this.y += v.y * s;
    return this;
  }

  scale(s: number): this {
    this.x *= s;
    this.y *= s;
    return this;
  }

  get lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  get length(): number {
    return Math.hypot(this.x, this.y);
  }
}
