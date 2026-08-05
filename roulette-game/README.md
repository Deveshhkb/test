# Roulette Engine

A production-grade HTML5 Roulette engine built on **PixiJS v8**, **TypeScript**, **GSAP** and
**Vite**. European (single-zero) by default, American (double-zero) optional.

The engine is framework-independent. The same build runs as a standalone game and mounts
inside any host application — React, Vue, Angular or plain DOM — through a nine-method API.
There is no React inside `src/`: no hooks, no JSX, no component model.

---

## Quick start

### Standalone

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # -> dist-standalone/
```

### As a library

```bash
npm run build:lib    # -> dist/ (ESM + UMD + .d.ts)
```

```ts
import { createRouletteGame } from '@casino/roulette-engine';

const game = createRouletteGame({ timing: { bettingDuration: 20 } });
await game.init(document.getElementById('table')!);
```

See [docs/STANDALONE.md](docs/STANDALONE.md) and
[docs/REACT_INTEGRATION.md](docs/REACT_INTEGRATION.md).

---

## Public API

The complete host-facing surface. Nothing else is exported for a host to call.

| Method | Purpose |
| --- | --- |
| `init(container, config?)` | Mount into a DOM element. Resolves when playable. |
| `destroy()` | Release everything: ticker, tweens, textures, audio, WebGL context. |
| `pause()` | Stop the ticker, tweens and audio. |
| `resume()` | Resume from exactly where `pause()` stopped. |
| `resize(width, height)` | Explicit sizing. Optional — the container is observed automatically. |
| `reset()` | Abandon the round, clear the felt, start fresh. |
| `updateConfig(config)` | Deep-merge a config patch at runtime. |
| `setTheme(theme)` | Swap palette by name or `Theme` object. |
| `setLanguage(language)` | Swap locale. |

Plus `game.events` — the typed [`EventBus`](src/Utilities/EventBus.ts) that is also the
backend integration seam.

---

## What is implemented

**Wheel and ball**
European and American pocket orders, continuous idle rotation, spin-up, ball launch
against the wheel, free deceleration on the rim, drop through the deflectors with decaying
bounce and scatter, and an exact landing in the target pocket. Speeds, durations and bounce
count are all configurable. See [the physics note](#deterministic-outcomes-that-do-not-look-scripted).

**Betting**
All standard bets — straight up, split, street, corner, six line, trio, basket, column,
dozen, red, black, odd, even, high, low — generated procedurally from the grid rather than
hand-listed. Configurable payouts, global and per-bet-type table limits, multiple chip
denominations, undo / repeat / double / clear, running total and last win.

**Chips**
Pooled sprites (zero allocation after warm-up), correct denomination decomposition,
believable stacking with seeded jitter, and three animations: place, sweep (loss) and
collect (win).

**Presentation**
Winning-pocket glow, dolly dropped on the winning cell, result banner, losing-spot dim,
rolling balance count-up, countdown ring with last-call styling, recent-numbers strip and a
live statistics panel.

**Responsive**
One layout solver per orientation, absolute floors for touch targets, safe-area insets,
device-pixel-ratio tracking, `ResizeObserver` on the host element, and a quarter-turn felt
rotation in portrait. Verified at 320×700 through 2560×1080.

**Audio**
Full soundscape with **zero audio assets** — every cue has a Web Audio synthesised
implementation. Drop real files into `audio.sources` and they take over per-cue.

---

## Deterministic outcomes that do not look scripted

The winning number is known before the ball is launched — that is how every real-money game
works, and the client's job is to animate toward a known answer without it looking canned.

The simulation splits into two regimes:

- **Track phase** — the ball's angle is *integrated* from a decaying angular velocity.
  Nothing is solved or constrained; it is free motion, and where it ends up does not matter.
- **Drop phase** — the ball's angle is expressed *relative to the wheel head*:
  `ballAngle = wheelAngle + pocketAngle + offset`, where `offset` is tweened from wherever
  the ball actually is down to exactly zero.

Because the offset is measured at the instant the drop begins, the two phases join with no
discontinuity. Because it ends at zero, the ball is guaranteed dead-centre in the winning
pocket. And because the drop tracks the *live* wheel angle every frame, the wheel's own
motion never has to be predicted or held constant.

The initial offset is sized from the ball's real relative velocity, so the hand-over matches
in speed as well as position — that is what stops the drop from reading as a snap.

`WheelManager.detectPocket()` reads the rendered geometry back and reports which pocket the
ball is physically over. The smoke test asserts it agrees with the intended result.

---

## Documentation

| Document | Contents |
| --- | --- |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Module map, layering diagram, ownership rules |
| [STATE_MACHINE.md](docs/STATE_MACHINE.md) | All twelve states and the legal transitions |
| [EVENTS.md](docs/EVENTS.md) | Every event, its payload and who emits it |
| [BACKEND.md](docs/BACKEND.md) | WebSocket / Socket.IO integration, server-driven mode |
| [REACT_INTEGRATION.md](docs/REACT_INTEGRATION.md) | Mounting from React, StrictMode, pitfalls |
| [STANDALONE.md](docs/STANDALONE.md) | Running and deploying standalone |
| [ASSETS.md](docs/ASSETS.md) | Asset manifest, swapping artwork, procedural fallback |
| [PERFORMANCE.md](docs/PERFORMANCE.md) | Frame budget, pooling, draw calls, leak policy |

---

## Project structure

```
src/
  Game/
    Game.ts             Public API, lifecycle, ticker
    SceneManager.ts     Scene switching with covered transitions
    Config.ts           Defaults, payouts, theme registry
    Constants.ts        Wheel orders, colours, board geometry
    TableLayout.ts      Procedural bet-spot generation + hit testing
    TextureFactory.ts   Procedural bakery / artwork seam
    AssetLoader.ts      Manifest loading, ref-counted asset cache
    Fonts.ts            Ref-counted bitmap font installation
  Scenes/
    Scene.ts            Base class + GameContext (DI seam)
    BootScene.ts        Audio graph, first paint
    LoadingScene.ts     Download, then bake, with real progress
    RouletteScene.ts    The table: layout solver + assembly
  Objects/
    Wheel.ts  Ball.ts  Chip.ts  BettingBoard.ts
    WinningMarker.ts  HistoryPanel.ts
  UI/
    Button.ts  ChipTray.ts  ControlBar.ts  Hud.ts
  Managers/
    GameManager.ts      Round state machine (drives or follows)
    WheelManager.ts     Wheel + ball simulation
    BetManager.ts       Wagers, validation, resolution (no Pixi)
    ChipManager.ts      Pooling, stacking, chip animations
    AnimationManager.ts GSAP ownership, pause/resume, teardown
    AudioManager.ts     Web Audio + procedural synthesis
    ResizeManager.ts    Layout metrics, DPR, safe area, orientation
    InputManager.ts     Keyboard, gestures, visibility auto-pause
    HistoryManager.ts   Result window + statistics
  Utilities/
    EventBus.ts  Math.ts  Helpers.ts  Logger.ts
  Localization/         en, es, hi + runtime registration
  Types/                All interfaces and enums, zero runtime imports
```

---

## Testing

```bash
npm run typecheck                 # strict TypeScript, zero escapes
npm run dev                       # terminal 1
npm run smoke                     # terminal 2
```

The smoke test drives real Chromium and asserts what unit tests cannot: a full round runs,
the ball lands on the intended number, every breakpoint lays out without throwing, and five
mount/unmount cycles leave no orphaned canvases. Screenshots land in `.shots/`.

---

## Keyboard shortcuts

`Z` / `Backspace` undo · `R` repeat · `D` double · `C` / `Esc` clear · `M` mute ·
`←` `→` `↑` `↓` cycle chip denomination

---

## Known limitations

- **Betting-board artwork is procedural.** The supplied cell sprites are not yet wired in;
  the board is drawn from `Graphics` against the theme palette. The wheel, ball and felt use
  the supplied artwork.
- **No unit-test suite.** Verification is the strict compiler plus the end-to-end smoke
  test. `BetManager`, `TableLayout` and `HistoryManager` are pure and Pixi-free, so they are
  ready to test directly — the harness simply is not written yet.
- **`wheel.type` needs a `reset()`** to take effect, since the pocket ring and the felt are
  built from it.
