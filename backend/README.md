# Multi-Game Casino Backend

Node.js/Express backend that runs **every game frontend in this repo from one
server, with one login and one shared wallet**. Sign in once at the lobby and
open any game.

## Run

```bash
cd backend
npm install
npm start
```

Then open **http://localhost:8080/** — log in (demo account: `demo` /
`demo1234`, balance 100000) and the lobby lists every game with **Play**
(desktop) and **Mobile** buttons.

## Games

| Game | gtype | matchId | Markets | Desktop folder | Mobile folder |
|---|---|---|---|---|---|
| Dragon Tiger | `dt20` | 14 | 38 | `dragonTiger_Web` | `dragontiger_mobile` |
| Dragon Tiger Lion | `dtl20` | 31 | 54 | `dragontigerlion_web` | `dragontigerlion_mobile` |
| 20-20 Teen Patti | `t20` | 15 | 2 | `teenpati` | `teenpatti_mobile` |
| Open Teen Patti | `otp` | 24 | 8 | `ovteenpatti` | `overtp_mobile` |
| Lucky 7-A | `lucky7A` | 12 | 6 | `lucky7_web` | `lucky7_mobile` |
| Amar Akbar Anthony | `aaa` | 20 | 22 (back + lay) | `aaatp_web` | `aaa_mobile` |
| Bollywood Casino | `bwdtbl` | 13 | 15 (back + lay) | `bollywood-web` | `bollywood_mobile` |

Andar Bahar (`ab20`) also exists as a backend game but has no frontend in the
repo, so it ships disabled in `games.config.json`.

All games run their rounds simultaneously and independently. Users, balances,
and bet history are shared across every game.

## Configure games — `games.config.json`

Every game is configured in `backend/games.config.json`. Any field overrides
the game module's default:

```jsonc
{
  "dt20": {
    "enabled": true,        // false = the game doesn't run and is hidden from the lobby
    "matchId": 14,
    "betSeconds": 45,       // betting window
    "minStake": 100,
    "maxStake": 100000,
    "rates": { "main": 1.98, "tie": 8, "pair": 6, "card": 12 },
    "layRates": { },        // aaa / bwdtbl only
    "groups": { }           // aaa / bwdtbl: which card ranks win each market
  }
}
```

`groups` uses card ranks where **1 = Ace, 11 = J, 12 = Q, 13 = K** — adjust
these to match your operator's exact rule set for Amar Akbar Anthony and
Bollywood Casino. Restart the server after editing.

Server-level settings are environment variables (see `src/config.js`):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | HTTP port |
| `JWT_SECRET` | `dev-secret-change-me` | **Change in production.** Signs login tokens |
| `ADMIN_KEY` | `admin-key-change-me` | **Change in production.** Guards `/auth/add-balance` |
| `DB_FILE` | `backend/data/db.json` | JSON datastore location |
| `GAMES_CONFIG` | `backend/games.config.json` | Games config location |

## Adding another game

1. Drop the frontend folder into the repo root.
2. Add a row to `GAME_SITES` in `backend/src/config.js` (gtype, title, web,
   mobile folder names) — this mounts it and lists it in the lobby.
3. Create `src/game/games/<gtype>.js` exporting a factory that returns:
   `gtype`, `name` (must equal the key the frontend reads from
   `bet-list-by-matchid`), `matchId`, timing (`betSeconds`, `reveals[]`,
   `resultAt`, `roundGap`), `minStake`/`maxStake`, `selections`
   (`sid`/`nat`/`rate`, where `nat` must match what the page looks up),
   `deal()`, `payout(sid, outcome)`, and `detail(outcome)`.
4. Register it in `MODULES` in `src/game/manager.js` and add a
   `games.config.json` entry.
5. Run `node backend/scripts/wire-frontends.js` to point the new pages at this
   backend.

## Wiring frontends — `scripts/wire-frontends.js`

The shipped frontends called four dead external services. This script rewrites
each game folder in place and is safe to re-run:

- replaces the hard-coded API hosts with this server's origin
- redirects to `/login.html` when a page is opened without a token, then
  returns the player to that game after login
- vendors axios/moment/toastify/randomColor into `assets/vendor/` so the games
  work offline
- makes the liability loop skip market slots the page never fills (several
  frontends loop past the end of their own odds table)

## API summary

Same endpoint pattern for every game — swap `dt20` for any gtype:

- `GET  /CasinoAdmin/GetData/dt20Data` — round state: `t1` (timer/cards), `t2` (selections)
- `GET  /CasinoAdmin/GetData/dt20Result` — last 10 results
- `GET  /CasinoAdmin/GameResultById?mid=` — full detail for one round (any game)
- `GET  /CasinoAdmin/Games` — all live games and their current rounds
- `GET  /api/lobby` — games that have both a frontend and a running round

Authenticated (`Authorization: Bearer <jwt>` — the token the frontend receives
as its `?id=` query parameter):

- `POST /auth/login` / `POST /auth/register` — `{ username, password }`
- `POST /auth/add-balance` — operator top-up, requires `x-admin-key` header
- `POST /VirtualCasinoBetPlacer/vc/place-bet` — `{ selectionId, stake, marketId, matchId, isBack }`
- `POST /VirtualCasinoBetPlacer/vc/liability` — per-selection exposure for a round
- `POST /VirtualCasinoBetPlacer/vc/casino-game-list` — all games
- `POST /admin-new-apis/enduser/get-user-balance` — balance + open exposure across all games
- `POST /admin-new-apis/enduser/get-stake-button` — chip values
- `POST /admin-new-apis/enduser/bet-list-by-matchid` — `{ matchId }` for one game, or omit for all

Also served: card images (`/images/cards/KHH.png`, generated SVG),
`/betfair_api/my-ip`, `/health`, the lobby/login pages, and every game folder
under `/games/<folder>/`.

## Betting

**Back bets** risk the stake and return `stake x rate` on a win.

**Lay bets** (Amar Akbar Anthony and Bollywood Casino send `isBack: false`)
risk `stake x (layrate - 1)` and win the backer's stake when the selection
loses. Odds always come from the server — the client's `odds` field is
ignored, so a tampered page cannot pay itself a better price.

## Game rules implemented

- **dt20** — higher card wins (Ace low); on a tie, Dragon/Tiger stakes are half-returned.
- **dtl20** — highest of three cards wins; a shared top splits the winner market's profit.
- **t20** — full teen patti ranking (trail > pure sequence > sequence > colour >
  pair > high card, Ace high, A-2-3 second-highest sequence); an exact tie is a push.
- **otp** — 8 players, three cards each, best hand wins; ties split the profit.
  All 24 cards ship in `C1` as one comma-separated string, as the page expects.
- **lucky7A** — below 7 = Low, above = High; on exactly 7, Low/High stakes are half-returned.
- **aaa** — one card; Amar/Akbar/Anthony groups are configurable back+lay markets.
- **bwdtbl** — one card; the five movie markets are configurable back+lay markets.

Cards are drawn with Node's CSPRNG (`crypto.randomInt`), shuffled fresh each round.

## Storage

A JSON file (`backend/data/db.json`, gitignored) persists users, bets, and
results — fine for development and small deployments. For production traffic,
replace `src/db.js` with a real database; all storage access goes through that
one module.
