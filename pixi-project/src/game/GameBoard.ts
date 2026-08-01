import {
  Container,
  Graphics,
  Polygon,
  Sprite,
  Text,
  TextStyle,
  type Texture,
} from "pixi.js";
import gsap from "gsap";
import {
  BOARD_TEXTURE,
  DESIGN,
  THEME,
  designX,
  designY,
} from "../config/LayoutConfig";
import {
  formatCompact,
  type BetSpot,
  type Chip,
  type GameState,
} from "../state/GameState";
import type { LayoutContext } from "../core/LayoutManager";
import { syncTextResolution } from "../core/ResponsiveContainer";

/**
 * Betting zones expressed as fractions of the board artwork, so the hit areas
 * stay glued to the painted zones at any scale. Slight trapezoid shapes match
 * the perspective of the table graphic.
 */
const ZONES: Record<BetSpot, number[]> = {
  // x/y pairs, normalised 0..1 against the board texture.
  dragon: [0.058, 0.339, 0.343, 0.339, 0.341, 0.757, 0.041, 0.757],
  tie: [0.355, 0.339, 0.66, 0.339, 0.663, 0.757, 0.348, 0.757],
  tiger: [0.668, 0.339, 0.954, 0.339, 0.973, 0.757, 0.669, 0.757],
};

const ZONE_COLOR: Record<BetSpot, number> = {
  dragon: THEME.dragon,
  tie: THEME.tie,
  tiger: THEME.tiger,
};

export interface GameBoardTextures {
  board: Texture;
  dragon: Texture;
  tiger: Texture;
  chips: Record<string, Texture>;
}

/**
 * The play area, authored entirely in the 1920x1080 design space of the board
 * artwork. It is added to a `Viewport`, which scales it uniformly, so this
 * class contains no screen-size logic at all beyond keeping text crisp.
 */
export class GameBoard extends Container {
  private readonly zones = new Map<BetSpot, Graphics>();
  private readonly scoreLabels = new Map<BetSpot, Text>();
  private readonly betLabels = new Map<BetSpot, Text>();
  private readonly chipLayer = new Container();
  private readonly placedChips: Container[] = [];

  constructor(
    private readonly state: GameState,
    private readonly textures: GameBoardTextures,
  ) {
    super();

    // The sprite keeps its native size and is offset so its *visible* content
    // lines up with the design box; the transparent padding simply hangs off
    // the edges instead of shrinking the play area.
    const board = new Sprite(textures.board);
    board.width = BOARD_TEXTURE.width;
    board.height = BOARD_TEXTURE.height;
    board.position.set(designX(0), designY(0));
    this.addChild(board);

    this.buildEmblems();
    this.buildZones();
    this.addChild(this.chipLayer);
    this.buildLabels();

    state.subscribe(() => this.refreshLabels());
    this.refreshLabels();
  }

  /** Global-space point where a chip should fly to for a spot. */
  private randomPointIn(spot: BetSpot): { x: number; y: number } {
    const points = ZONES[spot];
    let minX = 1;
    let maxX = 0;
    let minY = 1;
    let maxY = 0;
    for (let i = 0; i < points.length; i += 2) {
      minX = Math.min(minX, points[i]);
      maxX = Math.max(maxX, points[i]);
      minY = Math.min(minY, points[i + 1]);
      maxY = Math.max(maxY, points[i + 1]);
    }
    // Keep the scatter in the lower half of the zone, clear of the score row.
    return {
      x: designX(minX + 0.12 + Math.random() * (maxX - minX - 0.24)),
      y: designY(minY + 0.45 + Math.random() * (maxY - minY - 0.6)),
    };
  }

  /** Animates a chip from a stage-space origin into the given betting zone. */
  placeChip(
    spot: BetSpot,
    chip: Chip,
    fromGlobal: { x: number; y: number },
  ): void {
    const texture = this.textures.chips[chip.texture];
    if (!texture) return;

    const token = new Container();
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    const size = DESIGN.width * 0.042;
    sprite.scale.set(size / Math.max(texture.width, texture.height));
    token.addChild(sprite);

    const label = new Text({
      text: chip.label,
      style: new TextStyle({
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: size * 0.3,
        fontWeight: "bold",
        fill: 0xffffff,
        stroke: { color: 0x000000, width: size * 0.05 },
      }),
    });
    label.anchor.set(0.5);
    token.addChild(label);

    const start = this.toLocal(fromGlobal);
    token.position.set(start.x, start.y);
    this.chipLayer.addChild(token);
    this.placedChips.push(token);

    const target = this.randomPointIn(spot);
    gsap.to(token, {
      x: target.x,
      y: target.y,
      duration: 0.45,
      ease: "power2.out",
    });
    gsap.fromTo(
      token.scale,
      { x: 1.5, y: 1.5 },
      { x: 1, y: 1, duration: 0.45, ease: "power2.out" },
    );
  }

