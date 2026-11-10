import { Rectangle, Texture } from 'pixi.js';
import { SYMBOL_IDS, type SymbolId } from '@neon/game-math';
import { LOW_SYMBOL_STYLE, SPECIAL_LABELS, SYMBOL_SVGS } from './art/symbols';
import { BOSS_H, BOSS_W, HERO_H, HERO_W, bossSvg, heroBodySvg, heroPonytailSvg, muzzleGlowSvg } from './art/characters';
import { drawCityBackground, drawNeonSign, type BackgroundVariant } from './art/background';
import { PARTICLE_CELL, PARTICLE_NAMES, drawParticleAtlas, type ParticleName } from './art/particles';
import { loadSvgImage, svgToDataUrl } from './art/svgKit';

export const SYMBOL_PX = 256;

export interface GameTextures {
  symbols: Record<SymbolId, Texture>;
  symbolsBlur: Record<SymbolId, Texture>;
  particles: Record<ParticleName, Texture>;
  heroBody: Texture;
  heroPonytail: Texture;
  muzzle: Texture;
  boss: Texture;
  backgrounds: Record<BackgroundVariant, Texture>;
  neonSigns: Texture[];
  /** Data URLs for React UI (paytable). */
  symbolImages: Record<SymbolId, string>;
}

export const FONT_DISPLAY = 'Orbitron';
export const FONT_UI = 'Rajdhani';
export const FONT_RANK = 'Russo One';

async function ensureFonts() {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.allSettled([
    document.fonts.load(`900 64px ${FONT_DISPLAY}`),
    document.fonts.load(`700 64px ${FONT_DISPLAY}`),
    document.fonts.load(`700 32px ${FONT_UI}`),
    document.fonts.load(`400 64px "${FONT_RANK}"`),
  ]);
}

function drawLowSymbol(ctx: CanvasRenderingContext2D, x: number, y: number, id: SymbolId) {
  const st = LOW_SYMBOL_STYLE[id]!;
  const cx = x + SYMBOL_PX / 2;
  const cy = y + SYMBOL_PX / 2 + 8;
  ctx.save();
  const size = st.text.length > 1 ? 160 : 200;
  ctx.font = `400 ${size}px "${FONT_RANK}", Arial Black, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // italic skew for speed feel
  ctx.translate(cx, cy);
  ctx.transform(1, 0, -0.12, 1, 0, 0);
  // neon-tube letter: dark glass fill, wide coloured bloom, bright tube, white-hot core
  const fill = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
  fill.addColorStop(0, 'rgba(255,255,255,0.18)');
  fill.addColorStop(0.5, hexA(st.bottom, 0.32));
  fill.addColorStop(1, 'rgba(10,4,24,0.6)');
  ctx.lineJoin = 'round';
  ctx.shadowColor = st.glow;
  ctx.shadowBlur = 34;
  ctx.lineWidth = 20;
  ctx.strokeStyle = hexA(st.glow, 0.45);
  ctx.strokeText(st.text, 0, 0);
  ctx.shadowBlur = 0;
  ctx.fillStyle = fill;
  ctx.fillText(st.text, 0, 0);
  ctx.shadowBlur = 14;
  ctx.lineWidth = 9;
  ctx.strokeStyle = st.top;
  ctx.strokeText(st.text, 0, 0);
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.strokeText(st.text, 0, 0);
  ctx.restore();
}

function hexA(hex: string, a: number) {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}

function drawLabel(ctx: CanvasRenderingContext2D, x: number, y: number, id: SymbolId) {
  const l = SPECIAL_LABELS[id];
  if (!l) return;
  ctx.save();
  const size = l.text.length > 5 ? 38 : 52;
  ctx.font = `900 ${size}px ${FONT_DISPLAY}, Arial Black, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = x + SYMBOL_PX / 2;
  const cy = y + SYMBOL_PX - 44;
  ctx.translate(cx, cy);
  ctx.transform(1, 0, -0.1, 1, 0, 0);
  ctx.lineWidth = 10;
  ctx.strokeStyle = l.stroke;
  ctx.strokeText(l.text, 0, 0);
  ctx.shadowColor = l.color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = l.color;
  ctx.fillText(l.text, 0, 0);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.55;
  ctx.fillText(l.text, 0, -2);
  ctx.restore();
}

