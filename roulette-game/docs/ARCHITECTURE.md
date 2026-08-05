# Architecture

## Layering

Dependencies point downward only. Nothing in a lower layer imports from a higher one.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  HOST                                                                    │
│  React / Vue / plain DOM / standalone main.ts                            │
│  Sees exactly nine methods + the event bus.                              │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │  init · destroy · pause · resume · resize
                                │  reset · updateConfig · setTheme · setLanguage
┌───────────────────────────────▼──────────────────────────────────────────┐
│  Game/Game.ts                                                            │
│  Owns the PixiJS Application, the ticker and every service below.        │
│  The only class that knows a host exists.                                │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        │                                               │
┌───────▼─────────────┐                    ┌────────────▼──────────────────┐
│  SceneManager       │                    │  GameContext (DI seam)        │
│  One live scene.    │                    │  app · bus · animations       │
│  Covered swaps.     │                    │  audio · resize · textures    │
└───────┬─────────────┘                    │  localization · config · theme│
        │                                  └────────────┬──────────────────┘
        │  Boot ─► Loading ─► Roulette                  │ injected into
        │                                               │ every scene
┌───────▼───────────────────────────────────────────────▼──────────────────┐
│  Scenes/RouletteScene.ts                                                 │
│  Layout solver + assembly. Owns the game-specific managers, because      │
│  their lifetime is exactly the table's lifetime.                         │
└───────┬──────────────────────────────────────────┬───────────────────────┘
        │                                          │
┌───────▼──────────────────────┐      ┌────────────▼──────────────────────┐
│  MANAGERS (logic)            │      │  OBJECTS / UI (view)              │
│  GameManager   state machine │      │  Wheel  Ball  Chip                │
│  BetManager    wagers ┄no Pixi      │  BettingBoard  WinningMarker      │
│  HistoryManager stats ┄no Pixi      │  HistoryPanel                     │
│  WheelManager  simulation    │◄────►│  Button ChipTray ControlBar Hud   │
│  ChipManager   pooling       │      │                                   │
│  AnimationManager  GSAP      │      │  Passive: they render what they   │
│  AudioManager  Web Audio     │      │  are told and raise callbacks.    │
│  ResizeManager layout        │      │  They hold no game state.         │
│  InputManager  keys/gestures │      └───────────────────────────────────┘
└───────┬──────────────────────┘
        │
┌───────▼──────────────────────────────────────────────────────────────────┐
│  UTILITIES + TYPES                                                       │
│  EventBus · Math · Helpers · Logger · Types (zero runtime imports)       │
└──────────────────────────────────────────────────────────────────────────┘
```

## The three rules

**1. Logic never imports Pixi.**
`BetManager`, `HistoryManager`, `TableLayout` and `Types` contain no rendering code at all.
They can run headless — in a test, in Node, or on a server that wants to reuse the payout
maths. `GameManager` is nearly there: it reaches presentation only through injected
callbacks (`PresentationDrivers`).

**2. Views hold no state.**
`BettingBoard` does not know what has been bet on it; it hit-tests a pointer and raises a
callback. `Hud` does not know the balance; it is told. The authoritative copy lives in one
manager, and views re-render from the snapshot published on the bus. Two components can
therefore never disagree — there is only one copy to disagree with.

**3. Everything crosses the bus.**
Modules do not hold references to each other for notification purposes. `BetManager` emits
`BETS_CHANGED`; the scene, the chips and the HUD all react. Adding a listener requires no
change to the emitter, which is exactly why a backend can be dropped in without touching
view code.

## Dependency injection

`GameContext` is the seam. Every scene receives one and reaches for nothing global:

```ts
export interface GameContext {
  readonly app: Application;
  readonly bus: EventBus;
  readonly animations: AnimationManager;
  readonly audio: AudioManager;
  readonly resize: ResizeManager;
  readonly textures: TextureFactory;
  readonly localization: Localization;
  config: GameConfig;
  theme: Theme;
}
```

A scene can be instantiated in isolation with stubs for any of these. `GameManager` takes
the same approach one level down, receiving its presentation callbacks rather than importing
the scene.

## Ownership and teardown

Ownership is strictly hierarchical, and teardown runs in reverse construction order:

```
Game.destroy()
  ├─ ticker.remove(tick)          stop the frame loop first
  ├─ SceneManager.destroy()       scenes hold manager references
  │    └─ RouletteScene.destroy()
  │         ├─ GameManager  (clears timers, unsubscribes)
  │         ├─ WheelManager (kills tweens, orphans in-flight spins)
  │         ├─ ChipManager  (returns pool, destroys chips)
  │         └─ bus.offAll(this)
  ├─ InputManager.destroy()       DOM listeners
  ├─ ResizeManager.destroy()      observers + rAF
  ├─ AudioManager.destroy()       closes the AudioContext
  ├─ AnimationManager.destroy()   kills every tracked tween
  ├─ AssetLoader.destroy()        ref-counted; unloads at zero
  ├─ TextureFactory.destroy()     destroys every baked texture
  ├─ app.destroy()                releases the WebGL context
  └─ uninstallFonts()             ref-counted; uninstalls at zero
```

Reversing any of this would destroy a resource something still holds.

### Shared globals are reference counted

Three things in PixiJS are **page-global**, not per-application: bitmap fonts, the `Assets`
cache, and GSAP's registered eases. Two engine instances on one page share them, so the
first instance to be destroyed must not release them.

- `Fonts.ts` counts references and uninstalls only at zero.
- `AssetLoader` counts references per alias and unloads only at zero.
- `AnimationManager` registers eases once and never removes them (they are stateless).

This is not theoretical — mounting two tables and unmounting one reproduces the fault
immediately, and the smoke test covers it.

## Round flow

```
GameManager (locally driven)              RouletteScene (presentation)
─────────────────────────────             ────────────────────────────
ROUND_START ─────────────────────────────► reset felt
openBetting() ───────────────────────────► board interactive, timer shown
  update() ticks the countdown ─────────► SYNC_TIMER ─► HUD ring
  threshold reached ─────────────────────► LAST_CALL ─► urgent styling
closeBetting() ──────────────────────────► board locked, "no more bets"
                    preSpinDelay
spinTo(n)
  ├─ drivers.spin(n, roundId) ───────────► WheelManager.spin()
  │                                          accelerate ─► track ─► drop
  │                                          BALL_DROP emitted mid-way
  │                                       ◄── resolves when seated
  ├─ WIN_NUMBER ───────────────────────────► glow, dolly, banner, history
  │                    winnerHoldDuration
  ├─ bets.resolve() + settle()
  ├─ PAYOUT ────────────────────────────────► dim losers, sweep, collect
  ├─ drivers.payout(result) ◄───────────────  resolves when chips land
  │                    resultDuration
  ├─ drivers.cleanup() ─────────────────────► clear board, hide marker
  └─ ROUND_END ─────────────────────────────► loop
```

In server-driven mode the left column is replaced by socket frames. The right column does
not change at all — see [BACKEND.md](BACKEND.md).

## Why scenes at all

There are only three, and the table is the only interesting one. They exist because boot,
loading and play have genuinely different resource profiles: boot must paint before fonts
exist, loading must show progress while the expensive wheel texture bakes, and the table
needs everything ready. `SceneManager` swaps under an opaque curtain so a heavy `init()`
never shows as a stutter, and serialises switches so two scenes are never briefly alive.
