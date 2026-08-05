# React integration

The engine has no React dependency. React's entire job is to hand it a `div` and tell it
when to go away.

A complete, copy-paste wrapper lives at [`react/RouletteTable.tsx`](../react/RouletteTable.tsx).
It is deliberately **not** part of the engine bundle — it is an example for your app.

## Minimal version

```tsx
import { useEffect, useRef } from 'react';
import { createRouletteGame, type Game } from '@casino/roulette-engine';

export function RouletteTable() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const game: Game = createRouletteGame();
    let cancelled = false;

    void game.init(host).then(() => {
      if (cancelled) game.destroy();
    });

    return () => {
      cancelled = true;
      game.destroy();
    };
  }, []);

  return <div ref={hostRef} style={{ width: '100%', height: '100%' }} />;
}
```

That is the whole integration.

## Four things that will bite you

### 1. StrictMode double-mounting

React 18 in development mounts, unmounts and remounts every effect. `init()` is async, so
without the `cancelled` flag the first init finishes *after* its cleanup has run and leaves
an orphaned WebGL context. Browsers cap those at around sixteen; a few navigations and the
canvas goes black.

The flag above is the fix. `destroy()` is idempotent, so calling it twice is harmless.

### 2. Do not re-run the effect on prop changes

```tsx
useEffect(() => { /* ... */ }, []);          // ✅ mount once
useEffect(() => { /* ... */ }, [config]);    // ❌ rebuilds the engine every render
```

An inline `config={{ ... }}` object is a new reference on every render, so a `[config]`
dependency tears the table down mid-round. Push changes instead:

```tsx
useEffect(() => { gameRef.current?.updateConfig(config); }, [config]);
```

Same for callbacks — hold them in refs (as the reference wrapper does) so a parent passing
an inline arrow function does not remount the game.

### 3. You do not need to call `resize()`

The engine puts a `ResizeObserver` on the element you hand it. Sizing that element with CSS
— flex, grid, a sidebar animating open — is enough. `resize(w, h)` is for hosts that want to
drive sizing explicitly, and calling it switches the engine *out* of observation mode.

### 4. Keep one copy of PixiJS

`vite.lib.config.ts` marks `pixi.js` and `gsap` external so the host resolves a single
instance. Two copies of Pixi in one page means two WebGL contexts and two texture caches —
the most common cause of "the game renders black inside my app".

If you use a monorepo with hoisting disabled, dedupe explicitly:

```ts
// vite.config.ts of the host app
export default defineConfig({
  resolve: { dedupe: ['pixi.js', 'gsap'] },
});
```

## Reading results

```tsx
import { GameEvent, type RoundResult } from '@casino/roulette-engine';

const [lastResult, setLastResult] = useState<RoundResult | null>(null);

useEffect(() => {
  const game = gameRef.current;
  if (!game) return;
  return game.events.on(GameEvent.PAYOUT, setLastResult);   // returns an unsubscribe fn
}, []);
```

`on()` returns its own unsubscriber, so it works directly as an effect cleanup.

## Pausing with routing

```tsx
useEffect(() => {
  const game = gameRef.current;
  if (!game) return;
  isVisible ? game.resume() : game.pause();
}, [isVisible]);
```

`pause()` stops the ticker, every GSAP tween and the audio context, so a backgrounded table
costs nothing. The engine already auto-pauses on `visibilitychange` — this is for in-app
navigation, where the tab stays visible but your route is not.

## Next.js / SSR

The engine touches `window` and `document` at construction. Load it client-side only:

```tsx
import dynamic from 'next/dynamic';

const RouletteTable = dynamic(
  () => import('./RouletteTable').then((m) => m.RouletteTable),
  { ssr: false },
);
```

## Several tables on one page

Supported. Bitmap fonts and the asset cache are reference counted, so unmounting one table
does not blank another. Note that each instance is a separate WebGL context — the practical
ceiling is a handful, not dozens.
