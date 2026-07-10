# 02 — Project-Based Learning: Build a Dragon-Tiger Betting Game

> Learn by building the exact type of game in `pixi-project/`.
> 7 steps. Each step = one skill. Type every step yourself into a fresh file
> (e.g. `src/learn.ts`) and run it before moving on.

The finished game:
- 3 betting areas (Dragon / Tie / Tiger)
- Chip selector (100 / 500 / 10k ...)
- Click an area → chip flies in with GSAP
- Deal 2 cards with flip animation
- Decide winner, pay out, update balance
- A simple state machine: `BETTING → DEALING → RESULT → BETTING`

---

## Step 1 — Scene structure (layers)

**Skill: organizing the display tree.** Never add everything directly to stage.

```ts
import { Application, Container } from "pixi.js";

const app = new Application();
await app.init({ background: "#0f3460", resizeTo: window });
document.getElementById("pixi-container")!.appendChild(app.canvas);

// Layers, bottom → top:
const bgLayer    = new Container(); // background image
const tableLayer = new Container(); // betting areas, cards
const chipLayer  = new Container(); // placed chips (always above table)
const uiLayer    = new Container(); // balance, buttons, chip selector
const fxLayer    = new Container(); // win effects, always on top

app.stage.addChild(bgLayer, tableLayer, chipLayer, uiLayer, fxLayer);
```

Why this matters: later when you add a win animation, you just add it to
`fxLayer` — no fighting with `addChildAt(x, 7)` magic numbers like in the
current `main.ts`. **Layers > index math.**

---

## Step 2 — A reusable BettingArea class

**Skill: components as Container subclasses.** This is how real Pixi codebases are written.

```ts
import { Container, Graphics, Text, Polygon } from "pixi.js";

export class BettingArea extends Container {
  public readonly id: string;
  public totalBet = 0;
  private bg: Graphics;
  private betText: Text;

  constructor(id: string, points: number[], color: number) {
    super();
    this.id = id;

    this.bg = new Graphics().poly(points).fill({ color, alpha: 0.25 });
    this.addChild(this.bg);

    this.betText = new Text({
      text: "",
      style: { fontSize: 24, fill: 0xffffff, fontWeight: "bold" },
    });
    this.betText.anchor.set(0.5);
    this.betText.position.set(150, 180);
    this.addChild(this.betText);

    // interaction — hitArea matches the skewed polygon exactly
    this.eventMode = "static";
    this.cursor = "pointer";
    this.hitArea = new Polygon(points);

    this.on("pointerover", () => (this.bg.alpha = 1.5 * this.bg.alpha));
    this.on("pointerout",  () => (this.bg.alpha = 1));
  }

  addBet(amount: number) {
    this.totalBet += amount;
    this.betText.text = this.totalBet.toLocaleString();
  }

  reset() {
    this.totalBet = 0;
    this.betText.text = "";
  }
}
```

Usage:

```ts
const dragon = new BettingArea("dragon", [0, 0, 295, 0, 289, 213, -28, 213], 0x0000ff);
const tie    = new BettingArea("tie",    [0, 0, 300, 0, 309, 213, -10, 213], 0x00ff00);
const tiger  = new BettingArea("tiger",  [0, 0, 300, 0, 330, 213,  10, 213], 0xff0000);
dragon.position.set(180, 295);
tie.position.set(490, 295);
tiger.position.set(800, 295);
tableLayer.addChild(dragon, tie, tiger);
```

**What you learned:** encapsulation. The area owns its own graphics, text,
state, and events. `main.ts` stays tiny.

---

## Step 3 — Chip selector (state + UI)

**Skill: selection state + visual feedback.**

```ts
const CHIP_VALUES = [100, 500, 10_000, 25_000, 100_000] as const;
let selectedChip = 100;

const chipTextures: Record<number, Texture> = {
  100: await Assets.load("/assets/100_b.png"),
  500: await Assets.load("/assets/500_b.png"),
  10_000: await Assets.load("/assets/10k_b.png"),
  25_000: await Assets.load("/assets/25k_b.png"),
  100_000: await Assets.load("/assets/100k_b.png"),
};

CHIP_VALUES.forEach((value, i) => {
  const chip = new Sprite(chipTextures[value]);
  chip.anchor.set(0.5);
  chip.scale.set(0.5);
  chip.position.set(100 + i * 90, app.screen.height - 80);
  chip.eventMode = "static";
  chip.cursor = "pointer";

  chip.on("pointerdown", () => {
    selectedChip = value;
    // visual feedback: pop the selected one, dim the rest
    uiLayer.children.forEach((c) => c.scale.set(0.5));
    gsap.to(chip.scale, { x: 0.65, y: 0.65, duration: 0.15 });
  });

  uiLayer.addChild(chip);
});
```

---

## Step 4 — Placing bets (GSAP fly-in animation)

**Skill: coordinate conversion + tween animation.** The chip must fly from the
selector (screen position) into the area (different container!). This is where
`toLocal` earns its money.

