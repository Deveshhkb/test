import {
  Circle,
  Container,
  Graphics,
  Rectangle,
  Text,
  TextStyle,
} from "pixi.js";
import gsap from "gsap";
import { COLORS, TIMING } from "../../config/gameConfig";
import { TEXT_STYLES } from "../textStyles";

export type ButtonShape = "pill" | "circle";
export type ButtonVariant = "gold" | "green" | "red" | "dark";

export interface CasinoButtonOptions {
  width: number;
  height?: number;
  shape?: ButtonShape;
  label?: string;
  /** Small caption rendered under the button, as on the reference table. */
  caption?: string;
  variant?: ButtonVariant;
  labelStyle?: TextStyle;
  /** Custom vector artwork drawn centred inside the button. */
  icon?: (graphics: Graphics) => void;
  onTap: () => void;
}

interface VariantPalette {
  top: number;
  bottom: number;
  rim: number;
  rimLight: number;
}

const VARIANTS: Record<ButtonVariant, VariantPalette> = {
  gold: {
    top: 0x2a4258,
    bottom: 0x10202e,
    rim: COLORS.gold,
    rimLight: COLORS.goldLight,
  },
  green: { top: 0x1f7d4c, bottom: 0x0d4429, rim: 0x53d78d, rimLight: 0xa9f0c6 },
  red: { top: 0xa62b2b, bottom: 0x5d1417, rim: 0xe8767a, rimLight: 0xf6b8ba },
  dark: { top: 0x1b2734, bottom: 0x0a0f16, rim: 0x4a6076, rimLight: 0x8fa8bd },
};

/**
 * Casino-style control: a metal-rimmed panel or medallion with hover, press
 * and disabled states. Every interactive control in the game is one of these,
 * so pointer/touch behaviour is implemented exactly once.
 */
export class CasinoButton extends Container {
  private readonly background = new Graphics();
  private readonly glow = new Graphics();
  private readonly body = new Container();
  private readonly labelText?: Text;
  private readonly captionText?: Text;
  private readonly options: Required<
    Pick<CasinoButtonOptions, "width" | "height" | "shape" | "variant">
  > &
    CasinoButtonOptions;
  private enabled = true;
  private pressed = false;

  constructor(options: CasinoButtonOptions) {
    super();

    this.options = {
      height: options.height ?? options.width,
      shape: options.shape ?? "pill",
      variant: options.variant ?? "gold",
      ...options,
    };

    this.body.addChild(this.glow, this.background);
    this.addChild(this.body);
    this.draw();

    if (this.options.icon) {
      const icon = new Graphics();
      this.options.icon(icon);
      this.body.addChild(icon);
    }

    if (this.options.label) {
      this.labelText = new Text({
        text: this.options.label,
        style: this.options.labelStyle ?? TEXT_STYLES.buttonLabel,
      });
      this.labelText.anchor.set(0.5);
      this.body.addChild(this.labelText);
    }

    if (this.options.caption) {
      this.captionText = new Text({
        text: this.options.caption,
        style: TEXT_STYLES.buttonLabelSmall,
      });
      this.captionText.anchor.set(0.5);
      this.captionText.y = this.options.height / 2 + 22;
      this.addChild(this.captionText);
    }

    this.eventMode = "static";
    this.cursor = "pointer";
    this.hitArea =
      this.options.shape === "circle"
        ? new Circle(0, 0, this.options.width / 2)
        : new Rectangle(
            -this.options.width / 2,
            -this.options.height / 2,
            this.options.width,
            this.options.height,
          );
    this.attachEvents();
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  setLabel(label: string): void {
    if (this.labelText) this.labelText.text = label;
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.eventMode = enabled ? "static" : "none";
    this.cursor = enabled ? "pointer" : "default";
    gsap.to(this, {
      alpha: enabled ? 1 : 0.38,
      duration: 0.18,
      ease: "power1.out",
      overwrite: "auto",
    });
    if (!enabled) this.setPressedVisual(false);
  }

  /** Fades the control in or out without disturbing layout. */
  setShown(shown: boolean, animated = true): void {
    if (!animated) {
      this.visible = shown;
      this.alpha = shown ? (this.enabled ? 1 : 0.38) : 0;
      return;
    }
    gsap.killTweensOf(this);
    if (shown) this.visible = true;
    gsap.to(this, {
      alpha: shown ? (this.enabled ? 1 : 0.38) : 0,
      duration: 0.2,
      ease: "power1.out",
      onComplete: () => {
        this.visible = shown;
      },
    });
  }

  /** Draws attention to the primary action without a distracting loop. */
  pulse(): void {
    gsap.fromTo(
      this.body.scale,
      { x: 1, y: 1 },
      {
        x: 1.06,
        y: 1.06,
        duration: 0.22,
        yoyo: true,
        repeat: 1,
        ease: "power1.inOut",
      },
    );
  }

  destroy(options?: Parameters<Container["destroy"]>[0]): void {
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.body.scale);
    super.destroy(options);
  }

