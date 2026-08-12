import { Container, Graphics, Text } from "pixi.js";
import gsap from "gsap";
import { COLORS, DESIGN_WIDTH } from "../config/gameConfig";
import { TEXT_STYLES } from "./textStyles";

/** Transient notice for rejected actions ("bet exceeds the table maximum"). */
export class MessageToast extends Container {
  private readonly background = new Graphics();
  private readonly labelText: Text;
  private hideTween: gsap.core.Tween | null = null;

  constructor(y = 448) {
    super();
    this.labelText = new Text({ text: "", style: TEXT_STYLES.buttonLabel });
    this.labelText.anchor.set(0.5);
    this.addChild(this.background, this.labelText);
    this.position.set(DESIGN_WIDTH / 2, y);
    this.visible = false;
    this.alpha = 0;
    this.eventMode = "none";
  }

  show(message: string, duration = 1.6): void {
    this.labelText.text = message;
    const width = this.labelText.width + 60;
    const height = 54;

    this.background
      .clear()
      .roundRect(-width / 2, -height / 2, width, height, height / 2)
      .fill({ color: 0x07121c, alpha: 0.9 })
      .roundRect(-width / 2, -height / 2, width, height, height / 2)
      .stroke({ width: 2, color: COLORS.gold, alpha: 0.7 });

    this.hideTween?.kill();
    gsap.killTweensOf(this);
    this.visible = true;
    gsap.fromTo(
      this,
      { alpha: 0, y: this.y + 12 },
      { alpha: 1, y: this.y, duration: 0.18, ease: "power2.out" },
    );

    this.hideTween = gsap.to(this, {
      alpha: 0,
      duration: 0.3,
      delay: duration,
      ease: "power1.in",
      onComplete: () => {
        this.visible = false;
      },
    });
  }
}
