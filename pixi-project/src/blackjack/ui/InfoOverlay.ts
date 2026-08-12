import { Container, Graphics, Rectangle, Text } from "pixi.js";
import gsap from "gsap";
import { COLORS, DESIGN_HEIGHT, DESIGN_WIDTH } from "../config/gameConfig";
import { CasinoButton } from "./components/CasinoButton";
import { TEXT_STYLES } from "./textStyles";

export interface OverlayContent {
  title: string;
  body: string;
}

/**
 * Modal panel used for both the rules ("info") and the basic-strategy hints.
 * A single component serves both, so opening either one cannot leave the other
 * on screen.
 */
export class InfoOverlay extends Container {
  private readonly panel = new Container();
  private readonly titleText: Text;
  private readonly bodyText: Text;
  private open = false;

  constructor() {
    super();

    const scrim = new Graphics()
      .rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT)
      .fill({ color: 0x000000, alpha: 0.68 });
    scrim.eventMode = "static";
    scrim.on("pointertap", () => this.hide());

    const width = 760;
    const height = 600;
    this.panel.addChild(
      new Graphics()
        .roundRect(-width / 2, -height / 2, width, height, 18)
        .fill({ color: 0x0b1723, alpha: 0.98 })
        .roundRect(-width / 2, -height / 2, width, height, 18)
        .stroke({ width: 3, color: COLORS.gold, alpha: 0.8 }),
    );

    this.titleText = new Text({ text: "", style: TEXT_STYLES.overlayTitle });
    this.titleText.anchor.set(0.5, 0);
    this.titleText.y = -height / 2 + 32;

    this.bodyText = new Text({ text: "", style: TEXT_STYLES.overlayBody });
    this.bodyText.anchor.set(0, 0);
    this.bodyText.position.set(-width / 2 + 48, -height / 2 + 92);

    const closeButton = new CasinoButton({
      width: 170,
      height: 54,
      shape: "pill",
      variant: "gold",
      label: "CLOSE",
      onTap: () => this.hide(),
    });
    closeButton.position.set(0, height / 2 - 52);

    this.panel.addChild(this.titleText, this.bodyText, closeButton);
    this.panel.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);

    this.addChild(scrim, this.panel);
    this.eventMode = "static";
    this.hitArea = new Rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    this.visible = false;
    this.alpha = 0;
  }

  get isOpen(): boolean {
    return this.open;
  }

  show(content: OverlayContent): void {
    this.titleText.text = content.title;
    this.bodyText.text = content.body;
    this.open = true;
    this.visible = true;
    this.eventMode = "static";

    gsap.killTweensOf(this);
    gsap.killTweensOf(this.panel.scale);
    gsap.to(this, { alpha: 1, duration: 0.2, ease: "power1.out" });
    gsap.fromTo(
      this.panel.scale,
      { x: 0.9, y: 0.9 },
      { x: 1, y: 1, duration: 0.3, ease: "back.out(1.6)" },
    );
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.eventMode = "none";
    gsap.killTweensOf(this);
    gsap.to(this, {
      alpha: 0,
      duration: 0.18,
      ease: "power1.in",
      onComplete: () => {
        this.visible = false;
      },
    });
  }

  toggle(content: OverlayContent): void {
    if (this.open) this.hide();
    else this.show(content);
  }
}
