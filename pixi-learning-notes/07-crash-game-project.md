# 07 — Build a Crash Game (Aviator-style) with Pixi.js

> The crash game is THE modern casino interview project. It looks simple —
> one curve and a number — but it tests everything hard: real-time rendering,
> math-driven animation, server synchronization, and multiplayer state.
> If you can explain how to build one correctly, you clear most game-dev interviews.

## How the game works (30 seconds)

1. Players bet during a short betting window.
2. A round starts: a multiplier grows from **1.00×** upward (a plane/rocket flies along a curve).
3. At a secret, pre-determined point the round **crashes** (plane flies away).
4. Players who pressed **Cash Out** before the crash win `bet × multiplier at cashout`.
5. Players still in when it crashes lose their bet. Repeat forever.

Key insight for everything below: **the crash point is decided by the server
before the round starts.** The client is only an animation of a decision that
already exists. Never compute or guess the crash on the client.

---

## Step 1 — The multiplier math (the heart)

The multiplier grows **exponentially with time**. The industry-standard curve:

```ts
// growth constant: 0.06 ≈ doubles roughly every ~11.5s (tune per game design)
const GROWTH = 0.06;

function multiplierAt(elapsedMs: number): number {
  return Math.exp(GROWTH * (elapsedMs / 1000));   // e^(k·t), starts at 1.00
}
```

Why exponential and not linear? Two reasons you should say in an interview:
- **Fairness math:** with the right crash-point distribution, every instant has
  a similar hazard rate — the game "feels" equally dangerous at 1.5× and 15×.
- **Excitement curve:** early game moves slowly (players relax), high
  multipliers accelerate visually (panic to cash out). The design IS the math.

**Critical rule: the multiplier is a function of TIME, not of frames.**

```ts
// ❌ WRONG — frame-dependent, desyncs on lag/other refresh rates:
multiplier *= 1.001; // per tick

// ✅ RIGHT — recompute from the round's start timestamp every frame:
const elapsed = serverNow() - roundStartTime;
const multiplier = multiplierAt(elapsed);
```

With the frame-based version, a phone that drops to 30fps shows a LOWER
multiplier than the server has — the player cashes out at what they see,
gets paid for what the server has, and files a support complaint. This exact
bug question appears in interviews.

---

## Step 2 — Scene structure

```ts
const bgLayer     = new Container();  // sky, stars, parallax
const graphLayer  = new Container();  // axes, grid, the curve
const rocketLayer = new Container();  // the plane/rocket sprite + trail
const uiLayer     = new Container();  // multiplier text, bet panel, cashout button
const fxLayer     = new Container();  // explosion, win popups
app.stage.addChild(bgLayer, graphLayer, rocketLayer, uiLayer, fxLayer);
```

The big multiplier text updates every frame → this is the textbook place for
**BitmapText** (see file 01). A regular `Text` re-rasterizing "2.47×" 60
times per second wastes CPU exactly when the scene is busiest.

---

## Step 3 — Drawing the curve

The flight path is the multiplier curve plotted over time. Map
(time → x, multiplier → y) into screen space:

```ts
const PLOT = { x: 60, y: 40, w: 900, h: 520 };  // plot area in design pixels

// visible window of the graph — grows as the round runs (see step 4)
let maxTime = 10_000;   // ms shown on x-axis
let maxMult = 2.5;      // multiplier shown at top of y-axis

function toScreen(tMs: number, mult: number) {
  return {
    x: PLOT.x + (tMs / maxTime) * PLOT.w,
    y: PLOT.y + PLOT.h - ((mult - 1) / (maxMult - 1)) * PLOT.h, // y grows downward!
  };
}
```

Render the curve each frame. Redrawing one Graphics per frame is fine here —
it's ONE object, not hundreds (know why this is OK: the cost warning in file
03 is about redrawing *many* Graphics per frame):

```ts
const curve = new Graphics();
graphLayer.addChild(curve);

function drawCurve(elapsed: number) {
  curve.clear();

  const points: number[] = [];
  const STEPS = 64;                          // fixed step count = fixed cost
  for (let i = 0; i <= STEPS; i++) {
    const t = (i / STEPS) * elapsed;
    const p = toScreen(t, multiplierAt(t));
    points.push(p.x, p.y);
  }

  // filled area under the curve
  const last = toScreen(elapsed, multiplierAt(elapsed));
  curve
    .poly([PLOT.x, PLOT.y + PLOT.h, ...points, last.x, PLOT.y + PLOT.h])
    .fill({ color: 0xe94560, alpha: 0.25 });

  // the line itself
  curve.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) curve.lineTo(points[i], points[i + 1]);
  curve.stroke({ color: 0xe94560, width: 4 });
}
```

Place the rocket at the tip, rotated along the direction of travel:

