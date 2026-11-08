import type { AssetsManifest } from "pixi.js";

/**
 * Asset manifest – add every file here, grouped in bundles.
 * Files live in /public/assets. Paths are relative so the build works from any folder.
 *
 * Load a bundle:   await Assets.loadBundle("game");
 * Use an asset:    Sprite.from("bunny");
 */
export const manifest: AssetsManifest = {
  bundles: [
    {
      name: "preload", // tiny bundle shown on the loading screen
      assets: [],
    },
    {
      name: "game",
      assets: [
        { alias: "bunny", src: "assets/bunny.png" },
        // { alias: "bg", src: "assets/bg-image.png" },
        // { alias: "atlas", src: "assets/spritesheet.json" },
        // { alias: "font", src: "assets/MyFont.woff2" },
        // { alias: "sfx", src: "assets/click.mp3" },
      ],
    },
  ],
};
