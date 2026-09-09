# Hasil — Futuristic Roulette Draw Machine

An interactive recreation of a futuristic mechanical roulette machine, built as
a real game: React owns the application UI, PixiJS owns the rendering and the
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
| `R` | Reload the machine and reset the camera |

The on-screen buttons do the same three things.

## Design resolution

The scene is authored in a **1918 × 980** virtual space and letterboxed into the
viewport, so the composition is identical at any window size. Device pixel ratio
is capped at 2 to stop high-density displays paying for pixels nobody can see.

## Architecture

```
src/
  App.tsx                        application state only, never per frame
  components/
    GameCanvas.tsx               mounts Pixi into the DOM once
    UI/{Hud,Controls,DebugPanel}.tsx
  game/
    Game.ts                      scene graph, wiring, resize, telemetry
    GameConfig.ts                every tunable constant
    GameLoop.ts                  ticker wrapper, delta time in seconds
    GameState.ts                 phase order and legal transitions
    types.ts                     GameState, DebugSnapshot, event map
    roulette/
      RouletteMachine.ts         composes the machine and fixes draw order
      RouletteWheel.ts           chassis, collar, playfield, pockets, rings
      GlassHousing.ts            far wall, near wall, specular, fresnel
      CentralHub.ts              hub, spokes, paddles
      MechanicalArm.ts           independent indicator arm
      MachineStand.ts            yoke, column, control panel, plinth
      RouletteBall.ts            lit sphere, printed face, shadow, trail
      RoulettePhysics.ts         fixed-step solver
      BallBody.ts, collision.ts, Vec2.ts
    environment/
      Environment.ts             room in three depth bands
      MiniDisplay.ts             wall screen with a live roulette wheel
    camera/Camera.ts             eased dolly and focus
    effects/{ParticleSystem,GlowEffect,ScreenShake}.ts
    audio/AudioSystem.ts         sound front end (see below)
    input/InputManager.ts        keyboard and pointer
    ui/ResultOverlay.ts          red numeral and the morphing "Hasil" pill
    systems/{DrawSequenceSystem,SpinSystem,DebugSystem}.ts
    utils/{TextureFactory,math,easing,random,EventBus}.ts
```

React renders once per state change, never per frame. The game publishes through
a typed event bus, and debug telemetry is sampled five times a second rather
than every tick.

## The machine

Every ring is an independent, separately transformable layer. Draw order, back
to front:

| Layer | Rotates | Contents |
| --- | --- | --- |
| `stand` | no | yoke arms, drive column, control lamps, plinth, floor shadow |
| `wheel.staticLayer` | no | cast chassis frame, brushed collar, dished playfield |
| `glass.back` | no | far wall of the dome |
| `wheel.rotatingLayer` | yes | pocket band with separator fins and cups, outer and inner metal rings |
| `seatGlow` | no | soft light behind a seating ball |
| ball shadows / trails / balls | no | contact shadows, motion-blur ghosts, spheres |
| `hub` | yes | spokes and paddle blocks, drawn over the balls |
| `arm` | independently | indicator arm and fork claw |
| `particles` | no | seat dust |
| `glass.front` | no | near wall, refraction band, specular sweeps, hood |

The arm is aimed by the draw sequence, not carried round by the agitator, so the
two rotate independently exactly as they do in the reference.

## Procedural textures

`utils/TextureFactory.ts` generates and caches everything Pixi's `Graphics`
cannot express:

* **Lit spheres** — a body gradient with the light up and to the left, a
  terminator falling to the lower right, plate bounce, a rim light, and a
  two-part specular. Eighteen balls share two uploads.
* **Brushed metal annuli** — a conic sweep through light and dark with fine
  turning lines, used for every ring.
* **Soft glows and contact shadows** — radial falloffs for lamps, bloom and
  ball shadows.

## Physics

The solver works in machine-local space, where the origin is the wheel centre.

* **Ball vs ball** — circle collision, positional correction weighted by inverse
  mass, a normal impulse with restitution, and a tangential friction impulse.
* **Ball vs playfield wall** — containment against a circle whose surface has a
  tangential velocity of `ω × r`. Grip against that surface is what carries the
  balls around the band; nothing scripts their path.
* **Ball vs agitator** — each spoke is a rotating capsule, and each paddle block
  a second, fatter capsule. Contact points carry the assembly's velocity, so
  paddles genuinely scoop.
* **Agitation** — grip alone drives every ball to exactly the wall speed, at
  which point the band freezes into a rigid ring. Periodic randomised impulses,
  scaled by drum speed, stand in for surface irregularity and keep it churning.
  They vanish when the drum stops, so a settled ball is never disturbed.
* **Stepping** — fixed 1/240 s substeps, three solver iterations, up to 16
  substeps per frame. Behaviour is identical at 30, 60 and 120 Hz.
* **Settling** — the drawn ball is pulled into its pocket by a critically damped
  spring with gravity cancelled, then parked once it is both close and slow.
  Pockets a stopped spoke lies across are ranked out, and the choice is weighted
  toward the bottom of the wheel so the winner lands inside the close-up.

## Draw sequence

`idle → spinning → draining → settling → revealing → returning → idle`

Transitions are validated against `GameState.ts`; an illegal one throws rather
than silently wedging the machine.

**The result is withheld.** The pill and the big numeral keep showing the
*previous* result for the entire spin and only flip over at the reveal, so
pressing the button never gives the answer away. The number is generated per
draw (`ResultManager` behaviour lives in `DrawSequenceSystem`), and
`game.startDraw(n)` pins it for deterministic testing.

## Audio

The reference recording carries a silent track, so no cues could be transcribed
and no clips ship with the project. What ships is the full front end
(`audio/AudioSystem.ts`): lazy context creation on first gesture, one-shots,
pitch-tracked loops, master volume and mute. Register a buffer against a
`SoundId` and the existing call sites start working with no game-code changes.

## Debug mode

Press `D`. The overlay draws the collision shapes the solver actually uses —
containment circle, hub, every spoke and paddle capsule, pocket seat ring, ball
radii and velocity vectors — and the panel reports frame rate, simulation delta,
phase and progress, camera zoom, drum angle and angular velocity, arm angle,
contact count, substeps, and the winning ball's position and velocity.

Frame rate is measured from the *unclamped* delta. Deriving it from the clamped
simulation step would floor the reading at 15 fps and hide the stalls the panel
exists to surface; when a frame is clamped the reading is marked as such.

## Performance notes

* No allocation in the physics step, the ball sync, or the trail update.
* All geometry, trails, particles and glow sprites are built once and only
  transformed; textures are generated once and shared.
* Ball-vs-ball is O(n²) over 18 bodies, 153 pairs — cheaper than any broadphase
  at this size.
* Blur filters are confined to the far environment band, the glass halo and the
  result glow; nothing per-ball is filtered.
* The debug overlay clears its `Graphics` and returns immediately while hidden.
* Listeners, the `ResizeObserver`, the ticker, the audio context and the Pixi
  application are all released in `Game.destroy`.
