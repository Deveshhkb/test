# Hasil — Lottery Drum Draw

An interactive recreation of a televised lottery-drum draw, built from a reference
video clip. React owns the application UI, PixiJS owns the rendering and the
real-time loop, and the balls are driven by an actual rigid-body solver rather
than a scripted animation.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production bundle into dist/
npm run preview  # serve the production build
npm run typecheck
```

## Controls

| Input | Action |
| --- | --- |
| `Space` / `Enter` / click the canvas | Start a draw |
| `D` | Toggle the debug overlay |
| `R` | Refill the drum and reset the camera |

The on-screen buttons do the same three things.

## Video behaviour specification

The reference is 960x540, 16:9, 24 fps, 8.0 s.

**Scene.** A neon-blue studio. Two wall monitors flank a transparent lottery drum
on a dark pedestal; the left shows a betting dashboard, the right a live roulette
wheel. Chevron light panels and a perforated LED wall fill the back, with a warm
pool of light on the floor. A green ball and a black ball rest outside the drum.

**Drum.** A clear cylinder seen face-on, with a five-spoke agitator on a
gold-and-red hub and slotted cups moulded into the inner rim. Roughly twenty
balls, alternating crimson and near-black, ride the rim under heavy motion blur.

**Overlays.** A large translucent red numeral sits over the glass, and a dark
rounded pill reads `Hasil ● 19`. Both scale with the camera, so both are authored
in world space rather than screen space.

**Timeline.**

| Phase | Time | Behaviour |
| --- | --- | --- |
| Wide spin | 0.0–3.5 s | Balls circulate on the rim; the camera begins a slow push-in |
| Close spin | 3.5–4.4 s | Extreme close-up on the lower rim; the drum empties |
| Settle | 4.4–5.0 s | One black ball drops into a cup and stops |
| Reveal | 4.6–5.4 s | The green dot fades; the pill number becomes a large glowing cyan numeral |
| Hold | 5.4–6.6 s | Ball at rest in an empty drum |
| Return | 6.6–8.0 s | The camera pulls back out; the pill returns to its compact form |

**Palette**, sampled from frame 0: neon `#17c6fb`, result red `#ff6865`, status
green `#31bc64`, hub gold `#e9c787`, ball crimson `#b45862`, ball onyx `#262329`,
backdrop `#0b1220` to `#172839`.

### Stated assumptions

* The clip shows no user input, so the draw is player-triggered here. Without
  that, the piece would be a video, not a game.
* The settled ball reads `9` while the HUD reads `19`. That is an inconsistency in
  the generated source; the drawn ball is bound to the result instead.
* Camera motion is a continuous ease with no readable focal length, so it is
  reproduced as an eased zoom about a focus point rather than matched per frame.
* Monitor UI text is illegible at 960x540, so both screens are procedural
  roulette content built from the real European pocket order.
* The result pool is `0–36`, inferred from the roulette wheels on the monitors and
  the drawn `19`.
* The reference opens mid-spin. This build opens in a loaded, gently churning
  idle state, because it needs a pre-draw state the clip never shows.

## Architecture

```
src/
  game/
    Game.ts                     scene graph, wiring, resize, snapshots
    GameLoop.ts                 Pixi ticker wrapper, delta time in seconds
    config.ts                   every tunable constant
    types.ts                    GameState, DebugSnapshot, event map
    entities/
      Ball.ts                   ball visuals, printed face, motion-blur ghosts
      Drum.ts                   pedestal, glass shell, rim cups, agitator
      Monitor.ts                wall screen with a procedural roulette wheel
      Studio.ts                 backdrop, LED wall, chevrons, floor, spare balls
      ResultOverlay.ts          red numeral and the morphing "Hasil" pill
    systems/
      DrawSequenceSystem.ts     the phase director
      CameraSystem.ts           eased dolly about a world-space focus point
      SpinSystem.ts             agitator spin-up and spin-down ramps
      DebugSystem.ts            collision-shape and velocity rendering
    physics/
      PhysicsWorld.ts           fixed-step solver
      BallBody.ts               rigid circle
      collision.ts              circle/circle, rotating wall, rotating capsule
      Vec2.ts                   mutable vector, zero per-frame allocation
    effects/
      Particles.ts              pooled seat dust
      ScreenShake.ts            small decaying positional kick
    input/
      InputManager.ts           keyboard and pointer, torn down on unmount
    utils/                      math, easing, seeded RNG, typed event bus
  components/
    GameCanvas.tsx              mounts Pixi into the DOM once
    UI/Hud.tsx                  phase, history chips, last result
    UI/Controls.tsx             draw, refill, debug
    UI/DebugPanel.tsx           sampled telemetry
  App.tsx                       application state only
```

React renders once per state change, never per frame. The game publishes through
a typed event bus, and debug telemetry is sampled five times a second rather than
every tick.

## Physics

The solver works in drum-local space, where the origin is the drum centre.

* **Ball vs ball** — circle collision with positional correction weighted by
  inverse mass, a normal impulse with restitution, and a tangential friction
  impulse.
* **Ball vs rim** — containment against a circle whose surface has a tangential
  velocity of `ω × r`. Grip against that surface is what carries the balls around
  the rim; nothing scripts their path.
* **Ball vs agitator** — each spoke is a rotating capsule. The contact point
  carries the spoke's velocity, so paddles scoop balls the way the real machine
  does.
* **Stepping** — fixed 1/240 s substeps with three solver iterations, up to 16
  substeps per frame. Behaviour is identical at 30, 60 and 120 Hz; only the
  interpolation smoothness changes.
* **Settling** — the winning ball is pulled into its cup by a critically damped
  spring with gravity cancelled, then parked once it is both close and slow. Cups
  that a stopped spoke lies across are ranked out, so the ball never seats under
  a paddle.

## Rendering

Stacking order, back to front: studio, drum body and rotating rim, motion-blur
ghosts, balls, agitator, near glass, red numeral, pill.

The 1920x1080 virtual stage is letterboxed into the host element, so the framing
holds at any window size. Device pixel ratio is capped at 2 to keep large,
high-density displays from paying for pixels nobody can see. A `ResizeObserver`
drives the fit, and the renderer resolution is re-applied on every resize.

## Performance notes

* No allocation in the physics step, the ball sync, or the trail update.
* Ball geometry, trails and particles are built once and only transformed.
* Ball-vs-ball is O(n²) over 18 bodies, which is 153 pairs — cheaper than any
  broadphase would be at this size.
* The debug overlay clears its `Graphics` and returns immediately while hidden.
* Listeners, the `ResizeObserver`, the ticker and the Pixi application are all
  released in `Game.destroy`.