  clearChips(): void {
    for (const token of this.placedChips) {
      gsap.killTweensOf(token);
      token.destroy({ children: true });
    }
    this.placedChips.length = 0;
  }

  /** Called by the scene on every layout pass to keep in-world text sharp. */
  syncResolution(ctx: LayoutContext, worldScale: number): void {
    for (const text of [
      ...this.scoreLabels.values(),
      ...this.betLabels.values(),
    ]) {
      syncTextResolution(text, ctx, worldScale);
    }
  }

  onZoneTap(
    handler: (spot: BetSpot, global: { x: number; y: number }) => void,
  ): void {
    for (const [spot, zone] of this.zones) {
      zone.on("pointertap", (event) =>
        handler(spot, { x: event.global.x, y: event.global.y }),
      );
    }
  }

  // ------------------------------------------------------------------ build

  private buildEmblems(): void {
    const dragon = new Sprite(this.textures.dragon);
    dragon.anchor.set(0.5);
    dragon.scale.set((DESIGN.height * 0.2) / dragon.texture.height);
    dragon.position.set(designX(0.2), designY(0.285));
    dragon.alpha = 0.9;

    const tiger = new Sprite(this.textures.tiger);
    tiger.anchor.set(0.5);
    tiger.scale.set((DESIGN.height * 0.175) / tiger.texture.height);
    tiger.position.set(designX(0.81), designY(0.285));
    tiger.alpha = 0.9;

    this.addChild(dragon, tiger);
  }

  private buildZones(): void {
    for (const spot of Object.keys(ZONES) as BetSpot[]) {
      const points = ZONES[spot].map((value, index) =>
        index % 2 === 0 ? designX(value) : designY(value),
      );

      const zone = new Graphics()
        .poly(points)
        .fill({ color: ZONE_COLOR[spot], alpha: 0.001 });
      // An explicit hit area keeps pointer testing cheap and exact; because the
      // polygon lives in design space it needs no updating when the world is
      // rescaled - Pixi maps pointer coordinates through the same transform.
      zone.hitArea = new Polygon(points);
      zone.eventMode = "static";
      zone.cursor = "pointer";
      zone.label = `probe:zone.${spot}`;
      zone.on("pointerover", () =>
        gsap.to(zone, { alpha: 0.35, duration: 0.15 }),
      );
      zone.on("pointerout", () => gsap.to(zone, { alpha: 1, duration: 0.15 }));

      this.zones.set(spot, zone);
      this.addChild(zone);
    }
  }

  private buildLabels(): void {
    const spots: BetSpot[] = ["dragon", "tie", "tiger"];
    for (const spot of spots) {
      const points = ZONES[spot];
      const centerX = designX((points[0] + points[2]) / 2);

      const score = new Text({
        text: "0 / 0",
        style: new TextStyle({
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: DESIGN.height * 0.052,
          fontWeight: "bold",
          fill: 0xffffff,
          stroke: { color: 0x000000, width: 6 },
        }),
      });
      score.anchor.set(0.5);
      score.position.set(centerX, designY(0.362));

      const bet = new Text({
        text: "",
        style: new TextStyle({
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: DESIGN.height * 0.056,
          fontWeight: "bold",
          fill: THEME.accent,
          stroke: { color: 0x000000, width: 7 },
        }),
      });
      bet.anchor.set(0.5);
      bet.position.set(centerX, designY(0.72));

      this.scoreLabels.set(spot, score);
      this.betLabels.set(spot, bet);
      this.addChild(score, bet);
    }

    this.setScore("dragon", 2, 7);
    this.setScore("tie", 5, 5);
    this.setScore("tiger", 9, 1);
  }

  setScore(spot: BetSpot, left: number, right: number): void {
    const label = this.scoreLabels.get(spot);
    if (label) label.text = `${left} / ${right}`;
  }

  private refreshLabels(): void {
    for (const [spot, label] of this.betLabels) {
      const amount = this.state.bets[spot];
      label.text = amount > 0 ? formatCompact(amount) : "";
    }
    if (this.state.totalBet === 0) this.clearChips();
  }
}
