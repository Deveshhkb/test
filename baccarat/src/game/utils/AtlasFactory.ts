import {
  Container,
  Graphics,
  Rectangle,
  RenderTexture,
  Text,
  Texture,
  type Renderer,
  type TextStyleOptions,
  type TextureSource,
} from "pixi.js";

import type { GameConfig } from "../Config";
import { CARD_HEIGHT, CARD_WIDTH, CHIP_SIZE, Palette } from "../Constants";
import { RANKS, Rank, SUITS, Suit, cardKey, rankLabel } from "../types";
import { shade, toCssColor } from "./Helpers";

/**
 * Bakes every sprite the game needs into a handful of GPU textures at boot.
 *
 * Three benefits over shipping PNGs:
 *  - the engine runs with zero binary assets, so it drops into any project
 *  - every card shares one base texture, so a full table is one draw call
 *  - art scales to the device: the atlas is baked at the display's DPR
 *
 * Production art can replace all of it by pointing `config.assets.atlasUrl` at
 * a real spritesheet; the frame names below are the contract.
 */

export interface GeneratedAtlas {
  readonly textures: Readonly<Record<string, Texture>>;
  destroy(): void;
}

const SUIT_GLYPH: Record<Suit, string> = {
  [Suit.Spades]: "♠",
  [Suit.Hearts]: "♥",
  [Suit.Diamonds]: "♦",
  [Suit.Clubs]: "♣",
};

const SUIT_COLOR: Record<Suit, number> = {
  [Suit.Spades]: 0x14161c,
  [Suit.Clubs]: 0x14161c,
  [Suit.Hearts]: 0xc8102e,
  [Suit.Diamonds]: 0xc8102e,
};

export class AtlasFactory {
  private readonly renderer: Renderer;
  private readonly config: GameConfig;
  private readonly owned: RenderTexture[] = [];
  private readonly frames: Record<string, Texture> = {};

  constructor(renderer: Renderer, config: GameConfig) {
    this.renderer = renderer;
    this.config = config;
  }

  build(): GeneratedAtlas {
    this.buildCardAtlas();
    this.buildChipAtlas();
    this.buildRoadAtlas();
    this.buildEffectTextures();

    const textures = this.frames;
    const owned = this.owned;
    return {
      textures,
      destroy(): void {
        for (const texture of Object.values(textures)) texture.destroy(false);
        for (const base of owned) base.destroy(true);
      },
    };
  }

  /* ---------------------------------------------------------------- *
   * Cards
   * ---------------------------------------------------------------- */

  private buildCardAtlas(): void {
    const cols = RANKS.length; // 13
    const rows = SUITS.length + 1; // 4 suits + a row for the back
    const width = cols * CARD_WIDTH;
    const height = rows * CARD_HEIGHT;

    const sheet = new Container();

    SUITS.forEach((suit, rowIndex) => {
      RANKS.forEach((rank, colIndex) => {
        const face = this.drawCardFace(rank, suit);
        face.position.set(colIndex * CARD_WIDTH, rowIndex * CARD_HEIGHT);
        sheet.addChild(face);
      });
    });

    const back = this.drawCardBack();
    back.position.set(0, SUITS.length * CARD_HEIGHT);
    sheet.addChild(back);

    const highlight = this.drawCardHighlight();
    highlight.position.set(CARD_WIDTH, SUITS.length * CARD_HEIGHT);
    sheet.addChild(highlight);

    const source = this.bake(sheet, width, height);

    SUITS.forEach((suit, rowIndex) => {
      RANKS.forEach((rank, colIndex) => {
        this.frames[cardKey({ rank, suit })] = new Texture({
          source,
          frame: new Rectangle(colIndex * CARD_WIDTH, rowIndex * CARD_HEIGHT, CARD_WIDTH, CARD_HEIGHT),
        });
      });
    });

    this.frames["card_back"] = new Texture({
      source,
      frame: new Rectangle(0, SUITS.length * CARD_HEIGHT, CARD_WIDTH, CARD_HEIGHT),
    });
    this.frames["card_highlight"] = new Texture({
      source,
      frame: new Rectangle(CARD_WIDTH, SUITS.length * CARD_HEIGHT, CARD_WIDTH, CARD_HEIGHT),
    });

    sheet.destroy({ children: true });
  }

