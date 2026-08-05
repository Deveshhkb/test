import { BitmapFont, BitmapFontManager } from 'pixi.js';

/**
 * Bitmap font installation.
 *
 * Board numbers, the countdown, the history strip and the balance readout all
 * change frequently. Rendered as `Text` each of those would rasterise a fresh
 * canvas and upload a new texture on every change - dozens of uploads per
 * second during a countdown. As `BitmapText` they are quads over one shared
 * atlas: no uploads, no per-change rasterisation, and one draw call for the
 * whole family.
 *
 * Fonts are installed once per page. Character sets are deliberately narrow -
 * the atlas only carries glyphs the game can actually display.
 */

export const FONT = {
  /** Heavy numerals for the board, history and countdown. */
  NUMBER: 'RouletteNumber',
  /** Regular UI copy - labels, buttons, panel headings. */
  UI: 'RouletteUI',
  /** Large display face for the winner banner. */
  DISPLAY: 'RouletteDisplay',
} as const;

const DIGITS = '0123456789';
const UI_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;!?-+/()[]%$€£₹#\'"*&';

/**
 * Number of live engine instances holding the fonts.
 *
 * Bitmap fonts are registered globally with Pixi, not per-application, so they
 * are a *shared* resource. Reference counting is what makes concurrent
 * instances safe: without it, the first instance to be destroyed would
 * uninstall the atlases while a second instance was still drawing with them,
 * and every `BitmapText` on the surviving table would fault on a destroyed
 * texture. That is not a hypothetical - it is trivially reproducible by
 * mounting two tables and unmounting one.
 */
let refCount = 0;

/**
 * Install every bitmap font the engine uses, or take a reference to the
 * already-installed set.
 */
export function installFonts(): void {
  refCount += 1;
  if (refCount > 1) return;

  // Sized generously and scaled *down* at use sites - a bitmap font scaled up
  // is the classic source of soft, muddy numerals.
  BitmapFont.install({
    name: FONT.NUMBER,
    style: {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: 64,
      fontWeight: 'bold',
      fill: 0xffffff,
    },
    chars: `${DIGITS}-/`,
    resolution: 2,
    padding: 4,
  });

  BitmapFont.install({
    name: FONT.UI,
    style: {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: 40,
      fontWeight: '600',
      fill: 0xffffff,
    },
    chars: UI_CHARS,
    resolution: 2,
    padding: 4,
  });

  BitmapFont.install({
    name: FONT.DISPLAY,
    style: {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: 96,
      fontWeight: '900',
      fill: 0xffffff,
    },
    chars: `${DIGITS} .,-+`,
    resolution: 2,
    padding: 6,
  });
}

/**
 * Release a reference to the fonts, uninstalling the atlases only once the last
 * engine instance on the page has let go.
 */
export function uninstallFonts(): void {
  if (refCount === 0) return;
  refCount -= 1;
  if (refCount > 0) return;

  for (const name of [FONT.NUMBER, FONT.UI, FONT.DISPLAY]) {
    BitmapFontManager.uninstall(name);
  }
}

/** Live reference count - exposed for diagnostics and tests. */
export function getFontRefCount(): number {
  return refCount;
}
