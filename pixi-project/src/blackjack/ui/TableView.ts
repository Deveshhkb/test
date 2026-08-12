import { Container, Graphics, Sprite, Text } from "pixi.js";
import {
  BETTING,
  COLORS,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  SHOE_POSITION,
} from "../config/gameConfig";
import { ShoeSprite } from "../entities/ShoeSprite";
import { TextureFactory } from "../utils/textures";
import { formatCurrency } from "../utils/currency";
import { TEXT_STYLES } from "./textStyles";

/** Geometry of the padded rail: the bottom arc of a large circle above the table. */
const RAIL_CIRCLE = { x: DESIGN_WIDTH / 2, y: -1500, radius: 2340 };
const RAIL_THICKNESS = 96;
/** Overdraw beyond the design bounds, so letterbox bars are never bare. */
const BLEED = 900;

/** Where discarded cards are swept at the end of a round. */
export const DISCARD_POSITION = { x: 1470, y: 120 } as const;

/**
 * The static table: felt print, padded rail, shoe, discard tray, chip tray and
 * the limits sign. Purely decorative — it owns no game state.
 */
export class TableView extends Container {
  readonly shoe: ShoeSprite;

  constructor(private readonly textures: TextureFactory) {
    super();

    this.addChild(this.buildFeltPrint());
    this.addChild(this.buildRail());
    this.addChild(this.buildLimitSign());
    this.addChild(this.buildChipTray());
    this.addChild(this.buildDiscardTray());

    this.shoe = new ShoeSprite(this.textures);
    this.shoe.position.set(SHOE_POSITION.x, SHOE_POSITION.y);
    this.addChild(this.shoe);
  }

  /** Mirrors how much of the shoe is left. */
  setShoeFill(ratio: number): void {
    this.shoe.setFill(ratio);
  }

  private buildFeltPrint(): Container {
    const layer = new Container();
    const centreX = DESIGN_WIDTH / 2;

    const title = new Text({ text: "BLACKJACK", style: TEXT_STYLES.feltTitle });
    title.anchor.set(0.5);
    title.position.set(centreX, 160);
    title.alpha = 0.42;

    const payLine = new Text({
      text: "BLACKJACK PAYS 3 TO 2",
      style: TEXT_STYLES.feltHeading,
    });
    payLine.anchor.set(0.5);
    payLine.position.set(centreX, 243);
    payLine.alpha = 0.45;

    const ruleLine = new Text({
      text: "Dealer must stand on 17 and must draw to 16",
      style: TEXT_STYLES.feltCaption,
    });
    ruleLine.anchor.set(0.5);
    ruleLine.position.set(centreX, 278);
    ruleLine.alpha = 0.4;

    layer.addChild(
      this.buildInsuranceBanner(centreX, 350),
      title,
      payLine,
      ruleLine,
    );
    return layer;
  }

  /** The ribbon carrying the insurance line, as printed on a real table. */
  private buildInsuranceBanner(centreX: number, y: number): Container {
    const banner = new Container();
    const width = 760;
    const height = 74;
    const half = width / 2;
    const tail = 70;

    const ribbon = new Graphics()
      .moveTo(-half, -height / 2)
      .lineTo(half, -height / 2)
      .lineTo(half + tail, 0)
      .lineTo(half, height / 2)
      .lineTo(-half, height / 2)
      .lineTo(-half - tail, 0)
      .closePath()
      .fill({ color: 0xbcdcf5, alpha: 0.14 })
      .stroke({ width: 2, color: 0xd6ebfb, alpha: 0.35 });

    const label = new Text({
      text: "INSURANCE PAYS 2 TO 1",
      style: TEXT_STYLES.feltBanner,
    });
    label.anchor.set(0.5);
    label.alpha = 0.55;

    banner.addChild(ribbon, label);
    banner.position.set(centreX, y);
    return banner;
  }

  private buildRail(): Container {
    const layer = new Container();
    const outline = this.railPoints(0);
    const inner = this.railPoints(RAIL_THICKNESS);

    const padded = new Graphics();
    traceRegion(padded, outline);
    padded.fill({ color: COLORS.railRed });

    const flat = new Graphics();
    traceRegion(flat, inner);
    flat.fill({ color: COLORS.railRedDark });

    const highlight = new Graphics();
    outline.forEach((point, index) => {
      if (index === 0) highlight.moveTo(point.x, point.y);
      else highlight.lineTo(point.x, point.y);
    });
    highlight.stroke({ width: 7, color: COLORS.railRedLight, alpha: 0.5 });

    const trim = new Graphics();
    this.railPoints(-9).forEach((point, index) => {
      if (index === 0) trim.moveTo(point.x, point.y);
      else trim.lineTo(point.x, point.y);
    });
    trim.stroke({ width: 3, color: COLORS.gold, alpha: 0.55 });

    layer.addChild(padded, flat, highlight, trim);
    return layer;
  }

