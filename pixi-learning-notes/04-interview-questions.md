# 04 — Pixi.js Interview Questions & Answers

> Grouped by level. Answers are written the way you should *say* them —
> short, confident, with one concrete detail that proves real experience.

---

## 🟢 Basic (every interview starts here)

**1. What is Pixi.js and why use it over plain Canvas 2D or DOM?**
> Pixi is a 2D rendering engine on WebGL/WebGPU with a Canvas-style scene graph
> API. Over Canvas 2D: GPU acceleration and automatic sprite batching, so
> thousands of moving objects stay at 60fps. Over DOM: no layout/reflow cost.
> It's a *renderer*, not a full game engine — no physics or sound built in;
> you add GSAP, Howler, matter.js etc. as needed.

**2. Explain the scene graph.**
> A tree of Containers starting at `app.stage`. Each node's transform
> (position/scale/rotation/alpha) multiplies with its parent's, so moving a
> parent moves the whole subtree. Draw order = tree order, last child on top.

**3. Texture vs Sprite?**
> Texture is the pixel data in GPU memory — heavy and shared. Sprite is a
> lightweight display object that references a texture. 500 coins = 500 sprites,
> 1 texture. That sharing is also what makes batching possible.

**4. anchor vs pivot?**
> Both set the origin point. `anchor` is Sprite/Text-only and uses normalized
> texture coordinates (0.5 = center). `pivot` works on any Container and uses
> pixels. Rotation and scaling happen around this point.

**5. What is the Ticker and what is deltaTime for?**
> The ticker is the render loop driven by requestAnimationFrame. `deltaTime`
> tells you how many "ideal frames" passed — you multiply movement by it so
> game speed is identical at 30fps, 60fps, or 144Hz (frame-rate-independent movement).

**6. How do you make an object clickable?**
> Set `eventMode = "static"` (v8) and listen for `pointerdown`. Use `pointer*`
> events so it works for both mouse and touch. For non-rectangular shapes, set
> an explicit `hitArea` polygon, because default hit-testing uses the bounds.

**7. How do you load assets?**
> The `Assets` singleton: `await Assets.load(url)`. It caches by URL, supports
> aliases, bundles, progress callbacks and `backgroundLoad` for idle-time
> downloading. For production I pack images into spritesheets and load the sheet.

---

## 🟡 Intermediate (mid-level positions)

**8. What changed in Pixi v8 vs v7?** *(very common now)*
> Main ones: `await app.init()` instead of constructor options; `app.canvas`
> replaces `app.view`; Graphics API reversed to shape-first then
> `.fill()/.stroke()`; WebGPU renderer alongside WebGL; `Text` takes an options
> object; big internal rewrite for performance; `cacheAsTexture` replaces
> `cacheAsBitmap`.

**9. How does sprite batching work?**
> Pixi collects consecutive sprites that share the same texture (or texture
> atlas page) and blend mode into a single draw call with one big vertex
> buffer. A texture swap breaks the batch. That's exactly why spritesheets
> matter: everything on one atlas = one draw call.

**10. What breaks batching?**
> Switching textures between consecutive objects, different blend modes,
> filters/masks (they force a separate render pass), and Graphics/Mesh mixed
> between sprites. Fix by atlasing, grouping objects by texture, and applying
> filters to groups instead of individual sprites.

**11. Local vs global coordinates — when did you need to convert?**
> Every child position is relative to its parent. `toGlobal`/`toLocal` convert
> between spaces. Real case: animating a chip from a UI button (in `uiLayer`)
> to a betting spot (in `chipLayer`) — I take `getGlobalPosition()` of the
> source and `toLocal` it into the target container before tweening.

**12. `removeChild` vs `destroy`?**
> `removeChild` only detaches from the tree — the object, its children and its
> listeners stay in memory, so re-adding is possible. `destroy()` frees
> geometry and listeners permanently; with `{children: true}` the whole
> subtree, with `{texture: true}` also the texture. Forgetting destroy is the
> top memory leak in long-running games.

**13. How do you handle responsive design in Pixi?**
> Fixed virtual resolution (e.g. 1280×720), everything laid out in those
> coordinates inside one root container, then on resize scale the root by
> `min(screenW/designW, screenH/designH)` and center it. Backgrounds use `max`
> (cover). Plus `resolution: devicePixelRatio` and `autoDensity` at init for
> sharpness.

**14. Text vs BitmapText?**
> `Text` rasterizes the string to a texture — perfect quality but every change
> re-rasterizes. `BitmapText` draws glyphs from a pre-baked font atlas — near
> free to update. Rule: frequently-changing numbers (score, balance, timers) →
> BitmapText; static labels → Text.

