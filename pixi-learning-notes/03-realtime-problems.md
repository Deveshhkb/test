# 03 — Real-World Problems (and how to fix them)

> These are the actual problems every Pixi game developer hits in production.
> Interviewers love asking these because they separate "did a tutorial" from
> "shipped a game". Several of these already exist in your `pixi-project/main.ts`.

---

## Problem 1 — The game breaks on resize / different screens

**Symptom:** Layout looks perfect on your monitor, broken on a laptop, terrible
on mobile. Positions like `bettPanel.position.set(180, 65)` are hardcoded pixels.

**The standard fix: design at a fixed virtual resolution, scale to fit.**

```ts
const DESIGN_W = 1280;
const DESIGN_H = 720;

const root = new Container(); // put ALL layers inside this one container
app.stage.addChild(root);

function resize() {
  const scale = Math.min(app.screen.width / DESIGN_W, app.screen.height / DESIGN_H);
  root.scale.set(scale);
  // center it (letterbox)
  root.x = (app.screen.width  - DESIGN_W * scale) / 2;
  root.y = (app.screen.height - DESIGN_H * scale) / 2;
}

window.addEventListener("resize", resize);
resize();
```

Now you lay out everything in 1280×720 coordinates forever and never think
about screens again.

- `Math.min` = "fit" (letterbox, everything visible) — use for game UI.
- `Math.max` = "cover" (fills screen, edges cropped) — use for backgrounds.
- Portrait mobile? Either a separate portrait layout, or a "rotate your device" overlay — real casino games do one of these.

---

## Problem 2 — Memory keeps growing (long sessions crash on mobile)

Casino players keep the game open for hours. The classic leak trio:

**Leak 1: removing without destroying**
```ts
// BAD — sprite + listeners still in memory
chipLayer.removeChild(chip);

// GOOD
chip.destroy();
```

**Leak 2: forgotten ticker callbacks**
```ts
const spin = () => (coin.rotation += 0.1);
app.ticker.add(spin);
// ...coin destroyed, but spin still runs every frame on a dead object
// GOOD: always pair
app.ticker.remove(spin);
```

**Leak 3: forgotten GSAP tweens on destroyed objects**
```ts
gsap.killTweensOf(chip);  // BEFORE chip.destroy()
```

**How to detect:** Chrome DevTools → Memory → take heap snapshot, play 10
rounds, snapshot again, compare. Search for detached `Sprite`s. Also
`console.log(app.stage.children.length)` per round — should be constant.

---

## Problem 3 — FPS drops when many objects on screen

**Diagnosis first, always:** is it CPU-bound (too many objects / logic) or
GPU-bound (too much drawing)? Check DevTools Performance tab.

Fix list, in order of impact:

1. **Spritesheets** (biggest one). 20 separate PNGs = up to 20 draw call batches
   + 20 HTTP requests. Pack them with TexturePacker/free alternatives into one
   sheet → Pixi batches them into ~1 draw call.
   ```ts
   const sheet = await Assets.load("/assets/game.json"); // spritesheet
   const coin = new Sprite(sheet.textures["coin.png"]);
   ```
2. **Don't redraw Graphics every frame.** `clear()` + redraw re-uploads
   geometry. Move/scale/tint the existing object instead.
3. **`cacheAsTexture`** (v8) for complex static containers — renders the whole
   subtree to one texture once:
   ```ts
   complexPanel.cacheAsTexture(true); // remember to turn OFF before changing children
   ```
4. **ParticleContainer** for thousands of similar sprites (coin rain, confetti)
   — massively faster, limited features (no children, no masks).
5. **`eventMode: "none"`** on non-interactive layers (bg, fx) — skips hit-testing
   the whole subtree on every pointer move.
6. **Cull off-screen objects** — set `visible = false` (or `culling` helpers)
   for things outside the viewport.
7. **Text every frame?** Switch to `BitmapText`.

---

## Problem 4 — z-order fights ("my chip renders under the panel")

Your `main.ts` uses `addChildAt(bg_img, 0)`, `addChildAt(bettPanel, 1)` — this
breaks as soon as you add one more thing.

**Fix A (best): layer containers** — see Step 1 of the project file. Order is
decided once at startup.

**Fix B: zIndex within one container**
```ts
container.sortableChildren = true; // required, has a sort cost
chip.zIndex = 10;
```

