# Performance

Target: **60 FPS**, flat frame time over a session of thousands of rounds, no growth in
memory or draw calls.

## The frame budget

Per frame the engine does almost nothing:

```
Game.tick(ticker)
  └─ SceneManager.update(dt)
       └─ RouletteScene.update(dt)
            ├─ WheelManager.update(dt)    ~15 float ops + 3 transform writes
            └─ GameManager.update(dt)     one subtraction + a comparison
```

Everything else is event-driven. The board redraws on layout, theme and language changes —
never per frame. The HUD redraws on value changes. GSAP drives the rest from its own ticker.

**No allocation in the hot path.** `WheelManager.update` touches only pre-existing number
fields (`wheelMotion.speed`, `dropMotion.offset`, …). Ball trail samples live in a
pre-allocated ring buffer. The maths helpers in `Utilities/Math.ts` take and return numbers
— no vectors, no objects, no closures.

## Delta clamping

```ts
const deltaSeconds = Math.min(ticker.deltaMS, 50) / 1000;
```

Beyond 50 ms the browser has stalled — a GC, a tab switch, a blocked main thread — and
integrating the real delta would teleport the ball rather than animate it. Slowing down is
always preferable to a discontinuity.

The trade-off is explicit: below 20 FPS the game runs in slow motion rather than skipping.
That is the right call, because a device sustaining 15 FPS has worse problems than pacing.
GSAP's `lagSmoothing(500, 33)` does the same job for tweens.

## Texture baking

Every procedural visual is drawn **once** into a GPU texture and thereafter used as a
`Sprite`.

A `Graphics` object re-tessellates whenever its geometry is dirtied. The wheel head is a
37-wedge drawing with frets and 37 rotated labels — thousands of triangles. Rotating a baked
sprite is one quad. The expensive bakes happen during `LoadingScene`, behind the progress
bar, so the first round never hitches.

Textures are pinned to an explicit frame (`bake(key, build, size)`). Without it
`generateTexture` crops to the content bounding box, and two textures meant to be concentric
would bake at different sizes and be scaled by different factors — which is exactly the bug
that inflated the pocket ring over the ball track during development.

## Object pooling

`ChipManager` allocates 48 chips at warm-up and recycles them forever. A round that places
and clears 60 chips allocates **zero** objects afterwards. Release kills any tween still
pointing at the instance — otherwise a recycled chip inherits the previous owner's animation,
which is a genuinely confusing bug to chase.

The ball's trail is six pooled sprites over a ring buffer, sampled every second frame.

## Draw calls

- **BitmapText everywhere it changes.** Board numbers, the countdown, history badges and the
  balance are `BitmapText` over one shared atlas. As `Text` each would rasterise a canvas and
  upload a texture on every change — dozens of uploads per second during a countdown.
- **Layers batch.** Chips share one texture per denomination and one parent, so a full felt
  is a handful of draw calls, not one per chip.
- **Highlights are separate thin `Graphics`.** Hovering re-tessellates a two-rectangle
  overlay, not the 150-cell board underneath.

## Filters

Filters cost a render-target switch every frame they are active. The engine uses exactly one
— motion blur on the wheel head — and it is **attached and detached**, not left at strength
zero:

```ts
if (quantised <= 0) { this.head.filters = []; return; }
```

Its strength is quantised to whole pixels so a slowly-changing speed does not invalidate the
filter cache every frame.

Glows are pre-baked radial textures that get tinted and scaled — not blur filters.

## Redraw quantisation

The countdown ring is the only continuously-changing vector in the game. It is quantised to
whole percent, so a 25-second countdown re-tessellates ~100 times rather than ~1,500.

## Resolution

Backing-store resolution is capped at `min(devicePixelRatio, render.maxResolution)`, default
2. Rendering a phone at its native 3× triples fragment cost for a difference almost nobody
can see. Resolution is only reassigned when it actually changes — reassigning rebuilds the
backing texture and drops a frame.

## Resize coalescing

`ResizeManager` watches four independent signals — `ResizeObserver`, `window.resize`,
`orientationchange` and a `matchMedia` DPR query — and coalesces them into at most **one**
measurement per animation frame. Safe-area insets are read through a DOM probe on resize
only, never per frame.

## Memory and leaks

`destroy()` is exhaustive and ordered (see [ARCHITECTURE.md](ARCHITECTURE.md)). The specific
hazards handled:

| Hazard | Handling |
| --- | --- |
| GSAP holding destroyed Pixi objects | `AnimationManager` tracks every animation and kills all on teardown |
| Bus subscriptions outliving views | Owner-tagged subscriptions, `bus.offAll(this)` in every `destroy()` |
| WebGL contexts accumulating | `app.destroy({ removeView: true }, { texture: true })` |
| Bitmap fonts shared across instances | Reference counted; uninstalled at zero |
| `Assets` cache shared across instances | Reference counted per alias; unloaded at zero |
| Baked textures | Owned by `TextureFactory`, destroyed with it |
| DOM listeners, observers, rAF | Removed in `InputManager` / `ResizeManager` teardown |
| Pending timers mid-round | `GameManager` cancels every in-flight wait |

The smoke test mounts and destroys five engines and asserts the canvas count returns to its
starting value.

## Auto-pause

A hidden tab throttles `requestAnimationFrame` to roughly 1 Hz. `InputManager` watches
`visibilitychange` and pauses the ticker, tweens and audio context, so a backgrounded table
costs nothing and cannot be handed a multi-second delta on return.

## Measuring

```ts
createRouletteGame({ render: { showStats: true } });   // FPS overlay
```

```js
game.app.ticker.FPS
game.app.renderer.textureGC.count
```

Software rendering (SwiftShader in CI) will report ~10 FPS. That is the renderer, not the
engine — measure on real hardware.