```ts
const tip  = toScreen(elapsed, multiplierAt(elapsed));
const prev = toScreen(elapsed - 100, multiplierAt(elapsed - 100));
rocket.position.set(tip.x, tip.y);
rocket.rotation = Math.atan2(tip.y - prev.y, tip.x - prev.x); // points along curve
```

---

## Step 4 — The "camera" (axis rescaling)

The multiplier is unbounded — 1.5× or 500×. The classic crash-game feel where
the rocket seems to stay on screen while numbers fly is just **continuous
axis rescaling**:

```ts
function updateWindow(elapsed: number, mult: number) {
  // grow targets so the tip sits around 75% of the plot
  const targetMaxTime = Math.max(10_000, elapsed / 0.75);
  const targetMaxMult = Math.max(2.5, 1 + (mult - 1) / 0.75);

  // ease toward targets — instant snapping looks jerky
  maxTime += (targetMaxTime - maxTime) * 0.08;
  maxMult += (targetMaxMult - maxMult) * 0.08;
}
```

Everything is redrawn through `toScreen()` each frame, so rescaling the
window rescales the whole world — curve, gridlines, axis labels. This is the
same "camera = transform of the world" idea as scaling `app.stage`, done in
data space instead. Axis tick labels (1×, 2×, 5×…) are recomputed from
`maxMult` — pool those Text objects (file 06, D1), don't create/destroy per frame.

---

## Step 5 — Round state machine + server messages

States: `BETTING → FLYING → CRASHED → (pause) → BETTING`

The server drives every transition. A realistic message protocol:

```ts
// server → client
{ type: "round_betting", roundId, endsAt }            // betting window open
{ type: "round_start",   roundId, startedAt }         // flight begins
{ type: "tick",          multiplier }                 // optional, ~4/sec, for drift correction
{ type: "round_crash",   roundId, crashMultiplier }   // the reveal
{ type: "cashout_ok",    playerId, multiplier, win }  // my/others' cashouts

// client → server
{ type: "bet",     amount }
{ type: "cashout" }                                    // NO multiplier sent! (see below)
```

**Interview trap — who computes the cashout multiplier?** The client does NOT
send "I cashed out at 2.31×". It sends only *"cash out now"*; the **server**
timestamps the request and computes the multiplier from ITS clock. Otherwise
players fake high multipliers or exploit lag. The client's displayed number
is a *prediction* of what the server will grant — usually within ~50ms.

Client-side skeleton:

```ts
let state: "BETTING" | "FLYING" | "CRASHED" = "BETTING";
let roundStart = 0;
let serverOffset = 0;   // serverTime - clientTime, measured at handshake

const serverNow = () => Date.now() + serverOffset;

socket.on("round_start", (msg) => {
  roundStart = msg.startedAt;          // SERVER timestamp
  state = "FLYING";
  cashoutBtn.enable();
});

socket.on("round_crash", (msg) => {
  state = "CRASHED";
  cashoutBtn.disable();
  playCrash(msg.crashMultiplier);      // explosion, red text, rocket flies off
  scheduleNextRoundUI();
});

app.ticker.add(() => {
  if (state !== "FLYING") return;
  const elapsed = serverNow() - roundStart;
  const mult = multiplierAt(elapsed);
  updateWindow(elapsed, mult);
  drawCurve(elapsed);
  multText.text = mult.toFixed(2) + "×";
});
```

**Clock sync** (the senior detail): measure `serverOffset` with a ping —
send `t0`, server replies with its time `ts`, you receive at `t1`, offset ≈
`ts - (t0+t1)/2`. Re-measure occasionally and use the server's optional
`tick` messages to correct drift. Never trust `Date.now()` raw across machines.

---

## Step 6 — Cash out & the crash moment

```ts
cashoutBtn.on("pointertap", () => {
  if (state !== "FLYING" || !myBet.active) return;
  cashoutBtn.disable();                 // instantly — no double-send
  socket.emit("cashout");
  // OPTIMISTIC UI: show predicted result faintly / "cashing out…"
  // CONFIRM: only on `cashout_ok` show the real multiplier + add winnings
});
```

The crash sequence (all presentation, zero logic):

```ts
async function playCrash(crashMult: number) {
  gsap.killTweensOf(rocket);
  multText.text = crashMult.toFixed(2) + "×";
  multText.tint = 0xff3344;

  // rocket flies off screen
  gsap.to(rocket, { x: rocket.x + 600, y: rocket.y - 400, rotation: -0.4, duration: 0.8 });

  // screen shake — tween the STAGE
  gsap.fromTo(app.stage, { x: 0 }, {
    x: 8, duration: 0.05, repeat: 6, yoyo: true,
    onComplete: () => (app.stage.x = 0),   // ALWAYS reset after shaking
  });

  // "FLEW AWAY!" text, history bar update, etc.
}
```

