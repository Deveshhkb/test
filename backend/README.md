# Multi-Game Casino Backend

Node.js/Express backend that runs **multiple virtual casino games on one
server with one shared wallet**. It powers the `dragonTiger_Web` frontend and
exposes the same API pattern for every other game, so future game frontends
plug straight in.

## Games included

| Game | gtype | matchId | Markets |
|---|---|---|---|
| Dragon Tiger 20-20 | `dt20` | 14 | 38 (main, tie, pair, even/odd, red/black, per-card) |
| Lucky 7 | `lucky7` | 27 | 19 (low/high, even/odd, red/black, per-card) |
| 20-20 Teen Patti | `teen20` | 21 | 4 (Player A/B, Pair Plus A/B) |
| Andar Bahar | `ab20` | 26 | 2 (Andar, Bahar) |

All games run their rounds simultaneously and independently; users, balances,
and bets are shared across games.

## Run

```bash
cd backend
npm install
npm start          # http://localhost:8080
```

Open **http://localhost:8080/login.html** — a demo account is seeded on first
run (`demo` / `demo1234`, balance 100000).

## Configure games — `games.config.json`

Every game is configured in `backend/games.config.json`. Any field overrides
the game module's default:

```jsonc
{
  "dt20": {
    "enabled": true,        // false = game doesn't run
    "matchId": 14,
    "betSeconds": 45,       // betting window
    "minStake": 100,
    "maxStake": 100000,
    "rates": { "main": 1.98, "tie": 8, "pair": 6, ... }   // odds
  }
}
```

Restart the server after editing. Server-level settings (port, secrets, chips,
starting balance) are environment variables / `src/config.js`:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | HTTP port |
| `JWT_SECRET` | `dev-secret-change-me` | **Change in production.** Signs login tokens |
| `ADMIN_KEY` | `admin-key-change-me` | **Change in production.** Guards `/auth/add-balance` |
| `DB_FILE` | `backend/data/db.json` | JSON datastore location |
| `FRONTEND_DIR` | `../dragonTiger_Web` | Static frontend directory |
| `GAMES_CONFIG` | `backend/games.config.json` | Games config location |

## Adding a new game

1. Create `src/game/games/<gtype>.js` exporting a factory that returns:
   `gtype`, `name`, `matchId`, timing fields (`betSeconds`, `reveals[]`,
   `resultAt`, `roundGap`), `minStake`/`maxStake`, `selections` (sid/nat/rate),
   `deal()` (returns the round outcome incl. `cards` and `winner`),
   `payout(sid, outcome)` (stake multiplier: 0 lost, rate won, 0.5 half
   refund, 1 push), and `detail(outcome)` (extra result fields).
2. Register it in `MODULES` in `src/game/manager.js`.
3. Add its entry to `games.config.json`.

The generic engine (`src/game/engine.js`) handles the round lifecycle, timed
card reveals, bet validation, settlement, liability, and result history for
every game. Cards are drawn with Node's CSPRNG.

## API summary

Same endpoint pattern for every game — replace `dt20` with any gtype:

- `GET  /CasinoAdmin/GetData/dt20Data` — round state: `t1` (timer/cards), `t2` (selections)
- `GET  /CasinoAdmin/GetData/dt20Result` — last 10 results
- `GET  /CasinoAdmin/GameResultById?mid=` — full detail for one round (any game)
- `GET  /CasinoAdmin/Games` — all live games and their current rounds

Authenticated (`Authorization: Bearer <jwt>`, the token the frontend gets as
its `?id=` query parameter):

- `POST /auth/login` / `POST /auth/register` — `{ username, password }` → `{ data: { token, username, balance } }`
- `POST /auth/add-balance` — operator top-up, requires `x-admin-key` header
- `POST /VirtualCasinoBetPlacer/vc/place-bet` — `{ selectionId, stake, marketId, matchId }`; the game is resolved from `matchId` (or the round id)
- `POST /VirtualCasinoBetPlacer/vc/liability` — per-selection potential profit for a round
- `POST /VirtualCasinoBetPlacer/vc/casino-game-list` — all games
- `POST /admin-new-apis/enduser/get-user-balance` — balance + open exposure across all games
- `POST /admin-new-apis/enduser/get-stake-button` — chip values
- `POST /admin-new-apis/enduser/bet-list-by-matchid` — `{ matchId }` for one game, or omit for all games grouped by name

Also served: card images (`/images/cards/KHH.png`, generated SVG),
`/betfair_api/my-ip`, `/health`, and the frontend as static files.

## Game rules implemented

- **dt20**: higher rank wins (Ace low); on tie, Dragon/Tiger stakes half-returned.
- **lucky7**: below 7 = Low, above = High; on a 7, Low/High stakes half-returned.
- **teen20**: full teen patti ranking (trail > pure sequence > sequence >
  colour > pair > high card, Ace high, A-2-3 second-highest sequence); exact
  tie is a push; Pair Plus pays 1/4/6/30/40-style multipliers (see module).
- **ab20**: joker cut, cards dealt alternately Andar first; matching side wins.

## Storage

A JSON file (`backend/data/db.json`, gitignored) persists users, bets, and
results — fine for development and small deployments. For production traffic,
replace `src/db.js` with a real database; all storage access goes through that
one module.
