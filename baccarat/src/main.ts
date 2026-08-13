import { BaccaratGame } from "./index";

/**
 * Standalone bootstrap.
 *
 * This file exists only for `npm run dev` / `npm run build`. It is not part of
 * the library build — a React host does the equivalent in an effect. Note how
 * little there is: mount, configure, destroy.
 */

const host = document.getElementById("baccarat-root");
if (!host) throw new Error("#baccarat-root is missing from index.html");

const game = new BaccaratGame();

// Expose before init so a boot failure is still debuggable from the console.
if (import.meta.env.DEV) {
  (window as unknown as { game: BaccaratGame }).game = game;
}

await game.init(host, {
  logLevel: import.meta.env.DEV ? "info" : "warn",
});

// Vite HMR: tear the engine down before the module is replaced, otherwise every
// edit leaks a WebGL context.
if (import.meta.hot) {
  import.meta.hot.dispose(() => game.destroy());
}
