import { Texture } from "pixi.js";
import { CARD_LAYOUT, COLORS } from "../config/gameConfig";
import { Card, Rank, SUIT_SYMBOLS, isRedSuit } from "../game/Card";
import { formatChipLabel } from "../utils/currency";

/** Textures are drawn at twice their layout size so they stay crisp when scaled up. */
const TEXTURE_SCALE = 2;

const CARD_FONT = "Georgia, 'Times New Roman', serif";
const CHIP_FONT = "Arial, Helvetica, sans-serif";

type Draw = (ctx: CanvasRenderingContext2D) => void;

/**
 * Builds every visual asset at runtime on 2D canvases: card faces, card backs,
 * chips, shadows and the felt.
 *
 * Drawing on canvases rather than composing Pixi display objects keeps texture
 * generation independent of the renderer's text cache, costs no GPU
 * round-trips at start-up, and means the game ships without third-party
 * artwork. Every texture is generated once and cached by key.
 */
export class TextureFactory {
  private readonly cache = new Map<string, Texture>();

  cardFace(card: Card): Texture {
    return this.cached(`face:${card.rank}:${card.suit}`, () =>
      this.canvasTexture(CARD_LAYOUT.width, CARD_LAYOUT.height, (ctx) =>
        drawCardFace(ctx, card),
      ),
    );
  }

  cardBack(): Texture {
    return this.cached("back", () =>
      this.canvasTexture(CARD_LAYOUT.width, CARD_LAYOUT.height, drawCardBack),
    );
  }

  chip(value: number): Texture {
    return this.cached(`chip:${value}`, () =>
      this.canvasTexture(128, 128, (ctx) => drawChip(ctx, value)),
    );
  }

  /** Soft elliptical shadow reused under cards and chips. */
  softShadow(width: number, height: number): Texture {
    return this.cached(`shadow:${width}x${height}`, () =>
      this.canvasTexture(width, height, (ctx) => {
        const gradient = ctx.createRadialGradient(
          width / 2,
          height / 2,
          0,
          width / 2,
          height / 2,
          Math.max(width, height) / 2,
        );
        gradient.addColorStop(0, "rgba(0,0,0,0.55)");
        gradient.addColorStop(0.6, "rgba(0,0,0,0.22)");
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }),
    );
  }

  /** Radial felt with a subtle woven noise. */
  felt(width: number, height: number): Texture {
    return this.cached(`felt:${width}x${height}`, () =>
      this.canvasTexture(
        width,
        height,
        (ctx) => {
          const gradient = ctx.createRadialGradient(
            width * 0.5,
            height * 0.32,
            height * 0.05,
            width * 0.5,
            height * 0.42,
            width * 0.78,
          );
          gradient.addColorStop(0, hex(COLORS.feltLight));
          gradient.addColorStop(0.45, hex(COLORS.feltMid));
          gradient.addColorStop(1, hex(COLORS.feltDark));
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);

          ctx.globalAlpha = 0.05;
          for (let i = 0; i < 2600; i += 1) {
            ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
            ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
          }
          ctx.globalAlpha = 1;
        },
        1,
      ),
    );
  }

  destroy(): void {
    for (const texture of this.cache.values()) texture.destroy(true);
    this.cache.clear();
  }

  private cached(key: string, build: () => Texture): Texture {
    const existing = this.cache.get(key);
    if (existing) return existing;
    const texture = build();
    this.cache.set(key, texture);
    return texture;
  }

  private canvasTexture(
    width: number,
    height: number,
    draw: Draw,
    scale = TEXTURE_SCALE,
  ): Texture {
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(scale, scale);
      draw(ctx);
    }
    return Texture.from(canvas);
  }
}

// ------------------------------------------------------------------- cards

/**
 * Pip layouts for the number cards, as fractions of the card face. Pips in the
 * lower half are drawn upside down, the way real cards are printed.
 */
