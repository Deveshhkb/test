# State machine

Twelve states, owned by [`GameManager`](../src/Managers/GameManager.ts). Every transition is
validated against a table; an illegal move is logged and **dropped**, never applied. A
duplicated socket frame or a late `SPIN_START` after a reconnect therefore cannot wedge the
client.

## Diagram

```
                    ┌────────┐
                    │  BOOT  │  engine constructed, nothing rendered
                    └───┬────┘
                        │
                    ┌───▼─────┐
                    │ LOADING │  assets downloading, textures baking
                    └───┬─────┘
                        │
      ┌────────────────►│
      │             ┌───▼─────┐
      │             │ WAITING │  idle; no round open
      │             └───┬─────┘
      │                 │  BET_OPEN
      │         ┌───────▼────────┐
      │         │ BETTING_OPEN   │◄─┐  board live, countdown running
      │         └───────┬────────┘  │
      │                 │           │ (stays open; styling only)
      │      remaining ≤ lastCall   │
      │         ┌───────▼────────┐  │
      │         │   LAST_CALL    │──┘  urgent styling, tick audio
      │         └───────┬────────┘
      │                 │  timer expiry (local) or BET_CLOSED (server)
      │         ┌───────▼────────┐
      │         │ BETTING_CLOSED │  "no more bets", board locked
      │         └───────┬────────┘
      │                 │  preSpinDelay
      │         ┌───────▼────────┐
      │         │    SPINNING    │  wheel accelerating
      │         └───────┬────────┘
      │                 │  ball launched
      │         ┌───────▼────────┐
      │         │  BALL_ROLLING  │  track ─► deflectors ─► drop
      │         └───────┬────────┘
      │                 │  ball seated
      │         ┌───────▼─────────┐
      │         │ WINNER_DETECTED │  glow, dolly, banner, history
      │         └───────┬─────────┘
      │                 │  winnerHoldDuration
      │         ┌───────▼────────┐
      │         │     PAYOUT     │  losers swept, winners collected
      │         └───────┬────────┘
      │                 │  payout animation resolves
      │         ┌───────▼────────┐
      │         │     RESULT     │  result holds
      │         └───────┬────────┘
      │                 │  resultDuration
      │         ┌───────▼────────┐
      └─────────┤     RESET      │  felt cleared, ready for the next round
                └────────────────┘

  Every state above WAITING may also transition directly to RESET
  (host called `reset()`, or a disconnect).
```

## Transition table

Verbatim from `ALLOWED_TRANSITIONS` in `GameManager.ts`:

| From | Legal targets |
| --- | --- |
| `BOOT` | `LOADING` |
| `LOADING` | `WAITING` |
| `WAITING` | `BETTING_OPEN`, `RESET` |
| `BETTING_OPEN` | `LAST_CALL`, `BETTING_CLOSED`, `RESET` |
| `LAST_CALL` | `BETTING_CLOSED`, `RESET` |
| `BETTING_CLOSED` | `SPINNING`, `RESET` |
| `SPINNING` | `BALL_ROLLING`, `RESET` |
| `BALL_ROLLING` | `WINNER_DETECTED`, `RESET` |
| `WINNER_DETECTED` | `PAYOUT`, `RESET` |
| `PAYOUT` | `RESULT`, `RESET` |
| `RESULT` | `RESET` |
| `RESET` | `WAITING`, `BETTING_OPEN` |

`reset()` is the one deliberate exception: it forces `WAITING` from any state, bypassing the
table, because abandoning a round must always succeed — including mid-spin.

## What each state means for the player

| State | Board | Chip tray | Controls | Timer |
| --- | --- | --- | --- | --- |
| `WAITING` | locked | disabled | disabled | hidden |
| `BETTING_OPEN` | **live** | **enabled** | per bet state | **running** |
| `LAST_CALL` | **live** | **enabled** | per bet state | **running, urgent** |
| `BETTING_CLOSED` | locked | disabled | disabled | hidden |
| `SPINNING` → `RESULT` | locked | disabled | disabled | hidden |
| `RESET` | locked | disabled | disabled | hidden |

Control enablement is decided in exactly one place — `ControlBar.reflect()` — from
`BetManager`'s view of the world, so a button can never claim an action the manager would
refuse.

## Cancellation

Two independent guards stop an abandoned round from resuming into a stale state:

- **Round token.** `GameManager` bumps a counter on every `reset()`. The async round
  sequence re-checks it after every `await`; a mismatch abandons the loop silently.
- **Spin token.** `WheelManager` does the same for the spin promise chain, so a `reset()`
  mid-drop cannot resolve into `settle()` on a wheel that has already been re-armed.

Both are necessary: the round loop and the spin have independent lifetimes.

## Timer authority

In local mode the client's countdown closes betting. In **server-driven** mode it does not —
`update()` deliberately stops at zero and waits for the authoritative `BET_CLOSED` frame,
because a client clock is not allowed to decide when a wager stops counting. `SYNC_TIMER`
from the server overwrites the local value in that mode.