/** Renders every symbol into a texture atlas: sharp cells + vertical motion-blur cells. */
async function buildSymbolAtlas() {
  const cols = 6;
  const n = SYMBOL_IDS.length;
  const rows = Math.ceil(n / cols) * 2;
  const canvas = document.createElement('canvas');
  canvas.width = cols * SYMBOL_PX;
  canvas.height = rows * SYMBOL_PX;
  const ctx = canvas.getContext('2d')!;
  const images = await Promise.all(SYMBOL_IDS.map((id) => (SYMBOL_SVGS[id] ? loadSvgImage(SYMBOL_SVGS[id]!) : Promise.resolve(null))));
  const cellPos = (i: number, blur: boolean) => ({
    x: (i % cols) * SYMBOL_PX,
    y: (Math.floor(i / cols) + (blur ? Math.ceil(n / cols) : 0)) * SYMBOL_PX,
  });

  // single-symbol scratch canvas for blur + paytable images
  const scratch = document.createElement('canvas');
  scratch.width = scratch.height = SYMBOL_PX;
  const sctx = scratch.getContext('2d')!;
  const symbolImages = {} as Record<SymbolId, string>;

  SYMBOL_IDS.forEach((id, i) => {
    sctx.clearRect(0, 0, SYMBOL_PX, SYMBOL_PX);
    const img = images[i];
    if (img) sctx.drawImage(img, 0, 0, SYMBOL_PX, SYMBOL_PX);
    if (LOW_SYMBOL_STYLE[id]) drawLowSymbol(sctx, 0, 0, id);
    drawLabel(sctx, 0, 0, id);
    const p = cellPos(i, false);
    ctx.drawImage(scratch, p.x, p.y);
    symbolImages[id] = scratch.toDataURL('image/png');
    // vertical motion blur: stacked offset copies, clipped to the cell
    const b = cellPos(i, true);
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.x, b.y, SYMBOL_PX, SYMBOL_PX);
    ctx.clip();
    const steps = 9;
    for (let k = -steps; k <= steps; k++) {
      ctx.globalAlpha = 0.16;
      ctx.drawImage(scratch, b.x, b.y + k * 5);
    }
    ctx.restore();
  });
  ctx.globalAlpha = 1;

  const base = Texture.from(canvas);
  const symbols = {} as Record<SymbolId, Texture>;
  const symbolsBlur = {} as Record<SymbolId, Texture>;
  SYMBOL_IDS.forEach((id, i) => {
    const p = cellPos(i, false);
    const b = cellPos(i, true);
    symbols[id] = new Texture({ source: base.source, frame: new Rectangle(p.x, p.y, SYMBOL_PX, SYMBOL_PX) });
    symbolsBlur[id] = new Texture({ source: base.source, frame: new Rectangle(b.x, b.y, SYMBOL_PX, SYMBOL_PX) });
  });
  return { symbols, symbolsBlur, symbolImages, atlas: canvas };
}

async function svgTexture(s: string, w: number, h: number, scale = 1) {
  const img = await loadSvgImage(s);
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return Texture.from(c);
}

export async function createGameTextures(): Promise<GameTextures> {
  await ensureFonts();
  const [{ symbols, symbolsBlur, symbolImages }, heroBody, heroPonytail, muzzle, boss] = await Promise.all([
    buildSymbolAtlas(),
    svgTexture(heroBodySvg, HERO_W, HERO_H, 1.5),
    svgTexture(heroPonytailSvg, HERO_W, HERO_H, 1.5),
    svgTexture(muzzleGlowSvg, 128, 128),
    svgTexture(bossSvg, BOSS_W, BOSS_H, 1.25),
  ]);

  const pAtlas = Texture.from(drawParticleAtlas());
  const particles = {} as Record<ParticleName, Texture>;
  PARTICLE_NAMES.forEach((name, i) => {
    particles[name] = new Texture({
      source: pAtlas.source,
      frame: new Rectangle((i % 4) * PARTICLE_CELL, Math.floor(i / 4) * PARTICLE_CELL, PARTICLE_CELL, PARTICLE_CELL),
    });
  });

  const backgrounds = {
    base: Texture.from(drawCityBackground(1920, 1080, 'base')),
    free: Texture.from(drawCityBackground(1920, 1080, 'free')),
    boss: Texture.from(drawCityBackground(1920, 1080, 'boss')),
  };
  const neonSigns = [
    Texture.from(drawNeonSign('NEON', '#ff2bd6')),
    Texture.from(drawNeonSign('OPEN 24H', '#29e6ff')),
    Texture.from(drawNeonSign('RAMEN', '#ff7a1a')),
  ];
  return { symbols, symbolsBlur, particles, heroBody, heroPonytail, muzzle, boss, backgrounds, neonSigns, symbolImages };
}

/** Pure SVG data URL of a symbol (fallback for UI before textures are ready). */
export function symbolSvgUrl(id: SymbolId): string | null {
  const s = SYMBOL_SVGS[id];
  return s ? svgToDataUrl(s) : null;
}