  private drawCardFace(rank: Rank, suit: Suit): Container {
    const root = new Container();
    const color = SUIT_COLOR[suit];
    const glyph = SUIT_GLYPH[suit];
    const label = rankLabel(rank);
    const pad = 3;
    const w = CARD_WIDTH - pad * 2;
    const h = CARD_HEIGHT - pad * 2;

    const body = new Graphics()
      .roundRect(pad, pad, w, h, 11)
      .fill(0xfdfcf8)
      .roundRect(pad + 2.5, pad + 2.5, w - 5, h - 5, 9)
      .stroke({ width: 1, color: 0xd8d3c4, alignment: 1 });
    root.addChild(body);

    // Paper tint at the bottom so the card does not read as flat white.
    const tint = new Graphics()
      .roundRect(pad, pad + h * 0.72, w, h * 0.28, 11)
      .fill({ color: 0xe9e4d6, alpha: 0.45 });
    root.addChild(tint);

    const cornerStyle: TextStyleOptions = {
      fontFamily: this.config.theme.fontFamily,
      fontSize: label.length > 1 ? 30 : 34,
      fontWeight: "700",
      fill: color,
      align: "center",
    };

    const topRank = new Text({ text: label, style: cornerStyle });
    topRank.anchor.set(0.5, 0);
    topRank.position.set(pad + 19, pad + 7);
    root.addChild(topRank);

    const topSuit = new Text({
      text: glyph,
      style: { ...cornerStyle, fontSize: 25 },
    });
    topSuit.anchor.set(0.5, 0);
    topSuit.position.set(pad + 19, pad + 40);
    root.addChild(topSuit);

    // Centre pip carries the read at table scale.
    const centre = new Text({
      text: glyph,
      style: { ...cornerStyle, fontSize: 78 },
    });
    centre.anchor.set(0.5);
    centre.position.set(CARD_WIDTH / 2, CARD_HEIGHT / 2 + 4);
    centre.alpha = 0.95;
    root.addChild(centre);

    // Court cards get a monogram block so J/Q/K are distinct at a glance.
    if (rank >= Rank.Jack) {
      const monogram = new Graphics()
        .roundRect(CARD_WIDTH / 2 - 26, CARD_HEIGHT / 2 - 34, 52, 68, 6)
        .fill({ color, alpha: 0.1 })
        .stroke({ width: 1.5, color, alignment: 0.5 });
      root.addChildAt(monogram, root.getChildIndex(centre));
    }

    const bottomRank = new Text({ text: label, style: cornerStyle });
    bottomRank.anchor.set(0.5, 0);
    bottomRank.position.set(CARD_WIDTH - pad - 19, CARD_HEIGHT - pad - 7);
    bottomRank.rotation = Math.PI;
    root.addChild(bottomRank);

    const bottomSuit = new Text({ text: glyph, style: { ...cornerStyle, fontSize: 25 } });
    bottomSuit.anchor.set(0.5, 0);
    bottomSuit.position.set(CARD_WIDTH - pad - 19, CARD_HEIGHT - pad - 40);
    bottomSuit.rotation = Math.PI;
    root.addChild(bottomSuit);

    return root;
  }

  private drawCardBack(): Container {
    const root = new Container();
    const pad = 3;
    const w = CARD_WIDTH - pad * 2;
    const h = CARD_HEIGHT - pad * 2;
    const base = 0x7a1220;

    const body = new Graphics()
      .roundRect(pad, pad, w, h, 11)
      .fill(base)
      .roundRect(pad + 5, pad + 5, w - 10, h - 10, 8)
      .stroke({ width: 1.5, color: Palette.gold, alignment: 0.5 });
    root.addChild(body);

    // Diagonal lattice — cheap to bake, reads as a printed pattern in motion.
    const lattice = new Graphics();
    const step = 13;
    for (let i = -h; i < w + h; i += step) {
      lattice.moveTo(pad + i, pad).lineTo(pad + i + h, pad + h);
      lattice.moveTo(pad + i, pad + h).lineTo(pad + i + h, pad);
    }
    lattice.stroke({ width: 1, color: shade(base, 0.28), alpha: 0.55 });

    const mask = new Graphics().roundRect(pad + 7, pad + 7, w - 14, h - 14, 6).fill(0xffffff);
    lattice.mask = mask;
    root.addChild(mask, lattice);

    const emblem = new Graphics()
      .circle(CARD_WIDTH / 2, CARD_HEIGHT / 2, 26)
      .fill({ color: shade(base, -0.35), alpha: 0.9 })
      .circle(CARD_WIDTH / 2, CARD_HEIGHT / 2, 26)
      .stroke({ width: 2, color: Palette.gold });
    root.addChild(emblem);

    const mark = new Text({
      text: "♦",
      style: {
        fontFamily: this.config.theme.fontFamily,
        fontSize: 26,
        fill: Palette.gold,
        fontWeight: "700",
      },
    });
    mark.anchor.set(0.5);
    mark.position.set(CARD_WIDTH / 2, CARD_HEIGHT / 2);
    root.addChild(mark);

    return root;
  }

