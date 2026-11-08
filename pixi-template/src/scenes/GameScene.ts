import { Graphics, Sprite, Text, type Ticker } from "pixi.js";
import gsap from "gsap";
import { Scene } from "../core/Scene";
import { Button } from "../ui/Button";

/** Demo scene – replace with your own game. */
export class GameScene extends Scene {
  private frame = new Graphics();
  private title = new Text({
    text: "PixiJS v8 Template",
    style: { fill: "#ffffff", fontSize: 72, fontWeight: "bold" },
  });
  private bunny = Sprite.from("bunny");
  private button = new Button("Spin", () => this.spin());

  async onEnter() {
    this.title.anchor.set(0.5);
    this.bunny.anchor.set(0.5);
    this.bunny.scale.set(4);
    this.addChild(this.frame, this.title, this.bunny, this.button);
    this.layout();
  }

  update(ticker: Ticker) {
    this.bunny.y += Math.sin(performance.now() / 300) * 0.5 * ticker.deltaTime;
  }

  resize(w: number, h: number, portrait: boolean) {
    super.resize(w, h, portrait);
    this.layout();
  }

  /** Position everything relative to the design size, so it works in portrait AND landscape. */
  private layout() {
    const w = this.designWidth;
    const h = this.designHeight;
    // outline of the safe design area (remove in your game)
    this.frame
      .clear()
      .rect(0, 0, w, h)
      .stroke({ width: 4, color: 0x4f7cff, alpha: 0.4 });
    this.title.position.set(w / 2, h * 0.15);
    this.bunny.position.set(w / 2, h * 0.5);
    this.button.position.set(w / 2, h * 0.82);
  }

  private spin() {
    gsap.to(this.bunny, {
      rotation: this.bunny.rotation + Math.PI * 2,
      duration: 0.8,
      ease: "back.out(1.7)",
    });
  }
}
