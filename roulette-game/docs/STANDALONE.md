# Standalone

## Run

```bash
npm install
npm run dev            # http://localhost:5173
```

`src/main.ts` is the standalone entry point and is not part of the library bundle. It mounts
into `#game-root`, wires a fatal-error fallback and exposes `window.game` in development.

## Build

```bash
npm run build          # tsc --noEmit && vite build  ->  dist-standalone/
npm run preview        # serve the built output
```

The output uses relative paths (`base: './'`), so it can be served from any subdirectory,
a CDN path, or opened through a file server without configuration.

## Deploying

`dist-standalone/` is a static bundle — any static host will do. Two things worth setting:

- **Cache** hashed assets in `assets/` aggressively; serve `index.html` with `no-cache` so a
  redeploy is picked up.
- **Compression** matters here: the bundle is ~520 KB raw, ~166 KB gzipped, most of which is
  PixiJS. Enable gzip or brotli.

## Configuring the standalone build

Edit the `createRouletteGame({ ... })` call in `src/main.ts`, or drive it from the page:

```ts
const params = new URLSearchParams(location.search);

const game = createRouletteGame({
  wheel: { type: params.get('wheel') === 'american' ? WheelType.AMERICAN : WheelType.EUROPEAN },
  timing: { bettingDuration: Number(params.get('betTime') ?? 25) },
  theme: params.get('theme') ?? 'classic',
  language: params.get('lang') ?? 'en',
  network: { startingBalance: Number(params.get('balance') ?? 10000) },
});
```

This is the usual pattern for a demo or a lobby launch URL.

## Embedding in a plain page

No build step required for the host:

```html
<div id="table" style="width:100vw;height:100vh"></div>
<script type="module">
  import { createRouletteGame } from '/dist/roulette-engine.js';

  const game = createRouletteGame({ debug: false });
  await game.init(document.getElementById('table'));
</script>
```

The UMD build (`dist/roulette-engine.umd.cjs`) is there for non-module pages; it expects
`PIXI` and `gsap` as globals.

## Full-viewport considerations

`index.html` sets the pieces a casino client needs and a default Vite template does not:

- `viewport-fit=cover` plus `env(safe-area-inset-*)` — the canvas runs edge to edge on
  notched devices while the layout keeps controls clear of the unsafe regions.
- `touch-action: none` and `overscroll-behavior: none` — no pull-to-refresh mid-bet, no
  double-tap zoom on the felt.
- `user-scalable=no` — pinch-zoom on a betting table is never intentional.
- A dark `theme-color` and `apple-mobile-web-app-status-bar-style` so the browser chrome
  matches the table.

Copy these if you build your own host page.

## Verifying a build

```bash
npm run typecheck
npm run dev            # terminal 1
npm run smoke          # terminal 2
```

The smoke test runs a full round, asserts the ball lands on the intended number, lays out
five viewport sizes from 320×700 to 2560×1080, and checks that repeated mount/unmount cycles
leave no orphaned canvases. Screenshots land in `.shots/`.

Set `PLAYWRIGHT_CHROMIUM` if your Chromium is not where Playwright expects it.