  /** Gold rim laid over a winning hand's cards. */
  private drawCardHighlight(): Container {
    const root = new Container();
    const pad = 3;
    const g = new Graphics()
      .roundRect(pad, pad, CARD_WIDTH - pad * 2, CARD_HEIGHT - pad * 2, 11)
      .stroke({ width: 5, color: Palette.goldBright, alignment: 0.5 });
    root.addChild(g);
    return root;
  }

  /* ---------------------------------------------------------------- *
   * Chips
   * ---------------------------------------------------------------- */

  private buildChipAtlas(): void {
    const chips = this.config.chips;
    const width = chips.length * CHIP_SIZE;
    const sheet = new Container();

    chips.forEach((chip, index) => {
      const face = this.drawChip(chip.color, chip.accent, chip.label);
      face.position.set(index * CHIP_SIZE, 0);
      sheet.addChild(face);
    });

    const source = this.bake(sheet, width, CHIP_SIZE);

    chips.forEach((chip, index) => {
      this.frames[`chip_${chip.value}`] = new Texture({
        source,
        frame: new Rectangle(index * CHIP_SIZE, 0, CHIP_SIZE, CHIP_SIZE),
      });
    });

    sheet.destroy({ children: true });
  }

  private drawChip(color: number, accent: number, label: string): Container {
    const root = new Container();
    const r = CHIP_SIZE / 2 - 2;
    const cx = CHIP_SIZE / 2;
    const cy = CHIP_SIZE / 2;

    root.addChild(
      new Graphics()
        .circle(cx, cy + 1.5, r)
        .fill({ color: 0x000000, alpha: 0.3 })
        .circle(cx, cy, r)
        .fill(accent),
    );

    // Eight edge spots — the detail that makes a disc read as a casino chip.
    const spots = new Graphics();
    const spotCount = 8;
    for (let i = 0; i < spotCount; i++) {
      const a0 = (i / spotCount) * Math.PI * 2;
      const a1 = a0 + Math.PI / spotCount;
      spots.moveTo(cx, cy).arc(cx, cy, r, a0, a1).lineTo(cx, cy).fill(color);
    }
    root.addChild(spots);

    root.addChild(
      new Graphics()
        .circle(cx, cy, r * 0.78)
        .fill(color)
        .circle(cx, cy, r * 0.78)
        .stroke({ width: 2, color: accent, alpha: 0.85 })
        .circle(cx, cy, r * 0.62)
        .fill(shade(color, 0.12))
        .circle(cx, cy, r * 0.62)
        .stroke({ width: 1.5, color: accent, alpha: 0.5 }),
    );

    // Top-left specular arc.
    root.addChild(
      new Graphics()
        .arc(cx, cy, r - 3, Math.PI * 1.05, Math.PI * 1.65)
        .stroke({ width: 3, color: 0xffffff, alpha: 0.28 }),
    );

    const luminance = ((color >> 16) & 0xff) * 0.299 + ((color >> 8) & 0xff) * 0.587 + (color & 0xff) * 0.114;
    const text = new Text({
      text: label,
      style: {
        fontFamily: this.config.theme.numericFontFamily,
        fontSize: label.length >= 4 ? 21 : label.length >= 3 ? 24 : 27,
        fontWeight: "800",
        fill: luminance > 140 ? 0x1b1b1f : 0xffffff,
        align: "center",
      },
    });
    text.anchor.set(0.5);
    text.position.set(cx, cy);
    root.addChild(text);

    return root;
  }

  /* ---------------------------------------------------------------- *
   * Roadmap markers
   * ---------------------------------------------------------------- */

