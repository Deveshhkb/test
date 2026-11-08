import { Assets, Graphics, Text } from "pixi.js";
import { Scene } from "../core/Scene";
import { Game } from "../core/Game";
import { GameScene } from "./GameScene";

export class LoadingScene extends Scene {
  private bar = new Graphics();
  private percentText = new Text({
    text: "Loading 0%",
    style: { fill: "#ffffff", fontSize: 40 },
  });
  private progress = 0;

  async onEnter() {
    this.percentText.anchor.set(0.5);
    this.addChild(this.bar, this.percentText);
    this.draw();

    await Assets.loadBundle("preload");
    await Assets.loadBundle("game", (p) => {
      this.progress = p;
      this.draw();
    });
    await Game.goTo(GameScene);
  }

  resize(w: number, h: number, portrait: boolean) {
    super.resize(w, h, portrait);
    this.draw();
  }

  private draw() {
    const w = this.designWidth * 0.6;
    const x = (this.designWidth - w) / 2;
    const y = this.designHeight / 2;
    this.bar
      .clear()
      .roundRect(x, y, w, 24, 12)
      .fill(0x333344)
      .roundRect(x, y, Math.max(24, w * this.progress), 24, 12)
      .fill(0x4f7cff);
    this.percentText.text = `Loading ${Math.round(this.progress * 100)}%`;
    this.percentText.position.set(this.designWidth / 2, y - 50);
  }
}