Add the **history bar** (last ~20 crash results as colored pills: red < 2×,
green ≥ 2×) — trivially easy, and every real crash game has it because
players stare at it. Great homework for pooled components.

---

## Step 7 — Other players (the multiplayer feel)

Crash games feel alive because you see everyone else's bets and cashouts.
- A scrolling list of bets (name, amount) fills during BETTING.
- During flight, entries flip to green with their multiplier as `cashout_ok`
  messages arrive for other players.
- **Performance trap:** hundreds of players → don't create a Text per update.
  Render only the visible ~10 rows and reuse them (a virtualized list — same
  pooling idea again). Or put this list in DOM next to the canvas — a
  legitimate hybrid choice (file 06, D8) since it's scrolling text.

---

## Provably fair (know the concept — it WILL come up)

Crash games advertise "provably fair". The standard scheme:

1. Server generates a secret seed per round; publishes its **hash** BEFORE the round.
2. Crash point is derived deterministically from the seed (+ optionally a client seed).
3. After the round, the server reveals the seed. Anyone can verify:
   `hash(seed) == published hash` and `derive(seed) == crash point`.

So the server provably *couldn't* change the outcome after seeing bets.
The crash distribution behind it (simplified, with ~3% house edge):

```
crash = max(1.00, (1 - houseEdge) / (1 - U))   where U = uniform random [0,1)
```

This gives the famous long-tail: ~50% of rounds crash below ~2×, rare rounds
hit 100×+. You don't implement this on the client — but explaining it
correctly in an interview signals you understand the *product*, not just the canvas.

---

## Crash-game-specific interview questions

**Q1. Why must the multiplier be computed from timestamps instead of incremented per frame?**
> Frame rates differ (30/60/120Hz) and stutter; per-frame increments make the
> displayed multiplier drift from the server's. Computing `e^(k·t)` from the
> server-synced round start makes every client show the same value at the
> same real-world moment, regardless of rendering performance — and a dropped
> frame merely skips a visual step instead of accumulating error.

**Q2. The player pressed cash out at 2.31× but got paid 2.28×. Bug?**
> No — network latency. The server grants the multiplier at the moment the
> request *arrives*. The client shows a prediction. Mitigations: show
> "cashing out…" until confirmation, keep the round-trip small, optionally
> display the confirmed value prominently. What you must NOT do is honor the
> client's claimed multiplier — that's an exploit, not a fix.

**Q3. The tab was backgrounded for 8 seconds mid-flight. What happens on return?**
> `requestAnimationFrame` was paused, so no frames rendered — but the round
> kept running on the server. Because multiplier = f(serverNow − roundStart),
> the very first frame back computes the CORRECT current value and the curve
> jump-cuts forward (or the round crashed meanwhile — the buffered
> `round_crash` message handles that). This is the payoff of time-based state:
> catching up costs nothing. A frame-incremented version would come back 8
> seconds behind and desynced.

**Q4. How do you keep the curve redraw cheap at high multipliers?**
> Fixed sample count (e.g. 64 steps across the visible window) — cost is
> constant regardless of round length. One Graphics object, one stroke + one
> fill. The axis rescaling means we never accumulate unbounded points. If
> profiling ever showed the fill mattered on low-end mobile, I'd drop the fill
> or render the area as a stretched gradient sprite under a mask.

**Q5. Where does the trail/particle effect behind the rocket live and how is it built?**
> A pooled particle system in `rocketLayer`, spawning small sprites at the
> rocket's position each few frames with fade+shrink tweens (or a
> ParticleContainer with a ticker update). Pool everything; degrade the spawn
> rate on low FPS. It must be purely cosmetic — pausing it changes nothing.

**Q6. Design the reconnect flow mid-round.**
> On socket reconnect: request round snapshot → server returns
> `{ phase, roundId, startedAt, myBet, alreadyCashedOut }`. If FLYING: set
> state, compute current multiplier from `startedAt`, resume drawing —
> the player sees the live round within one frame. If my bet was cashed out
> while offline (auto-cashout feature), show the result banner. Never replay
> missed animation history; jump to now. (Same principle as file 06, D5.)

---

## Homework

1. Build the single-player version first: fake the server with
   `setTimeout` + the distribution formula above. Everything else identical.
2. Add **auto-cashout** (player sets 2.00×; client shows it armed, server
   executes it — think about why the SERVER must execute it).
3. Add the history pills bar with pooled components.
4. Add a second simultaneous bet panel (real Aviator allows two bets) — watch
   how it stresses your state handling.
5. Throttle your own ticker to 20fps (`app.ticker.maxFPS = 20`) and verify
   the multiplier still matches a stopwatch — proof your time-based logic works.