**15. How do you integrate GSAP with Pixi?**
> GSAP tweens any object property, so `gsap.to(sprite, {x, y})` just works;
> for nested ones like scale, tween `sprite.scale`. Two gotchas: kill tweens
> before destroying their target (`gsap.killTweensOf`), and never let a tween
> and a ticker write the same property simultaneously. There's also a
> PixiPlugin for tint/filters.

**16. What is a render texture / generateTexture used for?**
> `renderer.generateTexture(displayObject)` renders any subtree into a texture.
> Uses: converting a complex Graphics into a cheap Sprite, snapshots,
> minimaps, and caching expensive static content (same idea as `cacheAsTexture`).

---

## 🔴 Advanced / Senior

**17. Walk me through diagnosing an FPS drop.**
> First determine CPU vs GPU bound with the Performance tab. CPU-bound: too
> many display objects, per-frame allocations, text re-rasterizing, logic in
> ticker — fix with pooling, BitmapText, culling. GPU-bound: too many draw
> calls or overdraw — check batches with Spector.js, fix with atlases,
> fewer filters/masks, ParticleContainer for mass sprites, cacheAsTexture for
> static subtrees. Measure before and after; never optimize blind.

**18. How would you build an object pool and why?**
> Allocation + GC pauses cause frame hitches, so for high-churn objects
> (chips, particles, floating win texts) I pre-create N instances, keep a free
> list, `visible=false` on release instead of destroy, and reset state on
> acquire. Pool per type; grow on demand with a warning so I notice under-sizing.

**19. Design the architecture for a slot/table game.** *(the big one)*
> Layered scene (bg/game/ui/fx) built from Container-subclass components.
> A finite state machine drives rounds: IDLE → BETTING → SPIN/DEAL → RESULT →
> PAYOUT, each state owning what input is allowed. Server is authoritative:
> client sends bets, server returns the outcome, client only *presents* it —
> animations are a visualization of a decided result, never the decision.
> Asset bundles per phase, event bus between systems, resize via virtual
> resolution, reconnect/resync logic on visibility change or socket drop.

**20. How do you handle a WebSocket message arriving mid-animation?**
> Never apply server state directly to visuals. Queue incoming state; the
> presentation layer plays animations from the queue in order and applies the
> final state when each finishes. If the user tabs away and returns, skip the
> queue and hard-jump to the latest state ("catch-up mode"). This separation —
> logical state now, visual state eventually — is the core trick of realtime
> game clients.

**21. Filters and masks — cost and alternatives?**
> Both break batching and force render-to-texture passes. A blur on 50 objects
> = 50 passes; put the 50 in one container and filter the container = 1 pass.
> Set `filterArea` to bound the region. Cheap alternatives: tint instead of
> color filters, pre-baked shadow/glow textures instead of runtime blur,
> alpha instead of ColorMatrix fades.

**22. How does Pixi decide what to redraw each frame?**
> Trick question — it doesn't. Pixi redraws the full scene every frame (GPU
> clears and re-renders); there's no dirty-rectangle system like the DOM. So
> optimization means reducing what's *submitted*: culling, visible=false,
> cacheAsTexture. (You *can* skip whole frames by stopping the ticker when
> nothing changes — useful for idle screens.)

**23. Memory management strategy for a long-session mobile game?**
> Budget GPU memory (mobile Safari kills tabs around a few hundred MB):
> texture atlases sized ≤2048, unload phase-specific bundles with
> `Assets.unload`, destroy() everything on scene teardown, kill tweens/tickers
> with their owners, pool high-churn objects, cap `resolution` at 2. Verify
> with heap snapshot diffing across game rounds — object count must plateau.

**24. WebGL vs WebGPU in Pixi v8?**
> V8 has both renderers behind one API; `autoDetectRenderer`/init `preference`
> picks. WebGPU offers lower driver overhead and better parallelism, but
> availability is still uneven, so WebGL remains the safe default and Pixi
> falls back automatically. App code stays identical — that abstraction is the
> point of v8's rewrite.

---

## 🎤 "Tell me about a problem you solved" — prepare these 3 stories

Interviewers always ask this. Prepare from your own project:

1. **The skewed hit-area story** — betting zones are skewed polygons; default
   bounding-box hit-testing let players click outside the visible zone; fixed
   with `hitArea = new Polygon(...)` matching the drawn shape.
2. **The z-order story** — started with `addChildAt` index numbers, broke when
   adding win effects; refactored to named layer containers.
3. **The resize story** — hardcoded pixel positions broke on other screens;
   moved to a 1280×720 virtual resolution with scale-to-fit letterboxing.

Structure each as: *situation → what went wrong → how I diagnosed → fix → what I learned.*
