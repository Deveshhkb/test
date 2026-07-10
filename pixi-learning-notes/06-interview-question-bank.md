# 06 — Big Interview Question Bank (Beginner → Senior, Mobile-Focused)

> 50+ questions with full solutions. Mobile gets its own big section because
> real-money / casino games are played ~80% on phones, and senior game-developer
> interviews always dig into mobile.
>
> How to practice: cover the answer, say your answer OUT LOUD, then compare.
> Saying it out loud once is worth reading it five times.

---

# PART A — Beginner (must be perfect, zero hesitation)

**A1. Is Pixi.js a game engine?**
> No — it's a 2D *rendering* engine. It gives you a scene graph, a WebGL/WebGPU
> renderer, a ticker, asset loading, and interaction. It does NOT give physics,
> audio, tilemaps, or networking — you add libraries (matter.js, howler.js,
> socket.io). Engines like Phaser actually use rendering ideas like Pixi's
> underneath but bundle all of that. Interviewers ask this to see if you know
> the boundaries of your tool.

**A2. What is `app.stage`?**
> The root Container of the scene graph. Everything visible must be a
> descendant of it. It's an ordinary Container — you can scale or move it,
> which is one way to implement camera/zoom.

**A3. What units does `rotation` use? How do you rotate 45 degrees?**
> Radians. `sprite.rotation = Math.PI / 4` for 45°. There's also `sprite.angle`
> which IS in degrees (`sprite.angle = 45`) — same underlying value, two
> accessors. Mixing them up is a classic beginner bug.

**A4. What happens if you `addChild` the same object to two containers?**
> A display object has exactly ONE parent. Adding it to a second container
> silently removes it from the first. If you need the same image twice, create
> two Sprites — they can share the same Texture cheaply.

**A5. How do you center a sprite on screen?**
```ts
sprite.anchor.set(0.5);
sprite.position.set(app.screen.width / 2, app.screen.height / 2);
```
> Two parts: anchor makes the sprite's own center its origin, and
> `app.screen` (not `window.innerWidth`) gives the renderer's logical size —
> important when `resolution` > 1.

**A6. What is `alpha` vs `visible` vs `renderable`?**
> `alpha = 0` — still updated, still hit-testable in some setups, still costs
> render consideration. `visible = false` — skipped in render AND in
> `getBounds`/interaction. `renderable = false` — not drawn but still measured.
> For "turn it off", use `visible = false`.

**A7. How do you flip a sprite horizontally?**
> `sprite.scale.x = -1` (or `*= -1`). With `anchor.set(0.5)` it flips in place;
> with anchor 0 it flips around the left edge and appears to jump — that "why
> did my sprite teleport" moment is why interviewers ask.

**A8. What image formats can you load? What's the best for a game?**
> Anything the browser decodes: PNG, JPG, WebP, AVIF, SVG. For games: WebP/AVIF
> for smaller downloads, packed into spritesheet atlases. Transparency needed →
> WebP/PNG. (Advanced: GPU-compressed KTX2/Basis — see mobile section.)

**A9. Difference between `width/height` and `scale` on a sprite?**
> `width`/`height` are convenience setters that internally CHANGE scale:
> `width = texture.width * scale.x`. Setting `width = 100` computes a scale.
> Gotcha: setting width *before* the texture loads (texture is 1×1 placeholder)
> gives a huge wrong scale. Prefer setting scale explicitly.

**A10. How do you know when the user clicked "nothing" (the background)?**
> Make the stage itself interactive and hit-test the whole screen:
```ts
app.stage.eventMode = "static";
app.stage.hitArea = app.screen;
app.stage.on("pointerdown", onBackgroundClick);
```
> Children's events fire first; you can check `e.target` to see what was hit.

---

# PART B — Intermediate

**B1. Explain event bubbling in Pixi.**
> Same model as the DOM: an event fires on the deepest hit object
> (`e.target`), then bubbles up through parents (`e.currentTarget` changes as
> it bubbles). `e.stopPropagation()` stops it. Practical use: one listener on
> a container of 50 buttons instead of 50 listeners — event delegation.

**B2. `pointertap` vs `pointerdown` + `pointerup` — when to use which?**
> `pointertap` fires only when down and up happen on the SAME object — that's
> what a "click" should be. Using `pointerdown` for buttons means the user
> can't cancel by dragging off, and on mobile it fires during scroll gestures.
> Buttons → `pointertap`. Drag/hold mechanics → down/up/upoutside.

