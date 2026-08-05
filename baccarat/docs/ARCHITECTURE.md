# Architecture

## The one rule

**Logic never imports presentation, and presentation never imports logic.** They meet on a
typed event bus. Everything else in this document follows from that.

---

## Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HOST                 React app  ·  plain page  ·  native shell         │
│                              │ init / destroy / pause                    │
└──────────────────────────────┼──────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  FACADE               BaccaratGame                                      │
│    owns the Pixi Application, builds the GameContext, is the only        │
│    public surface. Nothing above it knows Pixi or GSAP exists.           │
└──────────────────────────────┬──────────────────────────────────────────┘
                               ▼
┌───────────────────────────┐     ┌──────────────────────────────────────┐
│  ORCHESTRATION            │     │  PRESENTATION                        │
│    GameManager  ◄─ FSM    │     │    SceneManager                      │
│    BetManager             │     │      BootScene                       │
│    CardManager            │────►│      LoadingScene                    │
│    HistoryManager         │ bus │      GameScene ─┬─ BettingSpot       │
│    RoadmapManager         │◄────│                 ├─ Card / Deck       │
│    AnimationManager       │     │                 ├─ Chip / ChipStack  │
│    AudioManager           │     │                 ├─ ChipTray / Button │
│    InputManager           │     │                 ├─ Timer / InfoBar   │
│    ResizeManager          │     │                 ├─ RoadMap           │
└───────────┬───────────────┘     │                 └─ ScorePlate/Banner │
            │                     └──────────────────────────────────────┘
            ▼
┌───────────────────────────┐     ┌──────────────────────────────────────┐
│  DOMAIN (pure)            │     │  TRANSPORT                           │
│    BaccaratRules          │     │    NetworkAdapter (interface)        │
│    RoadmapEngine          │     │      LocalRngAdapter  (in-process)   │
│    no Pixi, no I/O,       │     │      SocketAdapter    (WS/Socket.IO) │
│    fully unit tested      │     │                                      │
└───────────────────────────┘     └──────────────────────────────────────┘
```

---

## GameContext — the composition root

Every manager, scene and display object receives one object:

```ts
interface GameContext {
  config: GameConfig;          // mutable — updateConfig() swaps it in place
  metrics: ViewportMetrics;    // updated by ResizeManager each layout pass
  readonly app, bus, services, assets, state;
  readonly animation, audio, bets, cards, history, roadmaps, resize, input, network;
}
```

No module imports a sibling manager and nothing reaches for a singleton. `GameContext.ts`
uses type-only imports, so this convenience carries no runtime import cycle.

Consumers read `ctx.config` **at the point of use** rather than caching it — that is what
makes `updateConfig()` take effect without a rebuild.

---

## Ownership and teardown

Lifetimes are strictly nested, and `destroy()` unwinds them in the reverse of construction:

```
BaccaratGame
├── Application (WebGL context, ticker)
├── AssetLoader        → atlases, bitmap fonts
├── AnimationManager   → every GSAP tween the engine ever created
├── AudioManager       → AudioContext and its node graph
├── InputManager       → window/document/host listeners
├── ResizeManager      → ResizeObserver + window listeners
├── NetworkAdapter     → sockets, timers
├── SceneManager       → the active Scene → its display list
└── managers (bet/card/history/roadmap) → pools
```

Three invariants make teardown leak-free:

1. **All animation goes through `AnimationManager`.** Nothing calls `gsap` directly, so
   `killAll()` genuinely kills everything — no callback can fire into a destroyed stage.
2. **Scenes own their subscriptions.** `Scene.track(disposer)` registers every listener and
   shortcut; `Scene.destroy()` runs them all.
3. **Cards are drained before the scene that parents them is destroyed.** Pooled objects
   also guard `onRelease()` with `if (this.destroyed) return`, so ordering mistakes degrade
   instead of throwing.

---

## Rendering structure

The scene positions children in **design space** and scales itself once:

```
scale        = min(width / designWidth, height / designHeight)   // never stretches
designWidth  = width / scale                                     // real, usable space
```

Because the reported design viewport is the *full visible area* rather than a fixed
1920×1080 box, an ultrawide monitor produces a wider table instead of pillarboxes, and
layout code anchors to edges rather than to a hard-coded canvas.

Z-order is explicit (`Constants.Depth`), one layer per concern:

```
Background → TableFelt → Betting → Chips → Cards → Effects → HUD → Roadmap → Controls → Overlay
```

---

## Why the round is a state machine

An out-of-order network message — a late `RESULT` after a reconnect, a `ROUND_START` while
the previous coup is still animating — is the classic way a live table corrupts itself. The
FSM refuses illegal transitions in one place instead of every consumer defending itself, and
the deal sequence is guarded by a **round token**: each `await` re-checks it, so an
abandoned round stops mid-flight rather than animating into the next one.

See [STATE_MACHINE.md](STATE_MACHINE.md).

---

## Data flow for one coup

```
LocalRngAdapter / socket
   │  ROUND_START ─────────────► GameManager ──► BetManager.beginRound
   │  BETTING_OPEN ────────────► FSM: BETTING_OPEN ──► bus "round:bettingOpen"
   │                                                     └─► Timer, spots unlock
   │  ◄──────── PLACE_BET ────── BetManager  ◄── BettingSpot tap
   │  BET_ACCEPTED ────────────► BetManager.applyServerBets (reconciliation)
   │  BETTING_CLOSED ──────────► FSM: BETTING_CLOSED ──► spots lock
   │  DEAL_CARD ×n (buffered)
   │  RESULT ──────────────────► GameManager.onResult
   │                               ├─ FSM: DEALING     → CardManager.deal ×4
   │                               ├─ reveal player, reveal banker
   │                               ├─ FSM: PLAYER_DRAW / BANKER_DRAW → squeeze
   │                               ├─ FSM: RESULT      → highlight, RoadmapManager.record
   │                               └─ FSM: PAYOUT      → BaccaratRules.settle
   │  BALANCE_UPDATE ──────────► BetManager.setBalance (server is authoritative)
   │  ROUND_END                    FSM: RESET → collect cards → WAITING
```

The client computes settlement locally **for presentation only**; the balance always comes
from the server via `BALANCE_UPDATE`, so the two can never silently disagree.

---

## Extension points

| I want to…                     | Do this                                                          |
| ------------------------------ | ---------------------------------------------------------------- |
| Use a real backend             | Implement `NetworkAdapter`, pass `options.createNetworkAdapter`   |
| Add a side bet                 | Add to `BetType`, `payouts`, `limits`, a case in `settleOne`, and one line in `GameScene.buildSpots` |
| Reskin                         | `config.theme` + `config.assets.atlasUrl`                        |
| Change pacing                  | `config.timing` and `config.animation` (incl. a global speed multiplier) |
| Replace the scoreboard         | Subscribe to `roadmap:updated`, render it yourself, `features.roadmaps: false` |
| Swap the audio backend         | Register your own implementation in the `ServiceContainer`        |
