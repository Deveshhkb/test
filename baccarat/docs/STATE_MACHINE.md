# Round state machine

Defined in `managers/GameManager.ts` (`ROUND_TRANSITIONS`), enforced by
`core/StateMachine.ts`. Every transition is validated; an illegal one is logged and refused
rather than applied.

```
                    ┌────────┐
                    │  BOOT  │  renderer created, first frame painted
                    └───┬────┘
                        ▼
                   ┌─────────┐
                   │ LOADING │  atlases baked, bitmap fonts installed
                   └────┬────┘
                        ▼
        ┌──────────► ┌─────────┐
        │            │ WAITING │  table idle between coups
        │            └────┬────┘
        │                 ▼
        │        ┌───────────────┐
        │        │ BETTING_OPEN  │  timer runs, spots accept chips
        │        └───────┬───────┘
        │                ▼
        │        ┌────────────────┐
        │        │ BETTING_CLOSED │  spots lock, stakes archived for "repeat"
        │        └───────┬────────┘
        │                ▼
        │           ┌─────────┐
        │           │ DEALING │  four cards, alternating, then both reveals
        │           └────┬────┘
        │                │  natural? ──────────────────┐
        │                ▼                             │
        │       ┌──────────────┐                       │
        │       │ PLAYER_DRAW  │ third card + squeeze   │
        │       └──────┬───────┘                       │
        │              ▼                               │
        │       ┌──────────────┐                       │
        │       │ BANKER_DRAW  │ third card + squeeze   │
        │       └──────┬───────┘                       │
        │              ▼                               │
        │          ┌────────┐  ◄────────────────────────┘
        │          │ RESULT │  winner glows, loser dims, roads update
        │          └───┬────┘
        │              ▼
        │          ┌────────┐
        │          │ PAYOUT │  settlement, chip collect/sweep, banner
        │          └───┬────┘
        │              ▼
        │          ┌───────┐
        └──────────│ RESET │  cards swept to the discard tray
                   └───────┘
```

`RESET` is reachable from every in-round state — that is the abort path used by a
disconnect, `reset()`, or a `ROUND_START` arriving mid-animation.

## Transition table

| From             | May go to                                     | Driven by                        |
| ---------------- | --------------------------------------------- | -------------------------------- |
| `BOOT`           | `LOADING`                                     | `BaccaratGame.boot()`            |
| `LOADING`        | `WAITING`, `BOOT`                             | `AssetLoader.load()` completing  |
| `WAITING`        | `BETTING_OPEN`, `RESET`                       | `BETTING_OPEN` message           |
| `BETTING_OPEN`   | `BETTING_CLOSED`, `RESET`                     | `BETTING_CLOSED` message / timer |
| `BETTING_CLOSED` | `DEALING`, `RESET`                            | `RESULT` message                 |
| `DEALING`        | `PLAYER_DRAW`, `BANKER_DRAW`, `RESULT`, `RESET` | drawing rules in the result    |
| `PLAYER_DRAW`    | `BANKER_DRAW`, `RESULT`, `RESET`              | drawing rules                    |
| `BANKER_DRAW`    | `RESULT`, `RESET`                             | end of the deal sequence         |
| `RESULT`         | `PAYOUT`, `RESET`                             | after the reveal beat            |
| `PAYOUT`         | `RESET`                                       | after `timing.resultSeconds`     |
| `RESET`          | `WAITING`, `BETTING_OPEN`                     | table cleared                    |

## What each state does on screen

| State            | Visual behaviour                                                              |
| ---------------- | ----------------------------------------------------------------------------- |
| `BOOT`           | Brand emblem, spinning ring. Plain `Text` only — no atlas exists yet.          |
| `LOADING`        | Determinate progress bar plus a breathing card fan.                           |
| `WAITING`        | Idle table; the shoe breathes so the scene never looks frozen.                |
| `BETTING_OPEN`   | Timer ring sweeps and turns red under `timing.urgentSeconds`; spots unlocked.  |
| `BETTING_CLOSED` | Timer collapses to "BETS CLOSED"; tapping a spot shakes it.                    |
| `DEALING`        | Cards fly from the shoe face-down; the betting layer dims to 72 %.             |
| `PLAYER_DRAW`    | Beat of `animation.drawDecisionDelay`, then deal + squeeze reveal.             |
| `BANKER_DRAW`    | Same, for the banker.                                                         |
| `RESULT`         | Winning hand gets a gold rim, loser dims, score plates pulse, roads update.    |
| `PAYOUT`         | Winning stacks fly to the player, losing stacks sweep to the house; banner.    |
| `RESET`          | Cards sweep to the discard tray and return to the pool.                        |

## Guarding an abandoned round

`onResult()` captures a **round token** before it starts awaiting:

```ts
const token = ++this.token;
const alive = () => !this.disposed && this.token === token;

for (const step of opening) {
  if (!alive()) return;        // re-checked after every await
  await this.ctx.cards.deal(step);
}
```

Any of `ROUND_START`, `reset()` or `destroy()` bumps the token, so an in-flight sequence
stops at its next checkpoint. `abandonInFlightRound()` then clears the felt — without it,
the next coup would deal a fourth card into a hand that still held three.

## Manual vs timed tables

`config.roundMode` selects who closes the betting window:

| Mode              | `BETTING_OPEN` ends when…                       | UI                          |
| ----------------- | ----------------------------------------------- | --------------------------- |
| `manual` (default)| the player sends `DEAL`                         | Deal button, no countdown   |
| `timed`           | the countdown reaches zero                      | Countdown ring, no Deal     |

In manual mode the adapter reports `durationSeconds: 0` on `BETTING_OPEN`, the timer stays
hidden, and `bettingEndsAt` is infinite so wagers are accepted indefinitely. A `DEAL` with
nothing staked is refused — a table does not deal a coup nobody has bet on — and the client
shows the refusal on the status line rather than silently ignoring the tap.

Everything after `BETTING_CLOSED` is identical in both modes, which is why the same state
machine, rules and presentation serve a solo RNG table and a live dealer feed.

## Pausing

`pause()` stops the Pixi ticker, pauses every tracked GSAP animation, suspends the
`AudioContext` and tells the adapter to stop producing rounds. Waits inside the deal
sequence go through `AnimationManager.delayedCall`, not `setTimeout`, so a paused game
genuinely stops mid-sequence instead of silently advancing while the tab is hidden.