**B3. What is `pointerupoutside` and why does drag-and-drop need it?**
> It fires when the pointer went down on your object but was released
> somewhere else. Without handling it, a fast drag that ends off-object never
> gets `pointerup`, and your `dragging = true` flag sticks forever — the item
> follows the mouse forever. Every drag implementation needs
> `pointerup` AND `pointerupoutside` ending the drag.

**B4. Write a basic drag-and-drop (a chip the player can move).**
```ts
chip.eventMode = "static";
let dragging = false;

chip.on("pointerdown", (e) => {
  dragging = true;
  // listen on STAGE for moves — the pointer can outrun the chip
  app.stage.on("pointermove", onMove);
});

function onMove(e) {
  if (!dragging) return;
  // convert global pointer position into the chip's parent space
  chip.parent.toLocal(e.global, undefined, chip.position);
}

function endDrag() {
  dragging = false;
  app.stage.off("pointermove", onMove);
}
chip.on("pointerup", endDrag);
chip.on("pointerupoutside", endDrag);
```
> Three senior details in here: move listener on stage (not the chip),
> `toLocal` for correct coordinates in any container, and `pointerupoutside`.

**B5. What are masks and what types exist?**
> A mask clips a display object to a shape. Two kinds: **Graphics mask**
> (vector, uses stencil buffer, hard edges) and **Sprite/alpha mask** (texture
> alpha, soft edges, costs a render texture pass). Use case: card revealed
> inside a slot window, circular avatars, progress-wheel reveals.
```ts
const mask = new Graphics().circle(0, 0, 50).fill(0xffffff);
avatar.mask = mask;
container.addChild(avatar, mask); // mask must also be in the tree
```

**B6. How do filters work and what's the performance catch?**
> A filter renders the object into an offscreen texture, runs a shader pass
> over it, and composites it back. That breaks batching and costs fill rate.
> Catches: apply to a *group* not 30 individual objects; the filter processes
> the object's whole bounding area (set `filterArea` to bound it); and on
> low-end mobile, prefer pre-baked art (a glow PNG) over runtime BlurFilter.

**B7. What is a `RenderTexture` and give two real uses.**
> A texture you render INTO: `renderer.render({ container, target: rt })`.
> Uses: (1) caching a complex composition once and displaying it as one cheap
> sprite; (2) screenshot / "share my win" feature; (3) paint/reveal effects —
> scratch cards render brush strokes into an RT used as an alpha mask.

**B8. AnimatedSprite — how does frame animation work in Pixi?**
```ts
const sheet = await Assets.load("/assets/coin-flip.json");
const anim = new AnimatedSprite(sheet.animations["flip"]);
anim.animationSpeed = 0.5;  // fraction of ticker rate
anim.loop = false;
anim.onComplete = () => anim.destroy();
anim.play();
```
> Frames come from a spritesheet's `animations` definition. It's flip-book
> animation — cheap, GPU-friendly. For skeletal animation (bones, smooth
> tweening between poses) you'd use Spine, which has an official Pixi runtime —
> worth name-dropping, casino studios use Spine constantly.

**B9. How would you take a screenshot of the current game state?**
```ts
const image = await app.renderer.extract.image(app.stage); // HTMLImageElement
const base64 = await app.renderer.extract.base64(app.stage);
```
> `renderer.extract` renders any target and reads the pixels back. Note:
> pixel readback (`gl.readPixels`) stalls the GPU pipeline — fine for a
> user-triggered screenshot, terrible to do per frame.

**B10. Ticker priorities — why do they exist?**
> `app.ticker.add(fn, context, UPDATE_PRIORITY.HIGH)` controls callback order
> within a frame. Real use: input/physics must run BEFORE things that read
> their results (camera follow, UI sync), otherwise you get one-frame lag —
> the camera trails the player by a frame and looks rubbery.

