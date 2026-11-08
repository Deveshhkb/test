import { Container, Graphics, Text } from "pixi.js";
import gsap from "gsap";

/** Simple reusable button with hover / press animation. */
export class Button extends Container {
  constructor(
    label: string,
    onClick: () => void,
    width = 320,
    height = 90,
    color = 0x4f7cff,
  ) {
    super();
    const bg = new Graphics()
      .roundRect(-width / 2, -height / 2, width, height, height / 2)
      .fill(color);
    const text = new Text({
      text: label,
      style: { fill: "#ffffff", fontSize: height * 0.4, fontWeight: "bold" },
    });
    text.anchor.set(0.5);
    this.addChild(bg, text);

    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointerover", () =>
      gsap.to(this.scale, { x: 1.05, y: 1.05, duration: 0.15 }),
    );
    this.on("pointerout", () =>
      gsap.to(this.scale, { x: 1, y: 1, duration: 0.15 }),
    );
    this.on("pointerdown", () =>
      gsap.to(this.scale, { x: 0.95, y: 0.95, duration: 0.08 }),
    );
    this.on("pointerup", () => {
      gsap.to(this.scale, { x: 1.05, y: 1.05, duration: 0.08 });
      onClick();
    });
  }
}
