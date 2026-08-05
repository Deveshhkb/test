import { defineConfig } from 'vite';

/**
 * Standalone / development configuration.
 *
 * `npm run dev`   -> hot-reloading dev server hosting index.html
 * `npm run build` -> static, self-hosted build of the standalone game
 *
 * The library build used for host-application integration lives in
 * `vite.lib.config.ts` so that neither target can contaminate the other.
 */
export default defineConfig({
  base: './',
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist-standalone',
    sourcemap: true,
    assetsInlineLimit: 0,
  },
});
