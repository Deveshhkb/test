# Lucky Ball — Live Draw Studio

A recreation of a live lottery ball-draw machine, built with plain HTML5 Canvas +
JavaScript (no dependencies, no build step).

## Run

Open `index.html` in any browser, or serve the folder:

```bash
npx serve lottery-draw
```

## Features

- Acrylic tumbling drum with rotating spokes and a golden hub
- 28 numbered pool-style balls (roulette red/black colouring) with real 2D physics:
  gravity, wall friction, ball-to-ball collisions, paddle agitation while spinning
- Draw sequence: spin → number flicker → winning ball steered to the gate →
  drops into the tray → result pops with glow
- "Hasil ● N" result bar, big red LED-style number, last-3-balls tray,
  draw-history chips
- Neon game-show studio backdrop with two animated wall screens
  (trend statistics + roulette wheel)
- WebAudio sound effects (rattle ticks, result chime) with a mute toggle
- Scales to any window size (960×540 virtual scene, letterboxed)
