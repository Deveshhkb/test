import { createRouletteGame } from './index';
import { GameEvent } from './Types';

/**
 * Standalone bootstrap.
 *
 * This file exists *only* for `npm run dev` and the standalone build. It is not
 * part of the library bundle - `vite.lib.config.ts` builds `index.ts` instead.
 *
 * Note how little it does: mount into an element, wire a couple of lifecycle
 * niceties, and get out of the way. A host application's integration is the
 * same shape and roughly the same length, which is the point of the API.
 */

const mount = document.getElementById('game-root');
if (!mount) throw new Error('#game-root not found');

const game = createRouletteGame({
  // Verbose logging while developing; production hosts leave this off.
  debug: import.meta.env.DEV,
  render: {
    // Turn on to watch the frame budget during development.
    showStats: false,
  },
});

/* Surface fatal errors rather than failing silently on a blank canvas. */
game.events.on(GameEvent.ERROR, ({ message, fatal }) => {
  if (!fatal) return;
  mount.innerHTML = `<div style="
    display:flex;align-items:center;justify-content:center;
    height:100%;color:#e8c96a;font:16px/1.5 system-ui,sans-serif;text-align:center;padding:24px;">
    Failed to start the table.<br><small style="color:#9aa5a0">${message}</small></div>`;
});

void game.init(mount);

/* Development ergonomics -------------------------------------------------- */

if (import.meta.env.DEV) {
  // Vite replaces the module on edit; without this the old game keeps its
  // WebGL context and its ticker, and contexts are capped per page.
  import.meta.hot?.dispose(() => game.destroy());

  // Handy for poking at the engine from the console.
  (window as unknown as { game: typeof game }).game = game;
}
