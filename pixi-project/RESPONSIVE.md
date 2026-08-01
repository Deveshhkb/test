# Responsive & multi-platform system

A single build targets desktop, laptop, tablet, Android phones, iPhone, iPad and
foldables, in Chrome, Edge, Firefox and Safari, in both orientations — with no
per-device code paths and no page reload on rotation.

> **Framework note:** this repository is a **PixiJS v8** game, not Phaser. The
> requirements below are framework-agnostic (responsive canvas, layout manager,
> orientation handling, DPR, input guards); they are implemented natively in
> Pixi. Nothing here depends on Pixi-specific behaviour beyond the renderer
> resize call and the display list, so the same architecture ports to Phaser by
> swapping `LayoutManager.resizeRenderer()` and the container base class.

---

## Architecture

```
src/
  config/LayoutConfig.ts     design constants, breakpoints, region carving, theme
  core/
    DeviceInfo.ts            device class, orientation, DPR, safe area, fold, low-power
    LayoutManager.ts         the responsive engine + LayoutContext
    ResponsiveContainer.ts   base class: auto-registers every object for layout
    Viewport.ts              uniform-scaled game world + cover-scaled background
    InputGuards.ts           scroll/zoom/selection/keyboard guards, fullscreen
    TextureUtils.ts          texture size capping for low-end GPUs
    DebugOverlay.ts          F2 overlay: metrics + region outlines
    geom.ts                  Rect (carving), clamp, fit/cover scale
  ui/                        TopBar, BetPanel, HistoryPanel, UIButton, ChipButton
  game/                      GameBoard (design space), GameScene (wiring)
  state/GameState.ts         balance, bets, history
```

### The one rule

Everything visual extends **`ResponsiveContainer`** and implements
`onLayout(ctx)`. Registration with the `LayoutManager` happens automatically
when the object is added to a parent and is removed when it is detached or
destroyed. A new popup, panel, button or scene is therefore responsive by
default — there is no separate "add resize handling" step, and no listener can
leak.

```ts
class MyPopup extends ResponsiveContainer {
  protected onLayout(ctx: LayoutContext) {
    const r = ctx.regions.game;              // never hardcoded pixels
    this.position.set(r.centerX, r.centerY);
    this.scale.set(ctx.uiScale);
    this.setHitArea(200, 60, ctx);           // grown to ctx.minTouch on phones
  }
}
```

### `LayoutContext`

One immutable snapshot handed to every object per pass:

| field | meaning |
| --- | --- |
| `width` / `height` | stage size in CSS px (from `visualViewport`, so mobile browser chrome is excluded) |
| `resolution` | renderer resolution actually in use (capped DPR) |
| `devicePixelRatio` | raw DPR before capping |
| `orientation` | `portrait` \| `landscape`, derived from the render box |
| `device` | `phone` \| `tablet` \| `desktop` |
| `mode` | `desktop`, `tablet-landscape`, `tablet-portrait`, `mobile-landscape`, `mobile-portrait` |
| `safeArea` | `env(safe-area-inset-*)` — notches, home indicator |
| `fold` | hinge rectangle on dual-screen/foldable devices, else `null` |
| `uiScale` | multiplier for UI authored at 1280×720 (clamped 0.55–1.3) |
| `minTouch` | 48 px on phones, 44 on tablets, 28 with a mouse |
| `regions` | non-overlapping panel rectangles (see below) |
| `px/wp/hp/font` | helpers: scaled length, % of width/height, clamped font size |

### Regions: why UI cannot overlap

`computeRegions()` starts from the safe-area rectangle and *carves* slices off
it — `carveTop`, `carveLeft`, `carveRight`, `carveBottom`. Each panel gets a
disjoint rectangle by construction, so "no overlapping UI" is a property of the
algorithm rather than something re-checked per breakpoint.

| mode | top bar | history | bet panel | game |
| --- | --- | --- | --- | --- |
| `desktop` | full width | left column (15 %, 170–300 px) | right column (20 %, 240–380 px) | centre |
| `tablet-landscape` | full width, thinner | left column (14 %) | right column (21 %) | centre |
| `mobile-landscape` | thin (13 %, 34–58 px) | drawer, collapsible | right column (30 %, 150–260 px) | centre, uses the extra width |
| `tablet-portrait` | full width | peek dock + drawer | bottom strip (32 %, 190–400 px) | upper area |
| `mobile-portrait` | full width, compact | peek dock + drawer | bottom strip (38 %, 160–340 px) | upper area |

Bars are additionally floored at `minTouch + 10 px`, so a button can never be
clipped by the bar it lives in on a short screen.

**Portrait "peek" dock.** The board is a wide strip, so in portrait it is
width-bound and cannot use the full height. Rather than leaving dead space,
`carvePeek()` gives the play area exactly the height the board needs and hands
the remainder to a collapsed history dock. Tapping it (or the top-bar button)
expands the full list as a drawer with a scrim.

Sizes are always `clamp(min, fraction × viewport, max)` — never fixed pixels.
On a foldable, `avoidFold()` moves the board onto the larger display segment so
nothing lands in the hinge.

### The game world never stretches

The board is authored once in a fixed design space (`Viewport.world`) and
scaled by **one uniform factor** that *fits* it into `regions.game`. Identical X
and Y scale means graphics can never be squashed. The background is a separate
layer scaled with **cover**, so the spare space around a fitted board is filled
with artwork instead of black bars.

