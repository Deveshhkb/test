# Event flow

Two buses, deliberately separate:

- **`ServerEvent` / `ClientEvent`** (`net/protocol.ts`) — the wire. Crosses the network.
- **`GameEventMap`** (`events.ts`) — internal. Never leaves the process.

`GameManager` is the only translator between them. That boundary is why the rendering layer
cannot tell a live-dealer socket from the in-process RNG.

---

## Internal event catalogue

Subscribe with `game.on(name, handler)`; the return value unsubscribes.

### Lifecycle

| Event             | Payload                              | Emitted when                        |
| ----------------- | ------------------------------------ | ----------------------------------- |
| `game:booted`     | –                                    | Renderer up, managers constructed   |
| `game:ready`      | –                                    | First round loop running            |
| `game:paused`     | –                                    | `pause()` or tab hidden             |
| `game:resumed`    | –                                    | `resume()` or tab visible           |
| `game:destroyed`  | –                                    | Teardown, just before the bus closes |
| `game:error`      | `{ code, message, fatal }`           | Init failure or a server error       |

### Loading

| Event              | Payload                     |
| ------------------ | --------------------------- |
| `assets:progress`  | `{ progress: 0..1, label }` |
| `assets:complete`  | –                           |

### Round

| Event                 | Payload                                                        |
| --------------------- | -------------------------------------------------------------- |
| `state:changed`       | `{ from, to, at }`                                             |
| `round:start`         | `{ roundId, coup, shoeId }`                                    |
| `round:bettingOpen`   | `{ roundId, durationSeconds }`                                 |
| `round:bettingClosed` | `{ roundId }`                                                  |
| `round:dealStep`      | `{ step, playerTotal, bankerTotal }`                           |
| `round:burn`          | `{ cards }`                                                    |
| `round:result`        | `{ result: RoundResult }`                                      |
| `round:settled`       | `{ settlements, totalStake, totalReturn, netProfit, commission }` |
| `round:end`           | `{ roundId }`                                                  |
| `round:reset`         | –                                                              |

### Timer

| Event           | Payload                                          |
| --------------- | ------------------------------------------------ |
| `timer:tick`    | `{ remainingSeconds, totalSeconds, urgent }`     |
| `timer:expired` | –                                                |

### Betting and wallet

| Event               | Payload                                          |
| ------------------- | ------------------------------------------------ |
| `bet:chipSelected`  | `{ value, index }`                               |
| `bet:placed`        | `{ betType, amount, chipValue, total }`          |
| `bet:rejected`      | `{ betType, reason, message }`                   |
| `bet:changed`       | `{ bets, total, canUndo, canRepeat }`            |
| `bet:cleared`       | –                                                |
| `bet:undone`        | `{ betType, amount }`                            |
| `bet:repeated` / `bet:doubled` | `{ bets }`                            |
| `balance:changed`   | `{ balance, delta, reason }`                     |

`bet:changed` is the one the UI should render from — it fires after every mutation,
including server reconciliation.

### Hands, scoreboards, presentation

| Event                | Payload                                    |
| -------------------- | ------------------------------------------ |
| `hand:scoreChanged`  | `{ player, banker }`                       |
| `hand:revealed`      | `{ side, total }`                          |
| `roadmap:updated`    | `{ snapshot: RoadmapSnapshot }`            |
| `shoe:changed`       | `{ shoeId, cardsRemaining }`               |
| `view:resized`       | `{ metrics: ViewportMetrics }`             |
| `audio:muteChanged`  | `{ muted }`                                |
| `net:connected`      | `{ balance }`                              |
| `net:disconnected`   | `{ reason, willReconnect }`                |

---

## One coup, end to end

```
 ADAPTER                 GAME MANAGER              BUS                    VIEW
   │                          │                     │                      │
   ├─ROUND_START─────────────►│                     │                      │
   │                          ├─abandonInFlight()   │                      │
   │                          ├─bets.beginRound()   │                      │
   │                          ├────────────────────►│ round:start          │
   │                                                │                      │
   ├─BETTING_OPEN────────────►│ FSM → BETTING_OPEN  │                      │
   │                          ├────────────────────►│ round:bettingOpen───►│ Timer.start
   │                          │                     │                      │ spots unlock
   ├─UPDATE_TIMER (10 Hz)────►├────────────────────►│ timer:tick──────────►│ ring sweep
   │                                                │                      │
   │◄─PLACE_BET───────────────┤◄─────bets.place()───┤◄─────────────────────┤ spot tapped
   ├─BET_ACCEPTED────────────►│ applyServerBets     │                      │
   │                          ├────────────────────►│ bet:changed─────────►│ chips fly in
   ├─BALANCE_UPDATE──────────►├────────────────────►│ balance:changed─────►│ counter rolls
   │                                                │                      │
   ├─BETTING_CLOSED──────────►│ FSM → BETTING_CLOSED│                      │
   │                          ├────────────────────►│ round:bettingClosed─►│ spots lock
   │                                                │                      │
   ├─DEAL_CARD ×n ───────────►│ (buffered)          │                      │
   ├─RESULT──────────────────►│ FSM → DEALING       │                      │
   │                          ├─cards.deal() ×4 ────┼─────────────────────►│ cards fly
   │                          ├─cards.reveal(P/B)   │                      │ flips
   │                          ├────────────────────►│ hand:scoreChanged───►│ plates update
   │                          │ FSM → PLAYER_DRAW   │                      │
   │                          ├─deal + squeeze──────┼─────────────────────►│ squeeze
   │                          │ FSM → RESULT        │                      │
   │                          ├─roadmaps.record()   │                      │
   │                          ├────────────────────►│ round:result────────►│ glow / dim
   │                          ├────────────────────►│ roadmap:updated─────►│ roads redraw
   │                          │ FSM → PAYOUT        │                      │
   │                          ├─Rules.settle()      │                      │
   │                          ├────────────────────►│ round:settled───────►│ collect/sweep
   ├─BALANCE_UPDATE──────────►├────────────────────►│ balance:changed─────►│ balance rolls
   ├─ROUND_END───────────────►│ FSM → RESET         │                      │
   │                          ├─cards.collect()─────┼─────────────────────►│ sweep to tray
   │                          ├────────────────────►│ round:reset─────────►│ table clears
```

---

## Ordering guarantees

1. `bet:changed` always follows `bet:placed` / `bet:undone` / `bet:cleared`.
2. `round:result` always precedes `round:settled` for the same coup.
3. `roadmap:updated` fires before `round:settled`, so the scoreboard is current when the
   banner appears.
4. `balance:changed` with reason `PAYOUT` arrives from the server, timed to land after the
   reveal — never before.
5. `round:reset` may fire without a preceding `round:settled` when a round is abandoned.

## Emitting from a handler

`EventBus.emit` iterates a snapshot of the listener list, so a handler may subscribe or
unsubscribe during dispatch without corrupting the walk. `once` handlers are removed before
they run, so a re-entrant emit cannot double-fire them.