const PIP_LAYOUTS: Partial<Record<Rank, [number, number, boolean][]>> = {
  "2": [
    [0.5, 0.22, false],
    [0.5, 0.78, true],
  ],
  "3": [
    [0.5, 0.22, false],
    [0.5, 0.5, false],
    [0.5, 0.78, true],
  ],
  "4": [
    [0.3, 0.22, false],
    [0.7, 0.22, false],
    [0.3, 0.78, true],
    [0.7, 0.78, true],
  ],
  "5": [
    [0.3, 0.22, false],
    [0.7, 0.22, false],
    [0.5, 0.5, false],
    [0.3, 0.78, true],
    [0.7, 0.78, true],
  ],
  "6": [
    [0.3, 0.22, false],
    [0.7, 0.22, false],
    [0.3, 0.5, false],
    [0.7, 0.5, false],
    [0.3, 0.78, true],
    [0.7, 0.78, true],
  ],
  "7": [
    [0.3, 0.22, false],
    [0.7, 0.22, false],
    [0.5, 0.36, false],
    [0.3, 0.5, false],
    [0.7, 0.5, false],
    [0.3, 0.78, true],
    [0.7, 0.78, true],
  ],
  "8": [
    [0.3, 0.22, false],
    [0.7, 0.22, false],
    [0.5, 0.36, false],
    [0.3, 0.5, false],
    [0.7, 0.5, false],
    [0.5, 0.64, true],
    [0.3, 0.78, true],
    [0.7, 0.78, true],
  ],
  "9": [
    [0.3, 0.2, false],
    [0.7, 0.2, false],
    [0.3, 0.4, false],
    [0.7, 0.4, false],
    [0.5, 0.5, false],
    [0.3, 0.6, true],
    [0.7, 0.6, true],
    [0.3, 0.8, true],
    [0.7, 0.8, true],
  ],
  "10": [
    [0.3, 0.2, false],
    [0.7, 0.2, false],
    [0.5, 0.3, false],
    [0.3, 0.4, false],
    [0.7, 0.4, false],
    [0.3, 0.6, true],
    [0.7, 0.6, true],
    [0.5, 0.7, true],
    [0.3, 0.8, true],
    [0.7, 0.8, true],
  ],
};

function drawCardFace(ctx: CanvasRenderingContext2D, card: Card): void {
  const { width, height } = CARD_LAYOUT;
  const ink = isRedSuit(card.suit)
    ? hex(COLORS.cardRed)
    : hex(COLORS.cardBlack);
  const symbol = SUIT_SYMBOLS[card.suit];

  roundRectPath(ctx, 0, 0, width, height, 12);
  ctx.fillStyle = hex(COLORS.cardWhite);
  ctx.fill();
  roundRectPath(ctx, 2, 2, width - 4, height - 4, 10);
  ctx.strokeStyle = "#d8d3c4";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  drawCornerIndex(ctx, card.rank, symbol, ink, false);
  drawCornerIndex(ctx, card.rank, symbol, ink, true);

  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (card.rank === "A") {
    ctx.font = `92px ${CARD_FONT}`;
    ctx.fillText(symbol, width / 2, height / 2);
    return;
  }

  const layout = PIP_LAYOUTS[card.rank];
  if (layout) {
    ctx.font = `34px ${CARD_FONT}`;
    for (const [x, y, flipped] of layout) {
      drawPip(ctx, symbol, x * width, y * height, flipped);
    }
    return;
  }

  drawCourtCard(ctx, card.rank, symbol, ink);
}

function drawCornerIndex(
  ctx: CanvasRenderingContext2D,
  rank: Rank,
  symbol: string,
  ink: string,
  flipped: boolean,
): void {
  const { width, height } = CARD_LAYOUT;
  ctx.save();
  if (flipped) {
    ctx.translate(width - 22, height - 16);
    ctx.rotate(Math.PI);
  } else {
    ctx.translate(22, 16);
  }
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `bold ${rank === "10" ? 28 : 32}px ${CARD_FONT}`;
  ctx.fillText(rank, 0, 0);
  ctx.font = `26px ${CARD_FONT}`;
  ctx.fillText(symbol, 0, 32);
  ctx.restore();
}

function drawPip(
  ctx: CanvasRenderingContext2D,
  symbol: string,
  x: number,
  y: number,
  flipped: boolean,
): void {
  ctx.save();
  ctx.translate(x, y);
  if (flipped) ctx.rotate(Math.PI);
  ctx.fillText(symbol, 0, 0);
  ctx.restore();
}