  private draw(): void {
    const { width, height, shape, variant } = this.options;
    const palette = VARIANTS[variant];
    const halfW = width / 2;
    const halfH = height / 2;

    this.background.clear();
    this.glow.clear();

    if (shape === "circle") {
      const radius = halfW;
      this.glow
        .circle(0, 0, radius + 8)
        .fill({ color: palette.rim, alpha: 0.16 });
      this.background
        .circle(0, 0, radius)
        .fill({ color: palette.bottom })
        .circle(0, -radius * 0.06, radius - 5)
        .fill({ color: palette.top, alpha: 0.85 })
        .circle(0, 0, radius)
        .stroke({ width: 4, color: palette.rim })
        .circle(0, 0, radius - 6)
        .stroke({ width: 1.5, color: palette.rimLight, alpha: 0.6 })
        .moveTo(-radius * 0.7, -radius * 0.45)
        .quadraticCurveTo(0, -radius * 0.95, radius * 0.7, -radius * 0.45)
        .quadraticCurveTo(0, -radius * 0.5, -radius * 0.7, -radius * 0.45)
        .fill({ color: 0xffffff, alpha: 0.12 });
      return;
    }

    const radius = Math.min(halfH, 18);
    this.glow
      .roundRect(-halfW - 5, -halfH - 5, width + 10, height + 10, radius + 5)
      .fill({ color: palette.rim, alpha: 0.14 });
    this.background
      .roundRect(-halfW, -halfH, width, height, radius)
      .fill({ color: palette.bottom })
      .roundRect(-halfW + 3, -halfH + 3, width - 6, height * 0.55, radius - 2)
      .fill({ color: palette.top, alpha: 0.9 })
      .roundRect(-halfW, -halfH, width, height, radius)
      .stroke({ width: 3, color: palette.rim })
      .roundRect(-halfW + 4, -halfH + 4, width - 8, height - 8, radius - 3)
      .stroke({ width: 1, color: palette.rimLight, alpha: 0.45 });
  }

  private attachEvents(): void {
    this.on("pointerover", () => {
      if (!this.enabled || this.pressed) return;
      gsap.to(this.body.scale, {
        x: 1.04,
        y: 1.04,
        duration: 0.16,
        ease: "power2.out",
      });
      gsap.to(this.glow, { alpha: 1.6, duration: 0.16, overwrite: "auto" });
    });

    this.on("pointerout", () => {
      this.setPressedVisual(false);
      gsap.to(this.glow, { alpha: 1, duration: 0.16, overwrite: "auto" });
    });

    this.on("pointerdown", () => {
      if (!this.enabled) return;
      this.setPressedVisual(true);
    });

    this.on("pointerup", () => this.setPressedVisual(false));
    this.on("pointerupoutside", () => this.setPressedVisual(false));

    this.on("pointertap", () => {
      if (!this.enabled) return;
      this.options.onTap();
    });
  }

  private setPressedVisual(pressed: boolean): void {
    this.pressed = pressed;
    gsap.to(this.body.scale, {
      x: pressed ? 0.94 : 1,
      y: pressed ? 0.94 : 1,
      duration: TIMING.buttonPress,
      ease: "power2.out",
      overwrite: "auto",
    });
  }
}
