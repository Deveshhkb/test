import { Container, Graphics, Text } from "pixi.js";

export class TopHistory extends Container {
  private labelText: Text;

  constructor(type: "D" | "T" | "Tie") {
    super();

    const circle = new Graphics();
    let color = 0xff0000;
    if (type === "D") color = 0x0000ff;
    if (type === "Tie") color = 0x00aa00;

    circle.circle(0, 0, 25);
    circle.fill(color);
    this.addChild(circle);

    this.labelText = new Text({
      text: type,
      style: {
        fontFamily: "Arial",
        fontSize: 25,
        fill: 0xffffff,
        fontWeight: "bold",
        align: "center",
        stroke: { color: 0x000000, width: 4 },
        dropShadow: {
          color: 0x000000,
          blur: 4,
          distance: 2,
        },
      },
    });
    this.labelText.anchor.set(0.5);
    this.addChild(this.labelText);
  }
}
