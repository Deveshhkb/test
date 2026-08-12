import { Circle, Container, Graphics, Sprite, Text } from "pixi.js";
import gsap from "gsap";
import { Point } from "../animation/CardAnimation";
import { BETTING, COLORS } from "../config/gameConfig";
import { TextureFactory } from "../utils/textures";
import { formatChipLabel } from "../utils/currency";
import { CasinoButton } from "./components/CasinoButton";
import { TEXT_STYLES } from "./textStyles";

const RAIL_Y = 824;
const CURRENT_CHIP_SIZE = 112;
const FAN_CHIP_SIZE = 74;

export interface ChipRailCallbacks {
  onSelect: (value: number) => void;
  onStep: (direction: 1 | -1) => void;
}

/**
 * Denomination selector: minus / current chip / plus, matching the reference
 * layout. Tapping the current chip fans out every denomination for direct
 * selection, which keeps the rail compact on small screens.
 */
export class ChipRail extends Container {
  private readonly currentChip = new Sprite();
  private readonly chipHolder = new Container();
  private readonly currentGlow = new Graphics();
  private readonly fan = new Container();
  private readonly fanChips = new Map<number, Container>();
  private readonly minusButton: CasinoButton;
  private readonly plusButton: CasinoButton;
  private selectedValue = BETTING.chipValues[0];
  private fanOpen = false;
  private enabled = true;

  constructor(
    private readonly textures: TextureFactory,
    private readonly callbacks: ChipRailCallbacks,
  ) {
    super();

    this.minusButton = new CasinoButton({
      width: 84,
      shape: "circle",
      variant: "dark",
      icon: (g) =>
        g.roundRect(-20, -4, 40, 8, 4).fill({ color: COLORS.goldLight }),
      onTap: () => this.callbacks.onStep(-1),
    });
    this.minusButton.position.set(96, RAIL_Y);

    this.plusButton = new CasinoButton({
      width: 84,
      shape: "circle",
      variant: "dark",
      icon: (g) =>
        g
          .roundRect(-20, -4, 40, 8, 4)
          .fill({ color: COLORS.goldLight })
          .roundRect(-4, -20, 8, 40, 4)
          .fill({ color: COLORS.goldLight }),
      onTap: () => this.callbacks.onStep(1),
    });
    this.plusButton.position.set(410, RAIL_Y);

    this.currentChip.anchor.set(0.5);
    this.currentChip.setSize(CURRENT_CHIP_SIZE, CURRENT_CHIP_SIZE);

    this.chipHolder.addChild(this.currentChip);
    this.chipHolder.position.set(253, RAIL_Y);
    this.chipHolder.eventMode = "static";
    this.chipHolder.cursor = "pointer";
    this.chipHolder.hitArea = new Circle(0, 0, CURRENT_CHIP_SIZE / 2);
    this.chipHolder.on("pointertap", () => this.toggleFan());

    this.currentGlow
      .circle(0, 0, CURRENT_CHIP_SIZE / 2 + 9)
      .stroke({ width: 4, color: COLORS.goldLight, alpha: 0.85 });
    this.currentGlow.position.copyFrom(this.chipHolder.position);

    this.buildFan();
    this.addChild(
      this.fan,
      this.currentGlow,
      this.chipHolder,
      this.minusButton,
      this.plusButton,
    );
    this.setSelected(this.selectedValue);
  }

  /** Where chips start their flight to a betting box. */
  get chipOrigin(): Point {
    return { x: this.chipHolder.x, y: this.chipHolder.y };
  }

  get selected(): number {
    return this.selectedValue;
  }

  setSelected(value: number): void {
    this.selectedValue = value;
    this.currentChip.texture = this.textures.chip(value);
    this.currentChip.setSize(CURRENT_CHIP_SIZE, CURRENT_CHIP_SIZE);

    gsap.fromTo(
      this.chipHolder.scale,
      { x: 0.82, y: 0.82 },
      { x: 1, y: 1, duration: 0.26, ease: "back.out(2.2)", overwrite: "auto" },
    );

    for (const [chipValue, chip] of this.fanChips) {
      const isSelected = chipValue === value;
      gsap.to(chip.scale, {
        x: isSelected ? 1.12 : 1,
        y: isSelected ? 1.12 : 1,
        duration: 0.18,
        overwrite: "auto",
      });
      chip.alpha = isSelected ? 1 : 0.82;
    }

    const index = BETTING.chipValues.indexOf(value);
    this.minusButton.setEnabled(this.enabled && index > 0);
    this.plusButton.setEnabled(
      this.enabled && index < BETTING.chipValues.length - 1,
    );
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.chipHolder.eventMode = enabled ? "static" : "none";
    this.chipHolder.cursor = enabled ? "pointer" : "default";
    gsap.to(this, {
      alpha: enabled ? 1 : 0.5,
      duration: 0.2,
      overwrite: "auto",
    });
    if (!enabled && this.fanOpen) this.toggleFan();
    this.setSelected(this.selectedValue);
  }

  /** Small kick used when a chip is placed, for tactile feedback. */
  punch(): void {
    gsap.fromTo(
      this.chipHolder.scale,
      { x: 0.88, y: 0.88 },
      { x: 1, y: 1, duration: 0.22, ease: "back.out(2)", overwrite: "auto" },
    );
  }

  private buildFan(): void {
    const values = BETTING.chipValues;
    const spacing = 88;
    const startX = 253 - ((values.length - 1) * spacing) / 2;

    values.forEach((value, index) => {
      const chip = new Container();
      const sprite = new Sprite(this.textures.chip(value));
      sprite.anchor.set(0.5);
      sprite.setSize(FAN_CHIP_SIZE, FAN_CHIP_SIZE);

      const label = new Text({
        text: formatChipLabel(value),
        style: TEXT_STYLES.buttonLabelSmall,
      });
      label.anchor.set(0.5);
      label.y = FAN_CHIP_SIZE / 2 + 14;
      label.alpha = 0.75;

      chip.addChild(sprite, label);
      chip.position.set(startX + index * spacing, RAIL_Y);
      chip.eventMode = "static";
      chip.cursor = "pointer";
      chip.hitArea = new Circle(0, 0, FAN_CHIP_SIZE / 2 + 4);
      chip.on("pointertap", () => {
        this.callbacks.onSelect(value);
        this.toggleFan();
      });

      this.fanChips.set(value, chip);
      this.fan.addChild(chip);
    });

    this.fan.visible = false;
    this.fan.alpha = 0;
  }

  private toggleFan(): void {
    this.fanOpen = !this.fanOpen;
    gsap.killTweensOf(this.fan);

    if (this.fanOpen) {
      this.fan.visible = true;
      gsap.fromTo(
        this.fan,
        { alpha: 0, y: 30 },
        { alpha: 1, y: -108, duration: 0.24, ease: "back.out(1.6)" },
      );
      return;
    }

    gsap.to(this.fan, {
      alpha: 0,
      y: 20,
      duration: 0.18,
      ease: "power1.in",
      onComplete: () => {
        this.fan.visible = false;
      },
    });
  }
}