  /** Samples the rail arc, offset downward by `offset` pixels. */
  private railPoints(offset: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const step = 20;
    for (let x = -BLEED; x <= DESIGN_WIDTH + BLEED; x += step) {
      const dx = x - RAIL_CIRCLE.x;
      const inside = RAIL_CIRCLE.radius * RAIL_CIRCLE.radius - dx * dx;
      const y = RAIL_CIRCLE.y + (inside > 0 ? Math.sqrt(inside) : 0) + offset;
      points.push({ x, y });
    }
    return points;
  }

  private buildLimitSign(): Container {
    const sign = new Container();
    const width = 210;
    const height = 84;

    sign.addChild(
      new Graphics()
        .roundRect(-width / 2, -height / 2, width, height, 8)
        .fill({ color: 0x061722, alpha: 0.85 })
        .roundRect(-width / 2, -height / 2, width, height, 8)
        .stroke({ width: 2, color: 0x7fa8c4, alpha: 0.7 })
        .roundRect(-width / 2 + 4, height / 2 - 6, width - 8, 10, 4)
        .fill({ color: 0x9fc4dd, alpha: 0.25 }),
    );

    const min = new Text({
      text: `MIN:  ${formatCurrency(BETTING.minBet)}`,
      style: TEXT_STYLES.limitSign,
    });
    min.anchor.set(0, 0.5);
    min.position.set(-width / 2 + 16, -16);

    const max = new Text({
      text: `MAX:  ${formatCurrency(BETTING.maxBet)}`,
      style: TEXT_STYLES.limitSign,
    });
    max.anchor.set(0, 0.5);
    max.position.set(-width / 2 + 16, 14);

    sign.addChild(min, max);
    sign.position.set(500, 78);
    return sign;
  }

  /** Decorative dealer chip tray along the top edge. */
  private buildChipTray(): Container {
    const tray = new Container();
    const width = 560;
    const height = 96;

    tray.addChild(
      new Graphics()
        .roundRect(-width / 2, -height / 2, width, height, 12)
        .fill({ color: 0x4a3212 })
        .roundRect(-width / 2, -height / 2, width, height, 12)
        .stroke({ width: 4, color: COLORS.goldDark })
        .roundRect(
          -width / 2 + 10,
          -height / 2 + 10,
          width - 20,
          height - 20,
          8,
        )
        .fill({ color: 0x2a1c08, alpha: 0.85 }),
    );

    const values = [...BETTING.chipValues, ...BETTING.chipValues].slice(0, 10);
    values.forEach((value, index) => {
      const chip = new Sprite(this.textures.chip(value));
      chip.anchor.set(0.5);
      chip.setSize(52, 52);
      chip.position.set(-width / 2 + 42 + index * 52, 0);
      tray.addChild(chip);
    });

    tray.position.set(DESIGN_WIDTH / 2, 56);
    return tray;
  }

  private buildDiscardTray(): Container {
    const tray = new Container();
    tray.addChild(
      new Graphics()
        .roundRect(-92, -118, 184, 236, 14)
        .fill({ color: 0xdfe9f0, alpha: 0.18 })
        .roundRect(-92, -118, 184, 236, 14)
        .stroke({ width: 2, color: 0xffffff, alpha: 0.35 })
        .roundRect(-78, 70, 156, 34, 8)
        .fill({ color: 0x0b1c2b, alpha: 0.35 }),
    );
    tray.position.set(DISCARD_POSITION.x, DISCARD_POSITION.y);
    tray.rotation = 0.08;
    return tray;
  }
}

/** Closes a sampled arc into a filled region reaching past the bottom edge. */
function traceRegion(
  graphics: Graphics,
  points: { x: number; y: number }[],
): void {
  points.forEach((point, index) => {
    if (index === 0) graphics.moveTo(point.x, point.y);
    else graphics.lineTo(point.x, point.y);
  });
  graphics.lineTo(DESIGN_WIDTH + BLEED, DESIGN_HEIGHT + BLEED);
  graphics.lineTo(-BLEED, DESIGN_HEIGHT + BLEED);
  graphics.closePath();
}