Rule of thumb: layers for macro-order (bg < table < chips < ui < fx),
`zIndex` only for micro-order inside one layer (which chip is on top).

---

## Problem 5 — Clicks go through / hit the wrong thing

Real cases:

- **Click passes through a popup to the game behind it.** Fix: the popup's
  full-screen dark overlay must itself be interactive:
  ```ts
  overlay.eventMode = "static"; // swallows clicks, blocks game behind
  ```
- **Transparent parts of a sprite still clickable.** Hit test is the bounding
  box by default. Fix: set an explicit `hitArea` (Polygon/Circle) that matches
  the visible shape.
- **Skewed area clickable outside its shape** (your Dragon/Tiger zones!). Same
  fix — `hitArea = new Polygon(points)`.
- **Button clicked twice → double bet sent to server.** Fix: state guard +
  disable on first click (`eventMode = "none"`), re-enable when the server responds.

---

## Problem 6 — Everything is blurry on mobile

**Cause:** device pixel ratio. A 375px-wide CSS canvas on an iPhone actually
has 1125 physical pixels; rendering at 375 then stretching = blur.

```ts
await app.init({
  resolution: Math.min(window.devicePixelRatio, 2), // cap at 2 — 3x kills GPU for little gain
  autoDensity: true, // keeps CSS size correct
  resizeTo: window,
});
```

Also: don't scale sprites UP much beyond 1.0 — export art at the max size
you'll show it, scale down only.

---

## Problem 7 — Loading takes forever / white screen at start

What real games do:

1. **Two-phase loading.** Tiny "preload" bundle (logo + progress bar art)
   loads first and instantly shows a loading screen; the big "game" bundle loads
   behind it with a progress callback.
2. **`Assets.backgroundLoad()`** for later-needed assets (bonus rounds, win
   screens) — downloads idle-time, doesn't block.
3. **Compress textures.** PNG → WebP/AVIF is often 60–80% smaller. For serious
   GPU-memory savings on mobile: compressed texture formats (KTX2/Basis).
4. **Audio and fonts** count too — load them through Assets so the progress
   bar is honest.

---

## Problem 8 — Animations stutter / speed differs between devices

- Movement not multiplied by `deltaTime` → game runs 2x faster on 120Hz
  monitors. Always `x += speed * ticker.deltaTime`.
- GSAP + Pixi fighting over the same property (a tween and a ticker both
  writing `sprite.x`) → jitter. One owner per property at a time;
  `gsap.killTweensOf(sprite)` before starting a conflicting animation.
- Long JS tasks (parsing a big JSON, building 500 sprites in one frame) block
  rendering → hitch. Spread creation over frames or do it during the loading screen.

---

## Problem 9 — The tab is inactive and the game desyncs

`requestAnimationFrame` (Pixi's ticker) pauses in background tabs, but
`setTimeout`/server timers keep running → player returns and the round already
ended, but animations think it's still betting time.

```ts
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    app.ticker.stop();           // save battery
    gsap.globalTimeline.pause();
  } else {
    app.ticker.start();
    gsap.globalTimeline.resume();
    resyncWithServer();          // ask the server what state the round is in
  }
});
```

**Golden rule of real-money games: the server owns time and results.** The
client only *displays* state; on wake it re-syncs and jumps to the correct state.

---

## Problem 10 — WebGL context lost

On mobile, the OS can kill your GPU context (low memory, backgrounding). The
canvas goes black.

- Pixi listens for the `contextrestored` event and re-uploads managed resources.
- Your job: don't hold raw WebGL objects yourself, keep textures loaded via
  `Assets` (so they can be restored), and test with:
  ```js
  const ext = app.renderer.gl.getExtension("WEBGL_lose_context");
  ext.loseContext(); // simulate; setTimeout(() => ext.restoreContext(), 1000);
  ```

---

## Debug toolbox (memorize for interviews)

| Tool | What for |
|------|----------|
| **PixiJS DevTools** (Chrome extension) | inspect the display tree live, like DOM inspector |
| Chrome Performance tab | CPU vs GPU bound, long tasks |
| Chrome Memory tab (heap snapshots) | leaks, detached sprites |
| `renderer.textureGC` | Pixi's automatic texture garbage collector settings |
| Spector.js | inspect individual WebGL draw calls |
| `app.ticker.FPS` | quick FPS readout |