The design space is the board artwork's **opaque content box**, not the image
file: `bord.png` carries ~16 % transparent padding vertically (measured from its
alpha channel and recorded in `BOARD_CONTENT`), and fitting the padded file
would waste that much of the play area on every screen. In-world coordinates are
still written as fractions of the texture and converted with
`designX()` / `designY()`.

In portrait the world is anchored towards the top of its region rather than
centred, so the board sits directly under the status bar.

In-world text is re-rasterised at `renderer resolution × world scale`, so it
stays crisp when the world scales up on a large monitor.

---

## Resize handling

All of these funnel into the same coalesced path:

| event | source |
| --- | --- |
| window resize | `window: resize` |
| device rotation | `orientationchange` + `screen.orientation: change`, with two follow-up passes because mobile browsers report stale metrics on the event itself |
| fullscreen enter/exit | `fullscreenchange`, `webkitfullscreenchange` |
| browser / pinch zoom | `visualViewport: resize` and `scroll` |
| DPR change (zoom, monitor switch) | `matchMedia('(resolution: Ndppx)')`, re-armed after each change |
| container resize | `ResizeObserver` on `#pixi-container` |
| tab becoming visible again | `visibilitychange` |

**Cost control.** Every event calls `requestUpdate()`, which coalesces into a
single `requestAnimationFrame`. Inside, a *signature* of
`width|height|resolution|safeArea|fold` is compared with the previous pass and
the whole layout is skipped when nothing changed — so a rotation storm of a
dozen identical resize events costs one layout, not twelve. `onModeChange`
fires only when the mode or orientation actually flips.

Nothing reloads the page; layout is recomputed in place.

---

## Input

`InputGuards.ts` (plus `public/style.css`) prevent:

- page scrolling / rubber-banding — `touch-action: none`, `overscroll-behavior: none`,
  `position: fixed` body, `touchmove` `preventDefault` on the game surface
- double-tap zoom — `touchend` within 320 ms is cancelled
- pinch zoom — Safari `gesturestart/change/end` and ctrl+wheel
- text selection and image drag — `selectstart`, `dragstart`, CSS `user-select`
- long-press context menu — `contextmenu` on the canvas
- arrow/space/page-key page scrolling — cancelled unless a form field is focused

Supported input: touch (including multi-touch, since Pixi tracks pointers
independently), mouse (hover states), and keyboard on desktop —
`1`–`5` select a chip, `D`/`T`/`G` bet, `C` clear, `R` repeat, `H` history,
`F` fullscreen, `F2` debug overlay.

Hit areas are explicit `Rectangle`s regenerated on every layout pass and grown
to `ctx.minTouch`, so touch targets never shrink below 48 px on phones even
when the artwork does.

---

## Performance

- **Render resolution is capped**: 2.5× normally, **1.5× on low-end devices**
  (`deviceMemory ≤ 2` or `hardwareConcurrency ≤ 4`), which is where most of the
  fill-rate cost on cheap Android hardware comes from. Antialiasing and
  `powerPreference` follow the same signal.
- **Texture size is capped** at 2560 px (1536 px on low-end devices).
  The source background is 10342×4500 — larger than `GL_MAX_TEXTURE_SIZE` on
  most phones, and ~186 MB of VRAM. `loadScaledTexture()` downsamples it during
  load, so it uploads and renders everywhere.
- **Layout passes are rAF-coalesced and change-gated** (see above).
- Panels redraw their `Graphics` only during a layout pass, never per frame.

---

## Verifying

```bash
npm run verify:responsive          # build + headless sweep
npm run verify:responsive -- --shots   # also write .responsive-shots/*.png
```

The sweep boots the production build in headless Chromium and, for **every
required resolution × portrait/landscape × DPR 1/2/3**, asserts:

- the canvas CSS box exactly equals the viewport (no black borders)
- the backing store equals CSS size × render resolution (Retina sharpness)
- the board's aspect ratio matches the design box within 0.02 (nothing stretched)
- the board is fully inside its region (nothing clipped)
- docked regions do not overlap
- no two tagged UI elements overlap, and none crosses the safe-area edge
- every control's hit area is at least `minTouch`
- resizing the viewport live bumps the layout revision — i.e. rotation
  re-lays out **without a reload** — and all checks still pass afterwards

Resolutions covered: 320×568, 375×667, 390×844, 414×896, 768×1024, 1024×768,
1280×720, 1366×768, 1920×1080, 2560×1440.

Objects opt into the sweep by setting `label = "probe:<name>"`; `window.__game`
exposes the read-only geometry the script inspects.

The script prefers a Chromium already on the machine (`CHROMIUM_PATH`, then
`/opt/pw-browsers/chromium`) before Playwright's bundled download.

---

## Adding new UI

1. Extend `ResponsiveContainer` and implement `onLayout(ctx)`.
2. Position from `ctx.regions.*`, `ctx.wp/hp`, or anchors — never fixed pixels.
3. Size text with `ctx.font(size)` and controls with `ctx.px(size)`.
4. Call `this.setHitArea(w, h, ctx)` on anything interactive.
5. If it needs its own docked space, add a `carve*` call in `computeRegions()`
   so it stays disjoint from the other panels.
6. Tag it `label = "probe:<name>"` to include it in the automated sweep.
