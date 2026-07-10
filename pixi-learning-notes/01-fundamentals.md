# 01 — Pixi.js Fundamentals (v8)

> Goal: after this file you can explain and use every core Pixi class.
> All code is Pixi **v8** (`await app.init()` style — v7 tutorials on YouTube use the old style, don't mix them).

---

## 1. Application — the engine

```ts
import { Application } from "pixi.js";

const app = new Application();

// v8: init is ASYNC. This is the biggest change from v7.
await app.init({
  background: "#1a1a2e",
  resizeTo: window,        // auto-resize canvas to window size
  antialias: true,         // smooth edges for Graphics
  resolution: window.devicePixelRatio, // sharp on retina/mobile
  autoDensity: true,       // fixes CSS size when resolution > 1
});

document.body.appendChild(app.canvas); // v8: app.canvas (v7 was app.view)
```

What `Application` gives you:

| Property | What it is |
|----------|-----------|
| `app.stage` | root Container — add everything here |
| `app.ticker` | the game loop |
| `app.renderer` | WebGL/WebGPU renderer (v8 supports both) |
| `app.canvas` | the `<canvas>` DOM element |
| `app.screen` | rectangle of the visible area (`width`, `height`) — use this for layout, NOT `window.innerWidth` |

**Interview one-liner:** *"Application bundles the renderer, the root stage,
and the ticker into one object, so you don't wire them manually."*

---

## 2. Container — the group

A Container is an invisible box. It has position, scale, rotation, alpha —
and applies them to all children. Think `<div>`.

```ts
import { Container } from "pixi.js";

const gameLayer = new Container();
const uiLayer = new Container();

app.stage.addChild(gameLayer, uiLayer); // order = draw order (uiLayer on top)

// Move the whole game at once:
gameLayer.position.set(100, 50);
gameLayer.scale.set(0.8);
gameLayer.rotation = Math.PI / 8; // radians, NOT degrees!
```

Key container facts:
- Children are drawn in the order added. Last child = on top.
- `addChildAt(child, 0)` puts it behind everything (you used this for your bg image).
- `removeChild(child)` removes but does NOT destroy — the object still exists in memory.
- `child.destroy()` frees it. `container.destroy({ children: true })` frees the whole tree.
- A child's `x/y` is **relative to its parent**, not the screen.

**Local vs global coordinates** (asked in every interview):

```ts
const globalPos = sprite.getGlobalPosition();      // where it is on SCREEN
const localPos  = container.toLocal(globalPoint);  // convert screen point → container space
```

---

## 3. Texture & Sprite — the image

- **Texture** = image pixels uploaded to GPU memory (heavy, shared).
- **Sprite** = a lightweight object that *displays* a texture (cheap, many).

100 coin sprites can share **1** coin texture. That's why sprites are cheap.

```ts
import { Assets, Sprite } from "pixi.js";

// Load once (Assets caches it — loading same URL twice returns the cached one)
const coinTexture = await Assets.load("/assets/coinOverCircal.png");

const coin = new Sprite(coinTexture);
coin.anchor.set(0.5);        // origin = center (0,0 = top-left, 1,1 = bottom-right)
coin.position.set(200, 300);
coin.scale.set(0.5);
coin.tint = 0xffcc00;        // multiply color (cheap way to recolor)
app.stage.addChild(coin);
```

**anchor vs pivot** (classic interview question):
- `anchor` — only on Sprite/Text. In texture units (0 → 1). `0.5, 0.5` = center.
- `pivot` — on any Container. In **pixels**. It's the point the object rotates/scales around.

```ts
// These do the same thing for a 100x100 sprite:
sprite.anchor.set(0.5);
sprite.pivot.set(50, 50);
```

---

## 4. Assets — loading

```ts
// Simple:
const tex = await Assets.load("/assets/tiger.png");

// Multiple at once:
const { bg, tiger, dragon } = await Assets.load([
  { alias: "bg", src: "/assets/bg-image.png" },
  { alias: "tiger", src: "/assets/tiger.png" },
  { alias: "dragon", src: "/assets/dragon.png" },
]);

// With a loading bar:
await Assets.load(urls, (progress) => {
  loadingText.text = `Loading ${Math.round(progress * 100)}%`;
});

// Background loading (download during gameplay, no await):
Assets.backgroundLoad(["/assets/bonus-round.png"]);
```

Best practice for real games: define **bundles** (e.g. "preload", "game",
"bonus") with `Assets.addBundle()` and load each bundle when needed.

---

## 5. Graphics — drawing shapes

v8 style: **build the shape first, then fill/stroke** (v7 was `beginFill` first — reversed!).

```ts
import { Graphics } from "pixi.js";

const panel = new Graphics()
  .roundRect(0, 0, 300, 120, 16)
  .fill({ color: 0x16213e })
  .stroke({ color: 0xe94560, width: 2 });

// Polygon (like your skewed betting areas):
const area = new Graphics()
  .poly([0, 0, 300, 0, 330, 213, 10, 213])
  .fill({ color: 0xff0000, alpha: 0.25 });
```

Graphics facts worth knowing:
- One Graphics can hold many shapes — but every `.clear()` + redraw re-uploads geometry. Don't redraw every frame if you can avoid it (move/scale the object instead).
- For a shape you need many times → draw once, then `renderer.generateTexture(graphics)` and use Sprites.

---

## 6. Text

```ts
import { Text, TextStyle } from "pixi.js";

const style = new TextStyle({
  fontFamily: "Arial",
  fontSize: 32,
  fill: 0xffd700,
  stroke: { color: 0x000000, width: 4 },
  dropShadow: { distance: 3, blur: 2, alpha: 0.5 },
});

const balanceText = new Text({ text: "₹ 10,000", style }); // v8: options object
balanceText.text = "₹ 9,500"; // updating re-renders the text texture (has a cost)
```

- `Text` — rasterizes to a texture. Perfect quality, but changing text often = expensive.
- `BitmapText` — pre-baked font atlas. **Very cheap to change.** Use for scores, timers, counters that update every frame.
- `HTMLText` — supports HTML tags/emoji, heaviest.

**Rule:** balance/score that changes a lot → `BitmapText`. Static labels → `Text`.

---

## 7. Ticker — the game loop

```ts
app.ticker.add((ticker) => {
  // runs every frame (~60fps)
  coin.rotation += 0.05 * ticker.deltaTime;
  // deltaTime = frames elapsed (1 at perfect 60fps, 2 if lagging at 30fps)
  // multiplying by it keeps speed the same on slow devices → "frame-independent movement"
});
```

- `ticker.deltaTime` — scaled frames (≈1). `ticker.deltaMS` — milliseconds.
- Remove listeners you don't need: `app.ticker.remove(fn)` — forgotten tickers are a common memory/CPU leak.
- You already use **GSAP** — GSAP has its own ticker. Use GSAP for one-shot animations (coin flying to a position), and `app.ticker` for continuous things (idle rotation, particles).

---

## 8. Events (interaction)

```ts
const btn = new Sprite(texture);
btn.eventMode = "static";   // enable events (v8; v7 was `interactive = true`)
btn.cursor = "pointer";

btn.on("pointerdown", (e) => {
  console.log("clicked at", e.global.x, e.global.y);
});
btn.on("pointerover", () => (btn.tint = 0xcccccc));
btn.on("pointerout", () => (btn.tint = 0xffffff));
```

`eventMode` values (interview favorite):

| Value | Meaning |
|-------|---------|
| `"none"` | ignores events AND skips children (fastest) |
| `"passive"` (default) | not interactive itself, but children can be |
| `"auto"` | only hit-tested if parent is interactive |
| `"static"` | interactive, object doesn't move — normal buttons |
| `"dynamic"` | interactive + emits synthetic events when the pointer is still but object moves (moving targets) |

Always use `pointer*` events (works for mouse + touch), not `mouse*`/`touch*`.

**Custom hit area** (very useful for your skewed betting zones):

```ts
import { Polygon } from "pixi.js";
area.hitArea = new Polygon([0, 0, 300, 0, 330, 213, 10, 213]);
```

---

## 9. Destroying things (memory!)

```ts
coin.destroy();                          // destroy one sprite (texture stays cached)
container.destroy({ children: true });   // destroy container + all children
Assets.unload("/assets/bonus-round.png"); // remove texture from GPU memory
```

`removeChild()` ≠ destroy. If you only remove, the object + its listeners stay
in memory. In a long casino session this is how games slowly eat RAM.

---

## ✅ Self-check before moving to the project file

Can you answer these without looking?

1. What is the difference between a Texture and a Sprite?
2. Why is `await app.init()` needed in v8?
3. anchor vs pivot — difference?
4. What does `deltaTime` do and why multiply movement by it?
5. `eventMode: "static"` vs `"dynamic"`?
6. What is the difference between `removeChild()` and `destroy()`?

If yes → go to [02-project-based-learning.md](./02-project-based-learning.md).
