import { Container, Graphics } from 'pixi.js';

/** Creates and owns rectangular masks so reels never draw outside the window. */
export class MaskManager {
  private masks: Graphics[] = [];

  apply(target: Container, x: number, y: number, w: number, h: number, parent: Container = target.parent ?? target): Graphics {
    const m = new Graphics().rect(x, y, w, h).fill(0xffffff);
    parent.addChild(m);
    target.mask = m;
    this.masks.push(m);
    return m;
  }

  destroy() {
    this.masks.forEach((m) => m.destroy());
    this.masks = [];
  }
}