**B11. How do you pause the game correctly?**
> Three layers, and interviews check you know all three: (1) stop gameplay
> logic — a state flag or pausing your own update loop; (2) pause animations —
> `gsap.globalTimeline.pause()` and `AnimatedSprite.stop()`; (3) optionally
> stop rendering entirely — `app.ticker.stop()` (saves battery, but then even
> your pause menu won't animate — often better: keep ticker, skip game update).
> And NEVER trust client time for anything money-related while paused.

**B12. `getBounds()` vs `getLocalBounds()`?**
> `getBounds()` — axis-aligned box in GLOBAL (world) space, after all
> transforms; use for screen-space checks like culling. `getLocalBounds()` —
> in the object's own space, ignoring its world transform; use for centering
> content inside a container. Both can be expensive on deep trees — cache when
> called per frame.

---

# PART C — Mobile Deep Dive (the senior differentiator)

Mobile is where "senior game developer" is decided. These come up constantly.

**C1. Your game runs at 60fps on desktop, 25fps on a mid-range Android. Give a diagnosis plan.**
> Structured answer beats a list of guesses:
> 1. **Measure on the real device** — `chrome://inspect` remote-debugs the
>    phone's Chrome. Desktop DevTools with CPU throttle lies about GPUs.
> 2. **Split CPU vs GPU:** shrink the canvas to a tiny size — FPS jumps →
>    GPU/fill-rate bound; stays low → CPU bound.
> 3. GPU-bound (most common on mobile): reduce `resolution` (cap at 2, try 1.5),
>    reduce overdraw (stacked transparent full-screen layers are killers),
>    remove BlurFilters, shrink texture sizes.
> 4. CPU-bound: profile the ticker — look for text re-rasterizing, per-frame
>    allocations causing GC, too many display objects → cull and pool.
> 5. Fix ONE thing, re-measure, repeat. Name a target: 60fps flagship,
>    stable 30 on low-end is a legitimate shipping decision.

**C2. What is fill rate / overdraw, and why does it hurt phones specifically?**
> Fill rate = pixels the GPU can shade per frame. Overdraw = shading the same
> screen pixel multiple times (background, then a full-screen tint on top,
> then a vignette = 3× overdraw). Phone GPUs have a fraction of desktop fill
> rate but often MORE physical pixels (3× DPR screens) — so full-screen
> transparent layers that are free on desktop melt phones. Fixes: fewer
> full-screen layers, flatten static stacks into one baked texture, cap
> `resolution`, make opaque things actually opaque (alpha blending is pricier
> than opaque draws).

**C3. Why cap `resolution` at 2 when devices report devicePixelRatio of 3+?**
> Pixel count scales with the SQUARE: DPR 3 = 9× the pixels of DPR 1 vs 4× at
> DPR 2 — more than double the GPU work for a sharpness gain almost nobody can
> see on a small screen. `Math.min(devicePixelRatio, 2)` is the industry
> default. Some games drop to 1.5 dynamically when FPS dips — adaptive
> resolution is a strong senior thing to mention.

**C4. The game gets killed / goes black after minutes on iPhone. Why?**
> GPU memory. Mobile Safari kills or context-loses tabs at a few hundred MB.
> A 2048×2048 RGBA texture is 16MB *decoded on the GPU* — file size on disk is
> irrelevant, a 200KB compressed PNG still occupies width×height×4 bytes of
> VRAM. Audit: sum your texture dimensions. Fixes: atlas efficiently, unload
> phase bundles (`Assets.unload`), no 4096 textures, resize art to what's
> actually displayed, and consider KTX2/Basis compressed textures which stay
> compressed IN GPU memory (4–8× less VRAM).

**C5. Touch input differences you must handle vs desktop?**
> - **No hover** — `pointerover` states never fire; design pressed states
>   (`pointerdown` scale/tint), never hover-only affordances.
> - **Fat fingers** — hit targets ≥ 44×44 CSS px; grow `hitArea` beyond the
>   visual if art is small.
> - **Multi-touch** — every touch is a pointer with its own `pointerId`; track
>   IDs or a second finger cancels your drag.
> - **Browser gestures fight you** — pull-to-refresh, double-tap zoom, swipe
>   navigation. Fix with CSS on the canvas: `touch-action: none;` and viewport
>   meta `user-scalable=no`.
> - **300ms click delay** is history *if* your viewport meta is correct.

**C6. How do you handle the iOS Safari address bar / viewport height problem?**
> `100vh` on iOS includes the space UNDER the collapsing address bar, so
> bottom UI gets hidden. Modern fix: `height: 100dvh` (dynamic viewport
> height) plus `resizeTo: window` and re-layout on the `resize` event. Also
> respect safe-area insets (the notch):
> `padding: env(safe-area-inset-bottom)` on the container, or read it in JS
> and move your bottom bar up. If your bet buttons hide behind the home
> indicator, players in an interview room will notice — reviewers do this
> deliberately.

**C7. Landscape/portrait handling in a real game?**
> Three legitimate strategies — knowing the tradeoffs is the senior part:
> 1. **Lock to one orientation** with a "please rotate" overlay (most casino
>    games do this — cheapest, art built once).
> 2. **Two layouts** — same components, different layout function per
>    orientation; reflow on `resize` (NOT the unreliable `orientationchange`).
> 3. **Fully fluid** — anchor-based layout system; most work, rarely worth it
>    for table games.
> Whatever you pick: re-run layout on `resize`, debounced, and re-check after
> a 300ms delay because iOS reports stale sizes mid-rotation.

**C8. Audio on mobile — what's the trap?**
> Autoplay policy: no sound until the first user gesture. The standard
> pattern: create/resume the AudioContext inside the first `pointerdown`
> (usually the "Tap to start" screen — that screen EXISTS because of this
> rule). Also: iOS mutes WebAudio with the ringer switch, and backgrounding
> suspends the context — resume it on `visibilitychange`.

**C9. How do you test mobile performance properly?**
> - Real low-end device in the drawer (a ~$150 Android is the reference, not
>   your flagship).
> - `chrome://inspect` for remote profiling on Android; Safari → Develop menu
>   for iOS.
> - On-screen FPS + draw-call counter in dev builds (Pixi DevTools, or a tiny
>   `app.ticker.FPS` text) — you can't profile what you can't see in the field.
> - Test THROTTLED networks (Slow 3G) for the loading experience.
> - Test the horror combo: low battery mode ON (halves CPU on iOS) + hot
>   device (thermal throttling). If it's playable there, you're done.

**C10. Battery drain — what actually drains it and what can you do?**
> The GPU running full-tilt every frame. Mitigations: stop the ticker when
> `document.hidden`; render-on-demand for static screens (menus don't need
> 60fps — stop the ticker and `app.render()` manually on interaction); cap to
> 30fps for idle scenes (`app.ticker.maxFPS = 30`); fewer full-screen shader
> effects. Casinos care: players leave the game open for hours.

**C11. WebGL context loss on mobile — walk me through your handling.**
> Cause: OS reclaims GPU memory (backgrounding, memory pressure, thermal).
> Symptoms: black canvas. Handling: Pixi v8 auto-listens for
> `webglcontextlost/restored` and re-uploads its managed resources — IF your
> textures went through `Assets` (re-creatable) rather than hand-made GL
> resources. Your responsibilities: listen and show a "restoring…" overlay,
> re-render dynamic RenderTextures (their contents are NOT restored —
> re-generate them), and resync game state from the server after restore.
> Test with the `WEBGL_lose_context` extension — don't wait for a real device
> to surprise you.

**C12. The keyboard opens (bet amount input) and the whole layout jumps. What's happening?**
> The on-screen keyboard resizes the visual viewport; `resizeTo: window` fires
> and your scale-to-fit shrinks the game into the top half. Fixes: use the
> `visualViewport` API to distinguish keyboard-resizes from real ones; or
> freeze canvas size while an input is focused; or (best) avoid DOM inputs —
> use an in-canvas number pad like real casino games do.

---

# PART D — Senior / Architecture & Coding Questions

**D1. CODING: Implement an object pool for floating win-texts. (Whiteboard favorite)**
```ts
class TextPool {
  private free: Text[] = [];

  constructor(private layer: Container, warm = 10) {
    for (let i = 0; i < warm; i++) this.free.push(this.make());
  }

  private make(): Text {
    const t = new Text({ text: "", style: { fontSize: 28, fill: 0xffd700 } });
    t.anchor.set(0.5);
    t.visible = false;
    this.layer.addChild(t);
    return t;
  }

  show(msg: string, x: number, y: number) {
    const t = this.free.pop() ?? this.make(); // grow if empty
    t.text = msg;
    t.position.set(x, y);
    t.alpha = 1;
    t.visible = true;

    gsap.to(t, {
      y: y - 60, alpha: 0, duration: 1, ease: "power1.out",
      onComplete: () => { t.visible = false; this.free.push(t); }, // release
    });
  }
}
```
> Talking points while coding: why pool (GC hitches), reset-on-acquire,
> grow-on-demand, and that release must be in `onComplete` — releasing early
> while the tween runs is the classic pool bug (one object animated twice).

**D2. CODING: frame-rate-independent movement toward a target. Explain the bug you're avoiding.**
```ts
app.ticker.add((tk) => {
  const dt = tk.deltaTime;
  const dx = target.x - chip.x;
  const dy = target.y - chip.y;
  const dist = Math.hypot(dx, dy);
  const step = SPEED * dt;

  if (dist <= step) {
    chip.position.copyFrom(target);   // arrived — snap, don't oscillate
  } else {
    chip.x += (dx / dist) * step;
    chip.y += (dy / dist) * step;
  }
});
```
> Two bugs avoided: (1) without `deltaTime`, speed doubles on 120Hz screens;
> (2) without the arrival snap, the object overshoots and vibrates around the
> target forever when `step > dist`.

**D3. Design question: 10,000 falling coins for a jackpot celebration. How?**
> Not 10,000 Sprites with individual tickers. Plan:
> - One `ParticleContainer` + one coin texture (or one spritesheet for spin
>   frames) → single draw call.
> - Plain arrays/typed data for velocity per particle; one ticker updates all.
> - Pool everything; recycle coins that leave the screen instead of destroying.
> - On low-end mobile, degrade count (10k → 2k) based on measured FPS —
>   celebrations are the worst moment to drop frames because it's the emotional
>   peak of the game.
> Bonus points: mention that beyond this you'd write a custom shader/Mesh and
> move the motion to the GPU.

**D4. How do you structure a Pixi codebase so five developers can work on one game?**
> - **Component classes** extending Container (BettingArea, ChipStack, Timer) —
>   each owns its view + logic + cleanup (`destroy` override killing tweens/tickers).
> - **Scenes/screens** with a tiny manager: `enter()`, `exit()`, `resize()`
>   lifecycle; exit MUST fully destroy (memory section above).
> - **A state machine** for game flow; components never talk to each other
>   directly — an event bus or store between game logic and view.
> - **Separation: logic never touches Pixi objects.** Game rules operate on
>   data; a presentation layer maps state → display. This is what makes logic
>   unit-testable without a GPU — say this sentence in interviews, it lands.
> - Asset manifest + bundles per scene; a layout module owning all responsive math.

**D5. Server says "you won 5000" but the player closes mid-animation. On reopen, what must happen?**
> The animation is decoration; the transaction was already final on the
> server. On reconnect, client asks for authoritative state (balance, round
> phase), jumps straight to it, and optionally shows a compressed summary
> ("You won 5,000!") instead of replaying the whole sequence. Implementation
> detail: separate `logicalState` (updates instantly from server) from
> `displayedState` (catches up via animation) — reconciliation = snap
> displayed to logical.

**D6. How would you unit-test Pixi code in CI (no GPU)?**
> - The reason for D4's separation: pure game logic (payouts, state machine,
>   bet validation) tests as plain functions — most of your tests, no Pixi at all.
> - Component behavior: Pixi runs headless with the Canvas fallback or mocked
>   renderer; you assert on scene-graph state (`children.length`, positions,
>   `visible`), not pixels.
> - Visual regression: screenshot tests via Playwright/Chromium with a real
>   GPU or SwiftShader, diffed against goldens — few of these, they're brittle.
> - The pyramid: many logic tests, some component tests, few screenshot tests.

