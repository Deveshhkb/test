# Performance guide

The target is a steady 60 FPS on mid-range mobile. This document lists what the engine does
to get there and — more usefully — the rules that keep it true as the code grows.

---

## 1. Nothing allocates inside the frame loop

Garbage collection during a deal is the most common cause of a visible hitch. Every object
that appears repeatedly is pooled and reset rather than recreated.

| Pool         | Prewarm | Cap | Where                       |
| ------------ | ------- | --- | --------------------------- |
| `Card`       | 12      | 24  | `CardManager`               |
| `Chip`       | 24      | 96  | `GameScene`                 |
| Particles    | lazy    | 34  | `ResultBanner`              |
| Road markers | lazy    | —   | `RoadPanel` (grown, never shrunk) |

The contract that makes recycling safe is `onRelease()`: it kills the instance's tweens,
detaches it from its parent and resets every mutable property. A pooled object also guards
`onRelease()` with `if (this.destroyed) return`, so a teardown-ordering mistake degrades
instead of throwing.

> **Rule:** if you add a display object that appears more than a few times per round, pool
> it, and reset *everything* you mutate.

---

## 2. Few base textures

75 texture frames sit on **6 base textures** — one page each for cards, chips and road
markers, plus three gradients. Sprites sharing a base texture batch into a single draw
call, so a table showing 6 cards, 40 chips and 200 roadmap marks costs a handful of calls
rather than hundreds.

> **Rule:** new artwork goes into an existing atlas page. A one-off `Texture.from(url)`
> silently breaks the batch for everything drawn after it.

---

## 3. BitmapText for anything that changes

Pixi's `Text` re-rasterises to a canvas and re-uploads to the GPU on every content change.
A countdown doing that at 10 Hz is a measurable cost; a rolling balance counter at 60 Hz is
a serious one.

Everything dynamic — countdown, hand totals, balance, bet totals, chip labels — is
`BitmapText` drawn from a pre-rasterised glyph set. Plain `Text` is used in exactly two
places: baking the atlas (once) and the boot screen (before fonts exist).

> **Rule:** dynamic string → `BitmapText`. Add missing glyphs to `AssetLoader.installFonts()`.

---

## 4. Graphics are drawn on change, not per frame

`Graphics.clear()` followed by redraw rebuilds geometry and re-uploads it. Two places would
naïvely do this every frame, and both are throttled:

- **The countdown ring** redraws only when the sweep moves by more than ~1/720 of a turn,
  and on the colour change at `urgentSeconds`.
- **Betting spots** redraw on state change (hover, lock, stake) — never on a tick.

> **Rule:** if a `Graphics` needs to change continuously, tween a `Sprite`'s transform
> instead. Transform changes are free; geometry rebuilds are not.

---

## 5. One layout pass per frame, at most

`ResizeManager` coalesces bursts of resize events through `requestAnimationFrame`, and skips
the pass entirely when width, height and DPR are unchanged. A window drag therefore produces
one layout per frame rather than one per event.

Device pixel ratio is capped at `renderer.maxResolution` (default 2). Uncapped, a 3× phone
renders 2.25× the pixels of a 2× one for no visible benefit.

---

## 6. All animation is owned

Every tween goes through `AnimationManager`, which tracks it, applies the global speed
multiplier, and can pause or kill the entire set. This is a performance property as much as
a correctness one: a paused game runs no tweens at all, and `destroy()` cannot leave an
orphaned tween writing to a destroyed transform.

`track()` **chains** onto a caller-supplied `onComplete` instead of replacing it — replacing
it deadlocks every promise-based sequence in the engine.

> **Rule:** never `import gsap` outside `AnimationManager`.

---

## 7. Roadmaps re-render without allocating

The five roads can hold several hundred marks and re-render on every settled coup.
`RoadPanel.render()` walks a sprite array, reassigning texture and position, and hides the
tail rather than destroying it. `RoadmapEngine.snapshot()` memoises until history changes,
so repeated reads (resize, config change) are free.

---

## 8. Cheap idle

Between coups the table runs one looping breathe tween on the shoe. There is no particle
system, no shader animation and no per-frame `Graphics` work in `WAITING`.

---

## Measuring

```ts
game.updateConfig({ features: { debugOverlay: true } });

// in the console
game.context.animation.activeCount;   // live tweens — should return to ~1 when idle
game.context.assets;                  // texture inventory
```

Chrome DevTools → Performance: look for **long GC pauses during dealing** (a pooling leak)
and **sawtooth heap growth while idle** (a per-frame allocation).

A quick leak check: mount, play a few rounds, `destroy()`, repeat. `activeCount` should
return to zero and the WebGL context count should not grow.

---

## Tuning for low-end devices

```ts
game.updateConfig({
  assets:   { atlasResolution: 1 },      // quarter the atlas memory
  renderer: { antialias: false, maxResolution: 1.5 },
  features: { particles: false, squeezeReveal: false },
  table:    { maxVisibleChipsPerSpot: 6 },
  animation:{ speedMultiplier: 0.85 },   // shorter animations, less overlap
});
```

`maxVisibleChipsPerSpot` is the important one for a busy table: above the cap the stack
stops adding sprites and lets the total badge carry the information, so a whale's bet costs
the same as a minimum one.

---

## Known costs

| Operation                     | Cost                    | When                       |
| ----------------------------- | ----------------------- | -------------------------- |
| Baking the procedural atlas   | ~120 ms @2×             | Once at boot               |
| Installing bitmap fonts       | ~40 ms                  | Once at boot               |
| Atlas rebuild                 | ~120 ms                 | Only on a theme/chip change |
| Roadmap re-render (200 marks) | < 1 ms                  | Once per settled coup      |
| Full layout pass              | < 2 ms                  | Per resize frame           |

The two boot costs happen behind the loading screen, which is why the loading screen exists.

## Verified in this environment

The unit suite, typecheck and type-aware lint pass clean. An automated browser run drives
every on-screen control with **real pointer clicks on the canvas** — chip stepper, all three
wager bands, undo / double / clear, the results list, the paytable, mute, the Deal button,
and the lifecycle API — and asserts the resulting state, including that the balance after a
coup equals stake plus settlement to the cent. All 18 checks pass with zero console errors,
and `destroy()` leaves no canvas behind.

Frame-rate numbers were **not** validated here: the available browser runs on a software
rasteriser (SwiftShader), so any FPS figure it produces reflects the CPU renderer, not the
GPU path this guide describes. Measure on target hardware before quoting a number.
