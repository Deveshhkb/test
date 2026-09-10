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
      WallScreen.ts              physical monitor: bracket, bezel, glass
      ResultBoard.ts             left screen content, the game's own history
      LiveVideoFeed.ts           right screen content, live video or fallback
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
| `glass.front` | no | near wall, refraction band, specular sweeps, loader cap |

The vessel is drawn as a cylinder, not a disc. Seen slightly off axis its far
opening sits a little up and right of the near one, and the thickness of the
tube shows as a lit crescent along the lower left. That crescent, the clear
acrylic flange around the rim, and the loader block on top are what give the
machine a back for the eye to read depth against.

The arm is aimed by the draw sequence, not carried round by the agitator, so the
two rotate independently exactly as they do in the reference.

## Rendering and lighting

The scene is lit by one environment rather than by colouring each object
separately. `utils/TextureFactory.ts` declares the key direction, the room's
cyan bounce and the ambient, and every generated material reads them, so metal,
glass and the balls agree about where the light is.

Exposure is matched to the reference by measurement, not by eye. Region means
sampled from a reference frame set the targets: the studio is brightly lit, and
even its darkest wall reads as a mid slate blue rather than near-black. The
whole-frame mean sits within about 20% of the reference.

Three things carry most of the realism:

* **Everything that emits light is additive.** Neon, lamps, screen spill, the
  floor pool, the hub lamp and the seat flash all use `blendMode: 'add'`. Drawn
  normally they composite a dull wash over the room instead of brightening it,
  which is what makes an otherwise correct scene look flat.
* **The frame is graded.** `effects/AtmosphereLayer.ts` adds a key wash, a
  shallow depth haze and a vignette, outside the camera transform so it stays
  locked to the frame while the camera dollies. The reference studio is almost
  entirely deep navy with a handful of small bright accents; without the falloff
  every surface competes and nothing reads as lit.
* **Contact is shaded.** Parts that touch darken toward each other - an
  occlusion ring where the glass meets the chassis, drop shadows under the
  spokes and the indicator arm, and a contact shadow under every ball.

The far band of the room is blurred for depth of field, then baked once through
`renderer.generateTexture` with an explicit frame, since nothing in it animates.
The frame has to be given: deriving it from the container's own bounds clips the
result.

## Procedural textures

`utils/TextureFactory.ts` generates and caches everything Pixi's `Graphics`
cannot express:

* **Lit, marbled spheres** — a body gradient with the light up and to the left,
  a terminator falling to the lower right, plate bounce, the room's cyan fill
  wrapping the shadow side, a rim light, and a two-part specular. Swirled
  veining and fine speckle are drawn under the lighting, so the key light falls
  across the pattern rather than sitting beneath it: the reference balls are
  moulded and marbled, not smooth. Three seeded variants per colour keep a full
  drum from reading as one texture repeated eighteen times.
* **Brushed metal annuli** — a conic sweep with a narrow, very bright band
  where the ring faces the key light and a hard falloff either side. A gentle
  ramp reads as plastic.
* **Cylindrical rods** — the anisotropic highlight that makes the agitator
  spokes and the indicator arm read as machined bar rather than flat strokes.
* **Edge-lit panels** — a narrow hot line with a wide dim body, for the acrylic
  light guides on the side walls.
* **Soft glows, occlusion rings and contact shadows** — radial falloffs for
  lamps, bloom, part-to-part occlusion and ball shadows.
* **Vignette** — the screen falloff described above.

## The wall monitors

Both are physical panels built by `WallScreen`: a wall bracket, the shadow the
panel casts, a bezel with a visible side face so it has thickness, a recessed
screen well, and a glass front carrying the studio's reflections. Content is
masked into the screen area, so nothing spills past the glass and the drum
occludes them where it passes in front.

The **left** monitor shows the game's own result history. It subscribes to the
same `historyChanged` event the HUD does, so the board and the HUD are two views
of one piece of state and cannot disagree.

The **right** monitor is a live video surface. Set `LIVE_FEED_URL` in
`GameConfig.ts` to a direct video URL the page can read cross-origin (`.mp4`,
`.webm` or an HLS stream with permissive CORS) and it plays as a real `<video>`
element sampled into a Pixi texture, which is what puts the picture *inside* the
scene: the drum occludes it and the glass reflects over it. Left empty, the
monitor shows a generated wheel instead, so the set is never a black rectangle,
and a source that fails to load falls back the same way.

A YouTube embed cannot be used here. Its pixels live in a sandboxed
cross-origin iframe the page may never sample, so it could only be layered over
the canvas as a DOM element, where nothing in the scene could overlap it.

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
* **Settling** — nothing steers the drawn ball. Once the wheel has wound down
  and the ball reaches the release window on the descending side of the track,
  it is handed to a rolling-contact friction model: it leaves the track, falls,
  lands back on the curved lower track, bounces, rolls, climbs the pocket frets
  until it runs out of energy, and stops. It is then frozen exactly where it
  came to rest — there is no target pocket and no snap. Which pocket it lands in
  is whichever one it reaches; the result is printed on the ball, so there is
  nothing to aim at.
* **Rolling contact** — friction acts on the *slip* at the contact point
  (`tangentialVelocity + angularVelocity * radius`), not on the ball's velocity.
  A skidding ball is gripped hard and spun up; a rolling one is left alone,
  which is why it keeps travelling instead of stopping dead on contact. The
  impulse is split between linear and angular velocity using a solid sphere's
  inertia and bounded by the normal force, whose steady part is gravity pressing
  the ball into the curved track.
* **Frets** — the studs between pockets are modelled as small circles near the
  outer track, not as full radial walls. Radial walls converge toward the wheel
  centre and wedge the ball in the V between two of them, holding it by geometry
  alone even off the top of the wheel.

## Return lift

After the hold, the drawn ball is taken off the track by the return mechanism
and drawn up into the machine's core. It is velocity driven throughout: a slow
take-up while the mechanism closes on the ball, then acceleration along the
channel toward the centre, with the shake of a driven part and the spin the
channel imparts. Nothing interpolates between two points.

Timings come from the reference clip read frame by frame at 24 fps: the ball
sits in its pocket from frame 106 to frame 160 (4.42s to 6.67s, a hold of about
2.2s), then leaves and is gone by frame 176 (7.33s). The lift runs concurrently
with the camera pulling back, as it does in the reference, and completes in
about 0.55s against the reference's 0.67s.

It disappears by occlusion, not by being switched off: the agitator draws over
the ball layer, and the ball is hidden only once its whole silhouette is inside
the hub boss. Testing the centre instead would pop, because most of the ball is
still outside the boss at that point. Once gone it leaves the simulation, so no
invisible ball falls around inside the empty machine.

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
