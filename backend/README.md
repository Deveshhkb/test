# Dragon Tiger Backend

Node.js/Express backend for the `dragonTiger_Web` frontend. It replaces all four
external services the original frontend depended on with a single server:

| Original service | Now served at |
|---|---|
| Game data feed (`52.220.88.240:8080`) | `/CasinoAdmin/...` |
| Bet placer (`13.250.53.81`) | `/VirtualCasinoBetPlacer/vc/...` |
| User/admin API (`23.106.234.25:8192`) | `/admin-new-apis/enduser/...` |
| Card images (`admin.kalyanexch.com`) | `/images/cards/<CODE>.png` (generated SVG) |
| IP echo (`oddsapi.247idhub.com`) | `/betfair_api/my-ip` |

It also serves the frontend itself as static files, so the whole game runs from
one process on one port.

## Run

```bash
cd backend
npm install
npm start          # http://localhost:8080
```

Open **http://localhost:8080/login.html** — a demo account is seeded on first
run (`demo` / `demo1234`, balance 100000). New accounts can be created from the
login page and start with the same balance.

## Configuration (environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | HTTP port |
| `JWT_SECRET` | `dev-secret-change-me` | **Change in production.** Signs login tokens |
| `ADMIN_KEY` | `admin-key-change-me` | **Change in production.** Guards `/auth/add-balance` |
| `DB_FILE` | `backend/data/db.json` | JSON datastore location |
| `FRONTEND_DIR` | `../dragonTiger_Web` | Static frontend directory |

## Game loop

Each round: **45 s betting window** → betting closes → dragon card revealed
(+1 s) → tiger card revealed (+2.5 s) → result published & bets settled (+4 s)
→ next round (+10 s). Cards are drawn from a fresh 52-card deck using Node's
CSPRNG (`crypto.randomInt`). Timings live in `src/config.js`.

Winner codes match the frontend: `1` = Dragon, `2` = Tiger, `3` = Tie.

### Markets (38 selections, sid 1–38)

Dragon/Tiger 1.98, Tie 8, Pair 6, Even 2.12, Odd 1.83, Red/Black 1.95, and
specific-card markets (A–K for each side) at 12. On a **Tie**, main
Dragon/Tiger bets get half the stake back (standard casino rule); all other
markets settle normally. Rates are in `src/game/selections.js`.

## API summary

Authenticated endpoints require `Authorization: Bearer <jwt>` (the token the
frontend receives as the `?id=` query parameter after login).

- `POST /auth/login` / `POST /auth/register` — `{ username, password }` → `{ data: { token, username, balance } }`
- `POST /auth/add-balance` — operator top-up, requires `x-admin-key` header
- `GET  /CasinoAdmin/GetData/dt20Data` — round state: `t1` (timer/cards), `t2` (38 selections)
- `GET  /CasinoAdmin/GetData/dt20Result` — last 10 results
- `GET  /CasinoAdmin/GameResultById?mid=` — detail for one round
- `POST /VirtualCasinoBetPlacer/vc/place-bet` — `{ selectionId, stake, marketId }`
- `POST /VirtualCasinoBetPlacer/vc/liability` — per-selection potential profit for the round
- `POST /VirtualCasinoBetPlacer/vc/casino-game-list`
- `POST /admin-new-apis/enduser/get-user-balance`
- `POST /admin-new-apis/enduser/get-stake-button` — chip values
- `POST /admin-new-apis/enduser/bet-list-by-matchid` — today's bets
- `GET  /health`

## Storage

A simple JSON file (`backend/data/db.json`, gitignored) persists users, bets,
and results — fine for development and small deployments. For production
traffic, replace `src/db.js` with a real database; all storage access goes
through that one module.

## Frontend changes made

- `assets/livegame.js`: API base URLs now point at `window.location.origin`
  (was four hardcoded IPs); redirects to `login.html` when no token is present.
- `index.html`: axios, moment, toastify, and randomColor are vendored in
  `assets/vendor/` instead of loaded from CDNs, so the game works offline.
- `login.html`: new login/register page that obtains the JWT and opens the game
  with `?id=<token>&username=<user>` exactly as the game page expects.
