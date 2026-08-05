# Assets

## The policy

Every visual has **two** implementations: a procedural one drawn by
[`TextureFactory`](../src/Game/TextureFactory.ts), and an optional artwork override loaded
from the manifest. Art wins where it exists; the drawing stands in where it does not.

This is not a fallback bolted on — it is the reason the engine boots with an empty manifest,
a partial one, or a CDN having a bad day. A sprite that fails to load degrades one sprite,
never the table.

## Shipped manifest

`DEFAULT_BUNDLES` in [`AssetLoader.ts`](../src/Game/AssetLoader.ts):

| Alias | File | Used for |
| --- | --- | --- |
| `wheel.rim` | `assets/wheel-rim.png` | Wooden bowl, ball track, deflector diamonds |
| `wheel.pockets` | `assets/wheel-pockets.png` | Rotating pocket ring with printed numbers |
| `wheel.cone` | `assets/wheel-cone.png` | Central turret |
| `wheel.spindle` | `assets/wheel-spindle.png` | Metal spindle cross |
| `wheel.ball` | `assets/ball.png` | Ivory ball |
| `wheel.pocketHighlight` | `assets/pocket-highlight.png` | Wedge over the winning pocket |
| `table.felt` | `assets/felt.jpg` | Felt behind the betting layout |
| `ui.chipRing` | `assets/chip-ring.png` | Ring around the selected denomination |

Nothing is marked `required`, so all of it is optional.

## Wheel geometry — read this before replacing wheel art

The wheel pieces are not independent images; they are one assembly, and the physics is
measured from them. Three constraints must hold:

**1. Proportions.** `WHEEL_GEOMETRY` in [`Constants.ts`](../src/Game/Constants.ts) records
each piece as a fraction of the wheel's outer radius. The shipped art measures:

```
rim outer                    1.000   (the whole wheel)
rim inner hole               0.683
pocket ring outer            0.680   ← drops exactly into the hole
cone                         0.371
spindle                      0.274
ball diameter                0.121
```

Replace the art, re-measure, update the constants. If the pocket ring no longer matches the
rim's hole, the ball will come to rest somewhere that is not a pocket.

**2. Zero at twelve o'clock.** The pocket ring must be drawn with `0` centred at the top of
the image. `WheelManager` places pocket index 0 at angle 0, which is 12 o'clock.

**3. Clockwise sequence.** Numbers must run clockwise in the physical wheel order
(`EUROPEAN_WHEEL_ORDER`: 0, 32, 15, 19, 4, 21, 2, 25, …). The renderer applies no per-pocket
offset — it trusts the art.

Verify with a frozen wheel:

```js
const s = game.sceneManager.current;
s.wheelManager.wheelAngle = 0;      // 0 must now be at the top
```

## Adding your own art

```ts
import { createRouletteGame } from '@casino/roulette-engine';

const game = createRouletteGame(
  { assetBaseUrl: 'https://cdn.example.com/roulette' },
  {
    bundles: [
      {
        name: 'brand',
        assets: [
          { alias: 'wheel.rim', src: 'v3/rim.png' },
          { alias: 'table.felt', src: 'v3/felt.webp' },
        ],
      },
    ],
  },
);

await game.init(container);
```

Extra bundles are the second argument to `createRouletteGame` (`GameOptions`), and are
loaded **in addition to** the defaults. Reusing an alias
overrides that piece; everything else keeps the shipped art.

`assetBaseUrl` is prefixed to relative paths. Absolute URLs and `data:` URIs pass through
untouched.

## Texture atlases

The loader is Pixi's, so a standard TexturePacker JSON atlas works:

```ts
{ alias: 'roulette.atlas', src: 'atlas/roulette.json' }
```

Frames then resolve by name through `Assets.get()`. To route atlas frames into the engine,
extend the `art()` lookups in `TextureFactory` — that class is the single seam where "which
texture is this piece" is decided, by design.

## Audio

Same policy. `AudioConfig.sources` maps a `SoundId` to a URL; anything absent is synthesised
in Web Audio.

```ts
createRouletteGame({
  audio: {
    sources: {
      [SoundId.BALL_ROLL]: '/audio/ball-roll.mp3',
      [SoundId.WIN]: '/audio/win.mp3',
      // everything else stays procedural
    },
  },
});
```

The cues: `WHEEL_SPIN`, `BALL_ROLL`, `BALL_DROP`, `CHIP_PLACE`, `CHIP_CLEAR`, `BET_CONFIRM`,
`COUNTDOWN_TICK`, `COUNTDOWN_URGENT`, `NO_MORE_BETS`, `WIN`, `BIG_WIN`, `LOSE`,
`BUTTON_CLICK`, `PAYOUT`.

`WHEEL_SPIN` and `BALL_ROLL` are looped and driven live: the engine ramps their gain and
playback rate to track the ball's actual speed, so supply seamless loops, not one-shots.

## Fonts

Three bitmap fonts are generated at boot from system faces
([`Fonts.ts`](../src/Game/Fonts.ts)) — no font files are shipped. Character sets are narrow
on purpose; widen `UI_CHARS` if you add a locale with glyphs outside Latin-1.

To use a real bitmap font, load a `.fnt`/`.xml` through the manifest and change the
`FONT.*` constants to its name.

## Regenerating the shipped sprites

The wheel and felt art was sliced from supplied sheets by bounding-box detection. Source
sheets are not in the repository; `public/assets/*.png` are the outputs. Re-slicing is a
matter of cropping each component and re-measuring the proportions above.
