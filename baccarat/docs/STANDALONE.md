# Standalone guide

## Run it

```bash
npm install
npm run dev
```

Vite serves on **http://localhost:8080** and opens a browser. HMR is wired: `src/main.ts`
disposes the engine before the module is replaced, so editing does not leak WebGL contexts.

## Build it

```bash
npm run build     # typecheck → unit tests → production bundle in dist/
npm run preview   # serve dist/ locally
```

`dist/` is a static site — any file host works. There is no server component: the bundled
`LocalRngAdapter` runs a complete table (shoe, clock, balance, settlement) in the browser.

## The bootstrap

`src/main.ts` is the whole standalone entry point:

```ts
const host = document.getElementById("baccarat-root")!;
const game = new BaccaratGame();

await game.init(host, {
  tableName: "Baccarat Classic",
  currency: "IDR",
  startingBalance: 10_000_000,
  timing: { bettingSeconds: 15 },
});

if (import.meta.hot) import.meta.hot.dispose(() => game.destroy());
```

`index.html` needs only a sized container; `public/style.css` makes `#baccarat-root` fill
the viewport and respects iOS safe areas in landscape.

## Controls

| Input                | Action                          |
| -------------------- | ------------------------------- |
| Click / tap a band   | Place the selected chip         |
| `−` / `+`            | Step the chip denomination      |
| **BAGI KARTU**       | Close betting and deal          |
| **HAPUS TARUHAN**    | Clear all bets                  |
| Clock button         | Toggle the 1–20 results list    |
| ⓘ button             | Toggle the paytable             |
| `1` – `9`            | Select a chip denomination      |
| `Space` / `Enter`    | Deal                            |
| `U` / `R` / `D` / `C`| Undo / repeat / double / clear   |
| `H` / `I`            | Results list / paytable         |
| `M`                  | Mute / unmute                   |

Shortcuts are ignored while an `input`, `textarea` or `select` has focus, so they are safe
inside a larger page.

## Deterministic shoes

Seed the RNG to replay an exact shoe — invaluable for reproducing a bug report:

```ts
await game.init(host, { network: { seed: "qa-shoe-2026-08-05" } });
```

Same seed, same cards, every time.

## Dev conveniences

In dev builds the instance is exposed as `window.game`:

```js
game.state;                                  // current FSM state
game.context.bets.place("PLAYER");           // drive the table from the console
game.updateConfig({ animation: { speedMultiplier: 0.3 } });  // fast-forward
game.context.roadmaps.snapshot.stats;        // scoreboard state
```

Turn on the verbose log with `{ logLevel: "debug" }`.

## Tuning without touching code

Every knob lives in `src/game/Config.ts` and can be changed at runtime:

```ts
game.updateConfig({
  theme:    { player: 0x1f6feb, banker: 0xd1242f },
  timing:   { bettingSeconds: 20, resultSeconds: 4 },
  animation:{ speedMultiplier: 0.8 },
  chips:    [{ value: 1, label: "1", color: 0xffffff, accent: 0x999999 }],
  features: { squeezeReveal: false, particles: false },
});
```

Theme and chip changes rebuild the texture atlas and relayout automatically.

## Browser support

Chromium, Firefox and Safari with WebGL 2. The renderer falls back to WebGL 1 where needed,
and WebGPU can be opted into with `renderer.preferWebGPU: true`. Audio starts on the first
user gesture — a browser requirement, handled by `InputManager`.