**D7. `cacheAsTexture` — when does it HURT performance?**
> It renders the subtree to a texture once, then draws one quad. It HURTS
> when: the content changes often (every change = full re-render to texture,
> more expensive than direct drawing); the subtree was cheap anyway (one
> sprite — you added a render pass and VRAM for nothing); or the cached area
> is huge on mobile (VRAM cost, see C4). Right use: complex, STATIC content —
> an ornate panel with 40 decorative elements.

**D8. Multiple canvases vs one canvas with layers — someone proposes rendering UI in DOM above the canvas. Discuss.**
> Legitimate hybrid, real tradeoffs:
> - DOM UI pros: free accessibility, text input, localization/wrapping, crisp
>   text, no font-atlas work.
> - DOM UI cons: two coordinate systems to sync on resize, z-order complexity,
>   an extra compositing layer (mobile cost), inconsistent feel between DOM
>   and canvas animations.
> - Common industry split: gameplay + juicy animated UI in canvas; forms,
>   lobbies, cashier/settings in DOM. What I'd push back on: mixing per-frame
>   synced elements (a DOM balance counter following a canvas chip) — sync
>   jitter looks broken.

**D9. What's your loading budget and how do you hit it on a phone on 4G?**
> Numbers show seniority: aim interactive < 5s on 4G, ideally < 3.
> - Preload bundle < ~1MB → loading screen visible < 1s.
> - Total initial < 5–8MB; everything else `backgroundLoad`ed.
> - WebP/AVIF, atlases sized to content, audio sprites, font subsetting.
> - Measure with DevTools Slow-3G profile and a real device; add a loading
>   analytics event — the funnel drop at the loading screen is the most
>   expensive pixel in the industry.