```ts
function placeChip(area: BettingArea) {
  if (state !== "BETTING") return;          // state machine guard (step 6)
  if (balance < selectedChip) return shake(balanceText); // can't afford

  balance -= selectedChip;
  updateBalance();
  area.addBet(selectedChip);

  const chip = new Sprite(chipTextures[selectedChip]);
  chip.anchor.set(0.5);
  chip.scale.set(0.35);

  // random landing point inside the area, in chipLayer coordinates
  const b = area.getBounds();
  const target = chipLayer.toLocal({
    x: b.x + 30 + Math.random() * (b.width - 60),
    y: b.y + 30 + Math.random() * (b.height - 60),
  });

  // start from the chip selector position
  const start = chipLayer.toLocal(selectorSprite.getGlobalPosition());
  chip.position.copyFrom(start);
  chipLayer.addChild(chip);
  placedChips.push(chip);

  gsap.to(chip, {
    x: target.x, y: target.y,
    duration: 0.4,
    ease: "power2.out",
  });
  gsap.from(chip.scale, { x: 0.6, y: 0.6, duration: 0.4 }); // lands with a "drop"
}

dragon.on("pointerdown", () => placeChip(dragon));
tie.on("pointerdown", () => placeChip(tie));
tiger.on("pointerdown", () => placeChip(tiger));
```

---

## Step 5 — Card flip (the classic 2D trick)

**Skill: faking 3D with scale.x.** There is no 3D rotation in 2D — you animate
`scale.x` to 0, swap the texture, animate back to 1.

```ts
async function flipCard(card: Sprite, faceTexture: Texture): Promise<void> {
  return new Promise((resolve) => {
    gsap.to(card.scale, {
      x: 0,                       // shrink to invisible edge
      duration: 0.15,
      ease: "power1.in",
      onComplete: () => {
        card.texture = faceTexture;   // swap back → face while invisible
        gsap.to(card.scale, {
          x: Math.abs(card.scale.y), // grow back
          duration: 0.15,
          ease: "power1.out",
          onComplete: resolve,
        });
      },
    });
  });
}

// Deal sequence:
async function deal() {
  const dragonCard = makeCard("/assets/card_back.png", 300, 150);
  const tigerCard  = makeCard("/assets/card_back.png", 700, 150);

  await gsap.to(dragonCard, { y: 160, duration: 0.3 }); // slide in
  await flipCard(dragonCard, dragonFaceTexture);
  await flipCard(tigerCard, tigerFaceTexture);
}
```

Note the `Promise` wrapper — this makes animation sequences readable with
`await` instead of nested callbacks. (GSAP timelines also work; promises are
easier to mix with game logic.)

---

## Step 6 — The state machine (the heart of every casino game)

**Skill: game states.** Without this, players click "bet" during dealing and
everything breaks. Every real slot/table game has this.

```ts
type GameState = "BETTING" | "DEALING" | "RESULT";
let state: GameState = "BETTING";

async function startRound() {
  state = "DEALING";
  dealButton.eventMode = "none";       // disable UI
  dealButton.alpha = 0.5;

  const winner = await deal();          // "dragon" | "tiger" | "tie"

  state = "RESULT";
  await showResult(winner);
  await payOut(winner);

  // cleanup for next round
  placedChips.forEach((c) => c.destroy());
  placedChips.length = 0;
  [dragon, tie, tiger].forEach((a) => a.reset());

  state = "BETTING";
  dealButton.eventMode = "static";
  dealButton.alpha = 1;
}
```

Payout logic:

```ts
const PAYOUTS = { dragon: 2, tiger: 2, tie: 9 }; // 1:1 and 8:1 + stake back

async function payOut(winner: "dragon" | "tiger" | "tie") {
  const areas = { dragon, tiger, tie };
  const win = areas[winner].totalBet * PAYOUTS[winner];
  if (win > 0) {
    balance += win;
    await animateWin(win); // count-up text, chips flying to balance
  }
}
```

**Rule you just learned:** every input handler starts with
`if (state !== "BETTING") return;`. State guards, not disabled flags everywhere.

---

## Step 7 — Win animation (count-up + particles)

**Skill: ticker-driven effects + GSAP on plain objects.**

```ts
function animateWin(amount: number): Promise<void> {
  return new Promise((resolve) => {
    const counter = { value: 0 };
    const winText = new Text({
      text: "WIN 0",
      style: { fontSize: 64, fill: 0xffd700, fontWeight: "bold" },
    });
    winText.anchor.set(0.5);
    winText.position.set(app.screen.width / 2, app.screen.height / 2);
    fxLayer.addChild(winText);

    gsap.to(counter, {
      value: amount,
      duration: 1.5,
      ease: "power1.out",
      onUpdate: () => {
        winText.text = `WIN ${Math.floor(counter.value).toLocaleString()}`;
      },
      onComplete: () => {
        gsap.to(winText, {
          alpha: 0, duration: 0.5, delay: 0.8,
          onComplete: () => { winText.destroy(); resolve(); },
        });
      },
    });

    // scale pulse
    gsap.fromTo(winText.scale, { x: 0.3, y: 0.3 }, { x: 1, y: 1, ease: "back.out(2)", duration: 0.4 });
  });
}
```

Trick to remember: **GSAP can tween any plain object** (`{ value: 0 }`), not
just display objects. That's how count-ups, progress bars and fake-physics work.

---

## 🎯 Homework (do these to lock it in)

1. **Undo button** — remove the last placed chip and refund it. (Hint: you already have `placedChips[]`; also store `{chip, area, amount}`.)
2. **Rebet button** — replay the exact same bets as last round.
3. **Double (2X) button** — you have `2X.png` in assets. Double all current bets if balance allows.
4. **Bet limits** — max 100,000 per area; show a toast message when exceeded.
5. **Timer** — 15-second betting countdown that auto-deals (Text + ticker).

When you finish all 5, you genuinely know Pixi. Next: the problems you'll hit
in production → [03-realtime-problems.md](./03-realtime-problems.md).