function drawCourtCard(
  ctx: CanvasRenderingContext2D,
  rank: Rank,
  symbol: string,
  ink: string,
): void {
  const { width, height } = CARD_LAYOUT;
  const frameX = width * 0.2;
  const frameY = height * 0.22;
  const frameW = width * 0.6;
  const frameH = height * 0.56;

  roundRectPath(ctx, frameX, frameY, frameW, frameH, 8);
  ctx.fillStyle = withAlpha(ink, 0.08);
  ctx.fill();
  ctx.strokeStyle = withAlpha(ink, 0.55);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = ink;
  ctx.font = `bold 60px ${CARD_FONT}`;
  ctx.fillText(rank, width / 2, height / 2 - 12);
  ctx.font = `30px ${CARD_FONT}`;
  ctx.fillText(symbol, width / 2, height / 2 + 40);
}

function drawCardBack(ctx: CanvasRenderingContext2D): void {
  const { width, height } = CARD_LAYOUT;

  roundRectPath(ctx, 0, 0, width, height, 12);
  ctx.fillStyle = hex(COLORS.cardWhite);
  ctx.fill();

  roundRectPath(ctx, 6, 6, width - 12, height - 12, 9);
  ctx.fillStyle = "#7c1420";
  ctx.fill();

  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgba(243, 217, 139, 0.2)";
  ctx.lineWidth = 1;
  for (let x = -height; x < width + height; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + height, height);
    ctx.moveTo(x, height);
    ctx.lineTo(x + height, 0);
    ctx.stroke();
  }
  ctx.restore();

  roundRectPath(ctx, 6, 6, width - 12, height - 12, 9);
  ctx.strokeStyle = hex(COLORS.gold);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 40, 0, Math.PI * 2);
  ctx.fillStyle = "#5d0d17";
  ctx.fill();
  ctx.strokeStyle = hex(COLORS.gold);
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 31, 0, Math.PI * 2);
  ctx.strokeStyle = withAlpha(hex(COLORS.goldLight), 0.7);
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = hex(COLORS.goldLight);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold 32px ${CARD_FONT}`;
  ctx.fillText("21", width / 2, height / 2 + 1);
}

// ------------------------------------------------------------------- chips

interface ChipPalette {
  base: string;
  edge: string;
  face: string;
}

/** Denomination colours follow the usual casino convention. */
function chipPalette(value: number): ChipPalette {
  const presets: Record<number, ChipPalette> = {
    1: { base: "#d9a43a", edge: "#f2e2b4", face: "#f0c760" },
    5: { base: "#b1252c", edge: "#f3dcdc", face: "#d8434a" },
    10: { base: "#1c7a45", edge: "#dff3e6", face: "#2aa15c" },
    25: { base: "#1c5f9e", edge: "#d9e9f7", face: "#2b7fc9" },
    50: { base: "#d2701c", edge: "#f9e5d2", face: "#ea8f36" },
    100: { base: "#6c2f9c", edge: "#ebdcf7", face: "#8b45c2" },
  };
  return (
    presets[value] ?? { base: "#2b3a4a", edge: "#dfe7ef", face: "#3d5268" }
  );
}

function drawChip(ctx: CanvasRenderingContext2D, value: number): void {
  const size = 128;
  const centre = size / 2;
  const radius = centre - 4;
  const palette = chipPalette(value);

  ctx.beginPath();
  ctx.arc(centre, centre, radius, 0, Math.PI * 2);
  ctx.fillStyle = palette.base;
  ctx.fill();

  // Six edge spots, the classic casino chip silhouette.
  ctx.fillStyle = palette.edge;
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(centre, centre);
    ctx.arc(centre, centre, radius, angle - 0.26, angle + 0.26);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(20,20,20,0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(centre, centre, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(20,20,20,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centre, centre, radius - 9, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centre, centre, radius - 17, 0, Math.PI * 2);
  ctx.fillStyle = palette.face;
  ctx.fill();
  ctx.strokeStyle = "rgba(20,20,20,0.75)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Gloss across the upper-left quadrant.
  ctx.beginPath();
  ctx.moveTo(centre, centre);
  ctx.arc(centre, centre, radius, Math.PI * 1.05, Math.PI * 1.75);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.13)";
  ctx.fill();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${value >= 100 ? 34 : 38}px ${CHIP_FONT}`;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.strokeText(formatChipLabel(value), centre, centre + 1);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(formatChipLabel(value), centre, centre + 1);
}

// ------------------------------------------------------------------ helpers

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function withAlpha(color: string, alpha: number): string {
  const value = color.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