**D10. A designer hands you a 60fps After-Effects intro animation. Options to get it in the game?**
> From heaviest to lightest:
> 1. Video file (`Texture.from(videoElement)`) — simplest, big file, autoplay
>    restrictions on mobile.
> 2. Frame-sequence spritesheet — great quality, VRAM explodes for long/big
>    animations (do the math out loud: 60 frames × 512×512×4B = 63MB → no).
> 3. Export to **Lottie** (bodymovin) or **Spine** and play it vectorized/skeletal —
>    small, scalable; needs the animation rebuilt with constraints.
> 4. Rebuild in code with GSAP from the exported assets — most control,
>    most work.
> Senior answer = asking "how long, how big on screen, does it loop?"
> before choosing.

**D11. Explain texture GC in Pixi.**
> `renderer.textureGC` periodically unloads textures from GPU that haven't
> been drawn for N frames (`textureGCMaxIdle`) — the JS-side texture survives
> and re-uploads on next use (causing a possible hitch). You can tune it, or
> set important textures' `texture.source.autoGarbageCollect = false`. On
> mobile this is a safety net, not a strategy — explicit `Assets.unload` of
> phase bundles is the strategy.

**D12. Interview curveball: "Why NOT use Pixi?"**
> Shows judgment: don't use it for a 3D game (three.js/Babylon), for a
> DOM-shaped app (dashboards, forms — DOM is better at text/accessibility),
> for a tiny marketing page animation (CSS/Lottie is 10KB, Pixi is ~450KB),
> or when the team needs a full engine with editor tooling (Unity/Godot
> export to web). Choosing your tool's losing scenarios correctly is the most
> senior signal in the whole interview.

