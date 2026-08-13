# Backend integration

The engine talks to exactly one interface. Implement it and the game is networked; nothing
in the rendering or rules code changes.

```ts
interface NetworkAdapter {
  readonly connectionState: ConnectionState;
  connect(): Promise<void>;
  disconnect(): void;
  send<K extends ClientEvent>(event: K, payload: ClientEventMap[K]): void;
  on<K extends ServerEvent>(event: K, handler: (payload: ServerEventMap[K]) => void): () => void;
  pause?(): void;
  resume?(): void;
  destroy(): void;
}
```

Two implementations ship:

| Adapter           | Use                                                                      |
| ----------------- | ------------------------------------------------------------------------ |
| `LocalRngAdapter` | A complete table server in-process: shoe, clock, balance, settlement. Default. |
| `SocketAdapter`   | JSON envelopes over a native `WebSocket` **or** a Socket.IO client.        |

---

## Wiring a real server

### Option A — the bundled socket adapter

```ts
await game.init(host, {
  network: { mode: "remote", url: "wss://tables.example.com/baccarat/BAC-01" },
});
```

Frames are `{ "event": string, "payload": object }` where `event` is a `ServerEvent` /
`ClientEvent` string. Reconnection uses capped exponential backoff with jitter, and client
messages produced while the socket is down are buffered and flushed on reconnect.

With Socket.IO, hand the adapter your client — it detects the `on`/`emit` shape:

```ts
import { io } from "socket.io-client";
import { SocketAdapter } from "@hkb/baccarat-engine";

await game.init(host, config, {
  createNetworkAdapter: (cfg) =>
    SocketAdapter.fromConfig(cfg, (url) => io(url, { transports: ["websocket"] })),
});
```

### Option B — your own adapter

```ts
class MyTableAdapter implements NetworkAdapter { /* ... */ }

await game.init(host, config, {
  createNetworkAdapter: (cfg) => new MyTableAdapter(cfg, session.token),
});
```

---

## Server → client messages

| Event            | Payload                                              | Required |
| ---------------- | ---------------------------------------------------- | -------- |
| `CONNECTED`      | `{ tableId, balance, currency, serverTime }`         | yes      |
| `ROUND_START`    | `{ roundId, shoeId, coup }`                          | yes      |
| `BETTING_OPEN`   | `{ roundId, durationSeconds, serverTime }`           | yes      |
| `UPDATE_TIMER`   | `{ roundId, remainingSeconds, totalSeconds }`        | recommended |
| `BETTING_CLOSED` | `{ roundId }`                                        | yes      |
| `DEAL_CARD`      | `{ roundId, step: DealStep }`                        | optional |
| `RESULT`         | `{ result: RoundResult }`                            | yes      |
| `ROUND_END`      | `{ roundId, nextRoundInSeconds }`                    | recommended |
| `BALANCE_UPDATE` | `{ balance, delta, reason }`                         | yes      |
| `BET_ACCEPTED`   | `{ roundId, bets, balance }`                         | yes      |
| `BET_REJECTED`   | `{ roundId, betType, amount, reason, message }`      | yes      |
| `SYNC_HISTORY`   | `{ shoeId, entries: RoadEntry[] }`                   | yes      |
| `SHOE_CHANGE`    | `{ shoeId, cardsRemaining }`                         | recommended |
| `BURN_CARD`      | `{ roundId, cards }`                                 | optional |
| `ERROR`          | `{ code, message, fatal }`                           | recommended |

### Manual tables

Send `durationSeconds: 0` on `BETTING_OPEN` to indicate "no clock": the client hides the
countdown, shows the Deal button, and closes the window by sending `DEAL`. Your server
should then emit `BETTING_CLOSED` followed by `RESULT` exactly as a timed table would.

### `RESULT` is the important one

```jsonc
{
  "result": {
    "roundId": "round_abc",
    "shoeId": "shoe_xyz",
    "player":  { "side": "player", "cards": [...], "total": 7, "isNatural": true,  "isPair": false },
    "banker":  { "side": "banker", "cards": [...], "total": 4, "isNatural": false, "isPair": false },
    "outcome": "PLAYER",
    "playerPair": false, "bankerPair": false, "perfectPair": false, "natural": true,
    "dealSequence": [
      { "side": "player", "card": { "rank": 9, "suit": "H" }, "index": 0, "isDraw": false },
      { "side": "banker", "card": { "rank": 3, "suit": "S" }, "index": 0, "isDraw": false },
      { "side": "player", "card": { "rank": 8, "suit": "C" }, "index": 1, "isDraw": false },
      { "side": "banker", "card": { "rank": 1, "suit": "D" }, "index": 1, "isDraw": false }
    ]
  }
}
```

`dealSequence` is the physical order cards reach the table, and `isDraw` marks the two
third-card draws. The engine animates strictly from this — it never re-derives the deal —
so a server using a different (but legal) drawing order still renders correctly.

`rank` is 1–13 (Ace..King); `suit` is `S` `H` `D` `C`.

**Live-dealer feeds** may stream `DEAL_CARD` as the dealer works; the engine buffers those
and still animates off `RESULT`, so both backend styles need one code path.

---

## Client → server messages

| Event             | Payload                                    | Sent when                     |
| ----------------- | ------------------------------------------ | ----------------------------- |
| `PLACE_BET`       | `{ roundId, betType, amount, chipValue }`  | Chip placed on a spot         |
| `CANCEL_BET`      | `{ roundId, betType? }`                    | Undo, or clear (no `betType`) |
| `CONFIRM_BETS`    | `{ roundId, bets }`                        | If your flow needs a confirm  |
| `DEAL`            | `{ roundId }`                              | Player-driven tables: close betting and deal |
| `REQUEST_HISTORY` | `{ tableId, limit }`                       | On demand                     |
| `JOIN_TABLE` / `LEAVE_TABLE` | `{ tableId }`                   | Session lifecycle             |

Undo is deliberately expressed as `CANCEL_BET` followed by a `PLACE_BET` for the remaining
stake — servers do not need to model an undo stack.

---

## Authority model

**The server owns money. The client owns feel.**

Bets are placed optimistically so a chip lands the instant it is tapped, then reconciled:

```
tap → BetManager.place()  → chip animates, bet:changed fires
                          → PLACE_BET sent
server → BET_ACCEPTED     → applyServerBets() snaps to the server's view if it differs
server → BALANCE_UPDATE   → the only thing allowed to set the balance
```

The client also runs `BaccaratRules.settle()` locally, but **only to drive the animation**
(which stack collects, which sweeps, what the banner says). The number in the wallet always
comes from `BALANCE_UPDATE`.

Validate every bet server-side. Client-side limits are a UX affordance, not a control.

---

## Reconnection

1. `CONNECTED` resets the balance.
2. `SYNC_HISTORY` replaces the roadmaps wholesale.
3. If a round is in flight, send the current phase (`BETTING_OPEN` with the remaining
   seconds, or `RESULT`); the FSM re-enters the right state and `abandonInFlightRound()`
   clears anything stale from the felt.

The engine tolerates a `RESULT` for a coup it never saw start — it will deal, reveal and
settle it from scratch.

---

## Verifying a server against the engine

`BaccaratRules` and `RoadmapEngine` are pure and dependency-free, so the same code can run
in Node to validate what your backend produces:

```ts
import { BaccaratRules, RoadmapEngine } from "@hkb/baccarat-engine";

const settlements = BaccaratRules.settle(bets, resultFromServer, config);
// compare against the server's own settlement before shipping
```
