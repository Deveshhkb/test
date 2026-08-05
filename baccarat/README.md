# Baccarat Engine

A production Baccarat game engine built on **PixiJS v8**, **TypeScript (strict)**, **GSAP** and
**Vite**. It runs standalone with `npm run dev` and drops into an existing React + PixiJS
application as an ordinary ES module — the engine has no framework dependency at all.

```ts
const game = new BaccaratGame();
await game.init(hostElement, { currency: "USD" });
// ...
game.destroy();
```

---

## Contents

| Document                                              | What it covers                                        |
| ----------------------------------------------------- | ----------------------------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)           | Module map, layering, ownership diagram               |
| [docs/STATE_MACHINE.md](docs/STATE_MACHINE.md)         | Round lifecycle, transitions, what drives each one     |
| [docs/EVENT_FLOW.md](docs/EVENT_FLOW.md)               | Every event, who emits it, who listens                 |
| [docs/BACKEND_INTEGRATION.md](docs/BACKEND_INTEGRATION.md) | Wire protocol and how to plug in a real server    |
| [docs/REACT_INTEGRATION.md](docs/REACT_INTEGRATION.md) | Mounting into an existing React + Pixi app             |
| [docs/STANDALONE.md](docs/STANDALONE.md)              | Running and shipping the standalone build              |
| [docs/ASSET_MANIFEST.md](docs/ASSET_MANIFEST.md)      | Every texture/sound key and how to override them       |
| [docs/PERFORMANCE.md](docs/PERFORMANCE.md)            | The optimisations, and the rules that keep them true   |

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:8080
```

| Script              | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Vite dev server with HMR                           |
| `npm run build`     | Typecheck → tests → standalone web build           |
| `npm run build:lib` | ES-module library build (Pixi/GSAP left external)  |
| `npm test`          | Vitest unit suite (rules + roadmaps)               |
| `npm run typecheck` | `tsc --noEmit`                                     |
| `npm run lint`      | ESLint, type-aware                                 |

**No binary assets are required.** Cards, chips, roadmap markers and effect textures are
generated into GPU atlases at boot, and all sound is synthesised through Web Audio. Point
`config.assets.atlasUrl` / `config.assets.sounds` at real artwork when you have it — see
[docs/ASSET_MANIFEST.md](docs/ASSET_MANIFEST.md).

---

## Public API

Everything a host needs is on `BaccaratGame`:

| Method                     | Behaviour                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| `init(container, config?, options?)` | Boots into a DOM element. Idempotent — a second call returns the same promise.  |
| `destroy()`                | Releases tweens, listeners, WebGL context, audio graph and the canvas.                     |
| `pause()` / `resume()`     | Freezes/resumes rendering, animation, audio and round production.                          |
| `resize()`                 | Forces a layout pass (the engine also observes its container automatically).               |
| `reset()`                  | Abandons the current round and clears the table, keeping the connection.                   |
| `updateConfig(partial)`    | Deep-merges config at runtime; rebuilds artwork and relayouts if the theme changed.         |
| `on/once/off(event, fn)`   | Typed subscription to the event catalogue. `on` returns an unsubscribe function.            |

Read-only: `state`, `balance`, `metrics`, `currentConfig`, `isPaused`, `isReady`, `context`.

```ts
import { BaccaratGame, BetType } from "@hkb/baccarat-engine";

const game = new BaccaratGame();

await game.init(document.getElementById("table")!, {
  tableName: "VIP Baccarat",
  currency: "USD",
  timing: { bettingSeconds: 20 },
  limits: { [BetType.Tie]: { min: 1, max: 500 } },
});

game.on("round:settled", ({ netProfit, commission }) => {
  analytics.track("coup", { netProfit, commission });
});
```

---

## What is implemented

**Game** — full third-card rules for both hands, naturals, ties, commission (and EZ-style
no-commission), 8-deck shoe with a randomly placed cut card, burn cards on shoe change,
provably-replayable seeded RNG.

**Betting** — Player, Banker, Tie, Player Pair, Banker Pair, Perfect Pair, Natural. Undo,
repeat, double, clear. Per-spot limits, optimistic placement with server reconciliation,
commission preview and potential-win readout.

**Presentation** — shoe with riffle-shuffle and burn, alternating deal, two-half card flips,
the squeeze on the decisive third card, rotated third-card placement, chip stacks decomposed
into real denominations, win glow / lose fade, payout counters, particle burst.

**Scoreboards** — Bead Plate, Big Road (with dragon tail), Big Eye Boy, Small Road, Cockroach
Pig, plus shoe statistics — all derived from one pure engine and unit tested.

**Platform** — landscape and portrait layouts, high-DPI, instant resize with no stretching,
keyboard shortcuts (`1–9` chips, `U` undo, `R` repeat, `D` double, `C` clear, `M` mute),
auto-pause when the tab is hidden.

---

## Reference video

The task referenced an attached gameplay video; no video file was present in this
environment, and nothing in the repository or connected storage matched it. The flow,
timings and layout here follow modern online-casino convention (the fallback the brief
specifies) rather than a specific reference. Every timing, colour, payout, limit and layout
constant is in `src/game/Config.ts` and changeable at runtime through `updateConfig()`, so
matching a specific reference is a config exercise, not a code change — see
[docs/ASSET_MANIFEST.md](docs/ASSET_MANIFEST.md) and `docs/ARCHITECTURE.md`.

---

## Layout of the source

```
src/
  index.ts                  Public API surface
  main.ts                   Standalone bootstrap
  react/BaccaratGameView.tsx  Optional React wrapper
  game/
    BaccaratGame.ts         Facade: init/destroy/pause/resume/resize/reset/updateConfig
    SceneManager.ts         Scene ownership and cross-fades
    AssetLoader.ts          Atlas baking, fonts, external overrides
    Config.ts               Every tunable + deep merge
    Constants.ts            Structural constants
    GameContext.ts          The dependency bundle injected everywhere
    events.ts               Internal event catalogue
    types.ts                Domain model
    core/                   StateMachine, ObjectPool, ServiceContainer
    scenes/                 Scene base, Boot, Loading, Game
    objects/                Card, Deck, Chip, ChipStack, BettingSpot, ChipTray,
                            Timer, RoadMap, ScoreBoard, InfoBar, ResultBanner, Button
    managers/               Animation, Audio, Bet, Card, Game, History,
                            Input, Resize, Roadmap
    rules/                  BaccaratRules, RoadmapEngine (+ their tests)
    net/                    protocol, LocalRngAdapter, SocketAdapter
    utils/                  EventBus, Helpers, MathUtils, Logger, AtlasFactory
```

## Licence

Proprietary — internal project.
