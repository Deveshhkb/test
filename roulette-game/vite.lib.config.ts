import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import dts from 'vite-plugin-dts';

/**
 * Library configuration - produces the artefact consumed by host applications
 * (React, Vue, Angular, plain DOM ...).
 *
 * `pixi.js` and `gsap` are marked external so the host application resolves a
 * single instance of each. Two copies of PixiJS in one page means two WebGL
 * contexts and two texture caches, which is the single most common cause of
 * "the game renders black inside my app" integration bugs.
 */
export default defineConfig({
  plugins: [dts({ rollupTypes: true, include: ['src'] })],
  build: {
    target: 'es2022',
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'RouletteEngine',
      fileName: 'roulette-engine',
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external: ['pixi.js', 'gsap'],
      output: {
        globals: { 'pixi.js': 'PIXI', gsap: 'gsap' },
      },
    },
  },
});
