# Asset manifest

The engine ships with **no binary assets**. At boot it bakes every sprite into GPU atlases
and synthesises every sound. Production artwork replaces both through config — the frame
keys below are the contract.

---

## Texture keys

### Cards — 54 frames, one base texture

| Key              | Size (design px) | Notes                                   |
| ---------------- | ---------------- | --------------------------------------- |
| `card_<R><S>`    | 132 × 184        | 52 faces. `R` = `A 2..10 J Q K`, `S` = `S H D C` — e.g. `card_AS`, `card_10H` |
| `card_back`      | 132 × 184        | Face-down card, also used by the shoe   |
| `card_highlight` | 132 × 184        | Gold rim overlaid on a winning hand     |

### Chips — one frame per configured denomination

| Key             | Size    | Notes                                                     |
| --------------- | ------- | --------------------------------------------------------- |
| `chip_<value>`  | 92 × 92 | Generated from `config.chips`, e.g. `chip_25000`. Adding a chip to config adds a frame. |

### Roadmap markers — 40 × 40 each

| Key                  | Used by                          |
| -------------------- | -------------------------------- |
| `road_dot_player`    | Bead plate, pair indicators      |
| `road_dot_banker`    | Bead plate, pair indicators      |
| `road_dot_tie`       | Bead plate                       |
| `road_ring_player`   | Big Road, Big Eye Boy (blue)     |
| `road_ring_banker`   | Big Road, Big Eye Boy (red)      |
| `road_small_player`  | Small Road (blue)                |
| `road_small_banker`  | Small Road (red)                 |
| `road_slash_player`  | Cockroach Pig (blue)             |
| `road_slash_banker`  | Cockroach Pig (red)              |
| `road_tie_slash`     | Tie overlay on the Big Road      |

> On the derived roads, "red" means the shoe is behaving predictably and "blue" means it
> broke pattern — the colours map to banker/player hues, not to who won.

### Effects — canvas gradients

| Key           | Size      | Used by                                       |
| ------------- | --------- | --------------------------------------------- |
| `fx_glow`     | 128 × 128 | Spot glow, chip shadow, score-plate glow      |
| `fx_spark`    | 32 × 32   | Win particle burst                            |
| `fx_vignette` | 256 × 256 | Table background, tinted from `config.theme`  |

**Totals: 75 frames across 6 base textures.** Cards, chips and road markers are each one
page, so a full table batches into very few draw calls.

---

## Bitmap fonts

Installed at boot from the configured font family. Rasterising the glyph set once is why
the countdown, balance and hand totals can update every frame without texture uploads.

| Name                 | Size | Glyph set                          | Used by                    |
| -------------------- | ---- | ---------------------------------- | -------------------------- |
| `BaccaratNumeric`    | 44   | `0-9 . , + - % space K M B`        | Bet totals, balance, chips |
| `BaccaratCountdown`  | 96   | `0-9 :`                            | Timer digits               |
| `BaccaratScore`      | 72   | `0-9`                              | Hand totals                |
| `BaccaratLabel`      | 34   | `a-z A-Z 0-9 . , : % / × + - '`    | Every UI label             |

Adding a character to a label means adding it to the `chars` set in
`AssetLoader.installFonts()` — a missing glyph renders as nothing.

---

## Using production artwork

### A spritesheet

```ts
await game.init(host, {
  assets: {
    useProceduralAtlas: false,
    atlasUrl: "/assets/baccarat.json",   // Pixi spritesheet (TexturePacker et al.)
    basePath: "/assets/",
  },
});
```

Frame names in the sheet must match the keys above (an extension is stripped, so
`card_AS.png` resolves to `card_AS`).

### Overriding a few textures

Keep the generated atlas and replace individual frames:

```ts
assets: {
  useProceduralAtlas: true,
  textures: {
    card_back: "cards/branded-back.png",
    chip_1000000: "chips/vip-1m.png",
    fx_vignette: "table/felt.jpg",
  },
}
```

Resolution order is **external URL → spritesheet → procedural**. A failed download logs a
warning and falls back rather than blocking the table from opening.

### Retina

The procedural atlas bakes at `assets.atlasResolution` (default 2×). Raise it for 3×
displays at a proportional memory cost:

```ts
assets: { atlasResolution: 3 }
```

Changing it at runtime triggers a rebuild; consumers re-resolve their textures before the
old atlas is freed.

---

## Sounds

Every cue is synthesised from oscillators and filtered noise by default. Supply files to
replace them — each key falls back to synthesis independently, so a partial set is fine.

| Key                | Cue                            |
| ------------------ | ------------------------------ |
| `card_deal`        | Card leaving the shoe          |
| `card_flip`        | Card turning over              |
| `card_slide`       | Card sliding to the discard    |
| `shuffle`          | Shoe change                    |
| `chip_place`       | Chip landing on a spot         |
| `chip_stack`       | Chip landing on a stack        |
| `chip_clear`       | Losing stack swept             |
| `chip_collect`     | Winning stack collected        |
| `button`           | UI tap                         |
| `betting_open`     | Betting window opens           |
| `betting_closed`   | Betting window closes          |
| `countdown_tick`   | Each of the final seconds      |
| `countdown_final`  | Last three seconds             |
| `win` / `big_win`  | Player wins / wins big         |
| `lose`             | Player loses                   |
| `push`             | Tie push                       |
| `music`            | Background loop (never synthesised) |

```ts
audio:  { basePath: "/assets/audio/", musicVolume: 0.3 },
assets: { sounds: { music: "lounge-loop.mp3", win: "win.mp3", card_flip: "flip.mp3" } },
```

Files are fetched and decoded on the first user gesture, alongside the audio graph.

---

## Budget

| Asset group          | GPU memory @2× |
| -------------------- | -------------- |
| Card atlas (13 × 5)  | ~10.1 MB       |
| Chip atlas (8 chips) | ~0.4 MB        |
| Road markers         | ~0.1 MB        |
| Effect gradients     | ~0.3 MB        |
| Bitmap fonts         | ~1.5 MB        |
| **Total**            | **~12.4 MB**   |

Drop `atlasResolution` to 1 to roughly quarter that on low-end devices.
