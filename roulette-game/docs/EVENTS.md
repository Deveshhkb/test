# Events

Every cross-module message flows through one typed bus. `game.events` exposes it to the
host.

```ts
import { GameEvent } from '@casino/roulette-engine';

const off = game.events.on(GameEvent.WIN_NUMBER, ({ number, color }) => {
  console.log('result', number, color);
});
off();                       // unsubscribe
game.events.offAll(owner);   // drop every subscription tagged with `owner`
```

Payload types live in `GameEventPayloads` and are enforced at the call site — `emit` will
not compile with the wrong shape.

## Lifecycle

| Event | Payload | Emitted by |
| --- | --- | --- |
| `BOOT_COMPLETE` | — | `BootScene` |
| `ASSETS_PROGRESS` | `{ progress: number }` | `AssetLoader` |
| `ASSETS_COMPLETE` | — | `AssetLoader` |
| `READY` | — | `Game` — table is playable |
| `STATE_CHANGE` | `{ from, to }` | `GameManager` |
| `PAUSED` / `RESUMED` | — | `Game` |
| `DESTROYED` | — | `Game` |
| `ERROR` | `{ message, fatal }` | `Game` |

## Round flow — the backend seam

These are the events a server drives. The engine emits them in local mode and **consumes**
the same names in server-driven mode, so a host can forward socket frames straight onto the
bus with no translation layer.

| Event | Payload | Direction |
| --- | --- | --- |
| `ROUND_START` | `{ roundId }` | in / out |
| `BET_OPEN` | `{ roundId, duration }` | in / out |
| `LAST_CALL` | `{ remaining }` | out |
| `BET_CLOSED` | `{ roundId }` | in / out |
| `SPIN_START` | `{ roundId, winningNumber }` | in / out |
| `BALL_DROP` | `{ roundId }` | out |
| `WIN_NUMBER` | `{ roundId, number, color }` | out |
| `PAYOUT` | `RoundResult` | out |
| `ROUND_END` | `{ roundId }` | out |
| `SYNC_TIMER` | `{ remaining, total }` | **in** |
| `SYNC_HISTORY` | `{ entries }` | **in** |
| `SYNC_BALANCE` | `{ balance }` | **in** |

The three `SYNC_*` events are consumed by `GameManager` directly — emit them and the engine
corrects itself. See [BACKEND.md](BACKEND.md).

## Player intent

| Event | Payload | Notes |
| --- | --- | --- |
| `PLACE_BET` | `{ spotId, amount }` | intent |
| `BET_PLACED` | `{ spotId, amount, total }` | accepted |
| `BET_REJECTED` | `{ spotId, reason }` | `reason` **is a localisation key** |
| `UNDO_BET` / `DOUBLE_BET` / `REPEAT_BET` / `CLEAR_BET` | — | raised by the UI |
| `BETS_CHANGED` | `{ bets, total }` | authoritative snapshot |
| `CHIP_SELECTED` | `{ value }` | denomination changed |

`BET_REJECTED.reason` is a key such as `error.betTooLarge`, resolvable through
`Localization.t()` — so a host can surface the message in the player's language without
mapping error codes.

## Presentation

| Event | Payload |
| --- | --- |
| `RESIZE` | `LayoutMetrics` |
| `ORIENTATION_CHANGE` | `{ orientation }` |
| `THEME_CHANGE` | `{ theme }` |
| `LANGUAGE_CHANGE` | `{ language }` |
| `CONFIG_CHANGE` | `{ config }` |
| `SPOT_HOVER` | `{ spotId, numbers }` |
| `SPOT_HOVER_END` | — |
| `HISTORY_UPDATE` | `{ entries, stats }` |
| `BALANCE_CHANGE` | `{ balance, delta }` |

## Bus guarantees

- **Snapshot dispatch.** Handlers are copied before emission, so a handler may subscribe or
  unsubscribe during dispatch without corrupting iteration.
- **Isolated failures.** A throwing handler is routed to the error sink and skipped. One
  broken listener never takes down a round in progress.
- **Owner tagging.** `on(event, handler, owner)` lets a view drop all of its subscriptions
  with a single `offAll(owner)` in `destroy()`. This is what keeps mount/unmount cycles
  leak-free.
- **`waitFor(event)`** returns a promise for sequenced flows.

## Typical host wiring

```ts
game.events.on(GameEvent.READY, () => setLoading(false));

game.events.on(GameEvent.PAYOUT, (result) => {
  analytics.track('round_complete', {
    round: result.roundId,
    staked: result.totalStaked,
    paid: result.totalPayout,
  });
});

game.events.on(GameEvent.BET_REJECTED, ({ reason }) => toast(t(reason)));
game.events.on(GameEvent.ERROR, ({ message, fatal }) => { if (fatal) showFallback(message); });
```
