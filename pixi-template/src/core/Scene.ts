import { Container, type Ticker } from "pixi.js";

/** Base class for every screen (loading, menu, game...). Override what you need. */
export abstract class Scene extends Container {
  /** Current design size – updated on every resize / orientation change. */
  protected designWidth = 0;
  protected designHeight = 0;

  /** Called once after the scene is added. Load assets / build UI here. */
  async onEnter(): Promise<void> {}
  /** Called before the scene is removed. */
  async onExit(): Promise<void> {}
  /** Called every frame. */
  update(_ticker: Ticker): void {}

  /** Called on resize. Re-layout here using designWidth/designHeight. */
  resize(width: number, height: number, _isPortrait: boolean): void {
    this.designWidth = width;
    this.designHeight = height;
  }
}