---

# PART E — Rapid-fire round (one-line answers)

Practice these until instant:

| Question | Answer |
|---|---|
| Default `eventMode`? | `passive` — not interactive itself, children can be |
| Radians or degrees? | `rotation` radians; `angle` degrees |
| Top-left or center origin? | Top-left (0,0), unless anchor/pivot changed |
| Can two Sprites share a Texture? | Yes — that's the whole point, and it enables batching |
| Does `visible=false` skip hit-testing? | Yes (and rendering) |
| Ticker based on? | `requestAnimationFrame` |
| Max texture size safe for mobile? | 2048×2048 (4096 fails/hurts on older GPUs) |
| VRAM of 2048² RGBA? | 2048×2048×4 ≈ 16.8MB |
| What restores after context loss? | Assets-managed textures; NOT RenderTexture contents |
| Stage a Container? | Yes, a perfectly ordinary one |
| One parent or many? | Exactly one — re-adding reparents |
| `hitArea` overrides? | The texture/bounds hit shape — including transparent pixels |
| Filters break…? | Batching (offscreen pass per filtered node) |
| Cheap recolor? | `tint` (vertex color multiply, free) |
| BitmapText why? | Pre-baked glyph atlas → no re-rasterize on change |
| `deltaTime` at perfect 60fps? | 1.0 |
| Pixi has physics? | No — it's a renderer; add matter.js etc. |
| v8 renderer backends? | WebGL AND WebGPU, auto-selected |

---

## Final advice for the interview itself

1. **Always answer with a story from your project.** "In my Dragon Tiger game
   I hit exactly this…" beats a textbook definition every time.
2. **Say the tradeoff, not just the technique.** Senior = "cacheAsTexture
   helps here but costs VRAM and hurts if content changes."
3. **When you don't know: reason out loud.** "I haven't used KTX2, but since
   PNG decompresses fully into VRAM, I'd expect a GPU-native format keeps its
   compression on the GPU — so the win is VRAM, not download size." That
   answer, even hedged, scores higher than a memorized one.
4. **Measure-first vocabulary.** Never say "I'd add ParticleContainer" first —
   say "I'd profile first; IF it's draw-call bound, then…"
