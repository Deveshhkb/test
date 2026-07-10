# 05 — Pixi.js v8 Cheatsheet (revise in 10 minutes)

## Setup

```ts
import { Application, Assets, Container, Sprite, Graphics, Text, Polygon } from "pixi.js";

const app = new Application();
await app.init({
  background: "#000",
  resizeTo: window,
  resolution: Math.min(devicePixelRatio, 2),
  autoDensity: true,
  antialias: true,
});
document.body.appendChild(app.canvas);
```

## Display objects

```ts
// Container (group)
const layer = new Container();
app.stage.addChild(layer);

// Sprite
const tex = await Assets.load("/img.png");
const s = new Sprite(tex);
s.anchor.set(0.5);            // origin: center
s.position.set(x, y);         // or s.x = ..., s.y = ...
s.scale.set(0.5);
s.rotation = Math.PI / 4;     // radians!
s.alpha = 0.8;
s.tint = 0xff0000;
s.visible = false;

// Graphics (v8: shape first, THEN fill/stroke)
const g = new Graphics()
  .rect(0, 0, 100, 50).fill(0xff0000)
  .roundRect(0, 60, 100, 50, 8).fill({ color: 0x00ff00, alpha: 0.5 })
  .circle(50, 150, 25).stroke({ color: 0xffffff, width: 2 })
  .poly([0,0, 100,0, 120,80, -20,80]).fill(0x0000ff);

// Text
const t = new Text({ text: "WIN", style: { fontSize: 32, fill: 0xffd700 } });
t.text = "BIG WIN";           // re-rasterizes (use BitmapText if frequent)
```

## Events

```ts
s.eventMode = "static";       // "none" | "passive" | "auto" | "static" | "dynamic"
s.cursor = "pointer";
s.hitArea = new Polygon([...]);          // custom clickable shape
s.on("pointerdown", (e) => e.global);    // pointertap, pointerover, pointerout, pointerup
s.off("pointerdown", fn);
```

## Ticker (game loop)

```ts
app.ticker.add((tk) => { s.x += 2 * tk.deltaTime; });  // frame-independent
app.ticker.remove(fn);
app.ticker.stop(); app.ticker.start();
// tk.deltaTime ≈ frames (1 @60fps) | tk.deltaMS = ms | app.ticker.FPS
```

## Assets

```ts
await Assets.load("/a.png");                            // cached by URL
await Assets.load([{ alias: "bg", src: "/bg.png" }]);
await Assets.load(list, (p) => bar.width = 200 * p);    // progress 0..1
Assets.addBundle("game", {...}); await Assets.loadBundle("game");
Assets.backgroundLoad([...]);                           // idle-time download
Assets.unload("/a.png");                                // free GPU memory
```

## Coordinates

```ts
s.getGlobalPosition();        // → screen space
container.toLocal(globalPt);  // screen → container space
container.toGlobal(localPt);  // container → screen space
s.getBounds();                // global bounding box
```

## Cleanup (memory)

```ts
s.destroy();                          // sprite + listeners (texture stays cached)
c.destroy({ children: true });        // whole subtree
gsap.killTweensOf(s);                 // BEFORE destroy
app.ticker.remove(fn);                // pair every add with a remove
```

## Z-order

```ts
parent.addChild(a, b);                // b drawn on top
parent.sortableChildren = true; a.zIndex = 5;   // micro-order only
// macro-order: layer containers (bg < game < chips < ui < fx)
```

## Responsive (memorize this pattern)

```ts
const DW = 1280, DH = 720;
function resize() {
  const sc = Math.min(app.screen.width / DW, app.screen.height / DH);
  root.scale.set(sc);
  root.position.set((app.screen.width - DW * sc) / 2, (app.screen.height - DH * sc) / 2);
}
window.addEventListener("resize", resize); resize();
```

## GSAP + Pixi patterns

```ts
gsap.to(s, { x: 100, y: 50, rotation: Math.PI, duration: 0.4, ease: "power2.out" });
gsap.to(s.scale, { x: 1.2, y: 1.2 });                 // scale is nested
gsap.to(counter, { value: 5000, onUpdate: () => t.text = `${counter.value | 0}` }); // count-up
await gsap.to(s, {...});                               // tweens are await-able (v3.13+... use Promise wrapper otherwise)

// card flip (fake 3D)
gsap.to(card.scale, { x: 0, duration: .15, onComplete() {
  card.texture = face;
  gsap.to(card.scale, { x: 1, duration: .15 });
}});
```

## Performance quick list

1. Spritesheets → 1 texture → 1 draw call (batching)
2. `BitmapText` for changing numbers
3. `ParticleContainer` for 1000s of same-texture sprites
4. `cacheAsTexture(true)` for complex static containers
5. `eventMode = "none"` on non-interactive layers
6. Don't `clear()`+redraw Graphics per frame — transform it instead
7. Pool high-churn objects, don't create/destroy per frame
8. Filters/masks break batching — apply to groups, set `filterArea`

## v7 → v8 changes (interview favorite)

| v7 | v8 |
|----|----|
| `new Application({...})` | `await app.init({...})` |
| `app.view` | `app.canvas` |
| `beginFill()` → shape → `endFill()` | shape → `.fill()` |
| `interactive = true` | `eventMode = "static"` |
| `cacheAsBitmap` | `cacheAsTexture()` |
| `new Text("hi", style)` | `new Text({ text, style })` |
| WebGL only | WebGL + WebGPU |
