import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

/**
 * Two build targets share one source tree:
 *
 *  - `vite build`             -> standalone playable web app (index.html entry)
 *  - `vite build --mode lib`  -> embeddable ES module library (src/index.ts entry)
 *
 * The library build keeps `pixi.js` / `gsap` external so a host React app
 * shares a single copy of both with the engine.
 */
export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 8080,
    host: true,
    open: true,
  },
  build:
    mode === "lib"
      ? {
          target: "es2022",
          sourcemap: true,
          lib: {
            entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
            name: "BaccaratEngine",
            formats: ["es"],
            fileName: () => "baccarat-engine.js",
          },
          rollupOptions: {
            external: ["pixi.js", "gsap", "react", "react-dom"],
          },
        }
      : {
          target: "es2022",
          sourcemap: true,
          assetsInlineLimit: 0,
        },
}));
