# Backend integration

The engine has two modes and **one code path**. With `network.serverDriven: false` it drives
rounds itself; with `true` it follows. Nothing downstream of `GameManager` knows the
difference, which is what makes this a wiring exercise rather than a rewrite.

## Switching on server-driven mode

```ts
const game = createRouletteGame({
  network: { serverDriven: true, startingBalance: 0, currency: '$' },
});
await game.init(container);
```

Three behaviours change:

1. `GameManager` stops starting rounds. It waits to be told.
2. The countdown **stops closing betting** at zero — a client clock is not allowed to decide
   when a wager stops counting. It waits for `BET_CLOSED`.
3. `SYNC_TIMER` and `SYNC_BALANCE` from the server become authoritative.

## Wiring a socket

Frames map onto engine events one-to-one, so the adapter is genuinely this small:

```ts
import { createRouletteGame, GameEvent } from '@casino/roulette-engine';
import { io } from 'socket.io-client';

const game = createRouletteGame({ network: { serverDriven: true } });
await game.init(container);

const socket = io('wss://games.example.com/roulette');
const bus = game.events;

/* ---------- server -> client ---------- */

socket.on('round:start', ({ roundId }) => bus.emit(GameEvent.ROUND_START, { roundId }));

socket.on('bet:open', ({ roundId, duration }) =>
  bus.emit(GameEvent.BET_OPEN, { roundId, duration }),
);

socket.on('bet:closed', ({ roundId }) => bus.emit(GameEvent.BET_CLOSED, { roundId }));

socket.on('spin', ({ roundId, winningNumber }) =>
  bus.emit(GameEvent.SPIN_START, { roundId, winningNumber }),
);

// Authoritative corrections — safe to send on every tick.
socket.on('timer', ({ remaining, total }) =>
  bus.emit(GameEvent.SYNC_TIMER, { remaining, total }),
);
socket.on('balance', ({ balance }) => bus.emit(GameEvent.SYNC_BALANCE, { balance }));
socket.on('history', ({ entries }) => bus.emit(GameEvent.SYNC_HISTORY, { entries }));

/* ---------- client -> server ---------- */

bus.on(GameEvent.BET_PLACED, ({ spotId, amount }) =>
  socket.emit('bet:place', { spotId, amount }),
);
bus.on(GameEvent.UNDO_BET, () => socket.emit('bet:undo'));
bus.on(GameEvent.CLEAR_BET, () => socket.emit('bet:clear'));
bus.on(GameEvent.DOUBLE_BET, () => socket.emit('bet:double'));
bus.on(GameEvent.REPEAT_BET, () => socket.emit('bet:repeat'));
```

`ROUND_START`, `BET_OPEN`, `BET_CLOSED` and `SPIN_START` are handled by calling
`GameManager`'s public methods (`beginRound`, `openBetting`, `closeBetting`, `spinTo`). If
you prefer calling those directly instead of emitting, both work — the events exist so a
host never has to reach past `Game`.

## The critical ordering rule

**The winning number must arrive with `SPIN_START`, before the animation begins.** The
client animates *toward* a known outcome; it does not discover one. Sending the number after
the spin has started is the one integration mistake that cannot be worked around — the ball
would have to teleport.

This is also what makes the client un-exploitable in the way that matters: the outcome is the
server's, the client only renders it. Do not send the outcome earlier than the moment betting
closes, or a modified client could read it while bets are still open.

## Reconnection

The `SYNC_*` events exist for exactly this. On reconnect, replay current state:

```ts
socket.on('reconnect:state', (snapshot) => {
  bus.emit(GameEvent.SYNC_HISTORY, { entries: snapshot.history });
  bus.emit(GameEvent.SYNC_BALANCE, { balance: snapshot.balance });

  if (snapshot.phase === 'betting') {
    bus.emit(GameEvent.BET_OPEN, { roundId: snapshot.roundId, duration: snapshot.remaining });
    bus.emit(GameEvent.SYNC_TIMER, { remaining: snapshot.remaining, total: snapshot.duration });
  } else {
    game.reset();   // mid-spin on the server: sit the round out
  }
});
```

`reset()` is always safe, including mid-animation.

## Balance authority

Locally, `BetManager` debits on placement and credits on settlement so the readout responds
instantly. Server-driven, that local arithmetic is a *prediction*: `SYNC_BALANCE` overwrites
it whenever the server speaks. Send a balance frame after every accepted bet and every
payout and the prediction is never visible.

## Payout verification

`BetManager.resolve()` is pure, Pixi-free and exported — the same function can run on the
server:

```ts
import { TableLayout, BetType } from '@casino/roulette-engine';

const layout = new TableLayout(WheelType.EUROPEAN);
const spot = layout.getSpot('corner:1-2-4-5');   // → numbers, type, geometry
```

Running identical resolution logic on both sides means a client/server disagreement is a bug
you can diff, not two implementations you have to reconcile.

## Provably-fair support

`network.seed` seeds the client RNG (Mulberry32) used for local outcomes. For a provably-fair
deployment, keep the outcome server-side and publish the usual server-seed / client-seed /
nonce triple; the engine only needs the resulting number in `SPIN_START`.

## What the engine never does

- No network calls of its own. There is no `fetch` outside `AssetLoader`.
- No persistence. No `localStorage`, no cookies.
- No assumptions about auth. The host owns the socket and its credentials.