  private buildRoadAtlas(): void {
    const size = 40;
    const specs: Array<{ key: string; draw: (g: Graphics) => void }> = [
      { key: "road_dot_player", draw: (g) => dot(g, size, Palette.player) },
      { key: "road_dot_banker", draw: (g) => dot(g, size, Palette.banker) },
      { key: "road_dot_tie", draw: (g) => dot(g, size, Palette.tie) },
      { key: "road_ring_player", draw: (g) => ring(g, size, Palette.player) },
      { key: "road_ring_banker", draw: (g) => ring(g, size, Palette.banker) },
      { key: "road_small_player", draw: (g) => dot(g, size, Palette.player, 0.62) },
      { key: "road_small_banker", draw: (g) => dot(g, size, Palette.banker, 0.62) },
      { key: "road_slash_player", draw: (g) => slash(g, size, Palette.player) },
      { key: "road_slash_banker", draw: (g) => slash(g, size, Palette.banker) },
      { key: "road_tie_slash", draw: (g) => slash(g, size, Palette.tie, 3) },
    ];

    const sheet = new Container();
    specs.forEach((spec, index) => {
      const g = new Graphics();
      spec.draw(g);
      g.position.set(index * size, 0);
      sheet.addChild(g);
    });

    const source = this.bake(sheet, specs.length * size, size);
    specs.forEach((spec, index) => {
      this.frames[spec.key] = new Texture({
        source,
        frame: new Rectangle(index * size, 0, size, size),
      });
    });

    sheet.destroy({ children: true });
  }

  /* ---------------------------------------------------------------- *
   * Effects
   * ---------------------------------------------------------------- */

  private buildEffectTextures(): void {
    this.frames["fx_glow"] = radialGradientTexture(128, [
      { stop: 0, color: "rgba(255,255,255,1)" },
      { stop: 0.35, color: "rgba(255,255,255,0.55)" },
      { stop: 1, color: "rgba(255,255,255,0)" },
    ]);

    this.frames["fx_spark"] = radialGradientTexture(32, [
      { stop: 0, color: "rgba(255,255,255,1)" },
      { stop: 0.5, color: "rgba(255,236,180,0.8)" },
      { stop: 1, color: "rgba(255,200,80,0)" },
    ]);

    this.frames["fx_vignette"] = radialGradientTexture(256, [
      { stop: 0, color: `${toCssColor(this.config.theme.feltLight)}ff` },
      { stop: 0.55, color: `${toCssColor(this.config.theme.feltMid)}ff` },
      { stop: 1, color: `${toCssColor(this.config.theme.feltDeep)}ff` },
    ]);
  }

  /* ---------------------------------------------------------------- *
   * Baking
   * ---------------------------------------------------------------- */

  private bake(container: Container, width: number, height: number): TextureSource {
    const resolution = Math.max(1, this.config.assets.atlasResolution);
    const target = RenderTexture.create({ width, height, resolution, antialias: true });
    this.renderer.render({ container, target, clear: true });
    this.owned.push(target);
    return target.source;
  }
}

/* ------------------------------------------------------------------ *
 * Marker primitives
 * ------------------------------------------------------------------ */

function dot(g: Graphics, size: number, color: number, scale = 0.78): void {
  const r = (size / 2) * scale;
  g.circle(size / 2, size / 2, r).fill(color);
  g.circle(size / 2, size / 2, r).stroke({ width: 1.5, color: shade(color, -0.35), alpha: 0.6 });
}

function ring(g: Graphics, size: number, color: number): void {
  const r = (size / 2) * 0.74;
  g.circle(size / 2, size / 2, r).stroke({ width: 5, color });
}

function slash(g: Graphics, size: number, color: number, width = 5): void {
  const inset = size * 0.18;
  g.moveTo(size - inset, inset)
    .lineTo(inset, size - inset)
    .stroke({ width, color, cap: "round" });
}

/* ------------------------------------------------------------------ *
 * Canvas gradients
 * ------------------------------------------------------------------ */

interface GradientStop {
  readonly stop: number;
  readonly color: string;
}

/**
 * Radial gradients are the one thing Pixi's Graphics cannot bake cheaply, so
 * they come from a 2D canvas. Generated once, reused by every glow and
 * particle in the game.
 */
export function radialGradientTexture(size: number, stops: readonly GradientStop[]): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Texture.WHITE;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const { stop, color } of stops) gradient.addColorStop(stop, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return Texture.from(canvas);
}
