# NEON BREAK

Premium cyberpunk **6×5 ways video slot** (15,625 ways) with cascading reels, free spins with a
growing multiplier, an interactive Boss Fight bonus, and Big / Mega / Epic / Lucky Win
presentations. **Virtual credits only.**

| Layer | Stack |
| --- | --- |
| Client | React 19, Vite 7, TypeScript, **PixiJS 8**, **GSAP 3**, Zustand 5, Socket.io client |
| Server | Node 22, Express 4, Socket.io 4, Zod, JWT (demo auth), Mongoose 8 (MongoDB), ioredis (Redis) |
| Shared | `@neon/game-math` (pure TS math engine), `@neon/shared` (API contract, schemas, socket events) |
| Tests | Vitest, React Testing Library, Supertest, socket.io-client, Playwright |

```
premium-slot-game/
├── packages/
│   ├── game-math/       ways evaluator, cascades, scatter, free spins, boss fight, lucky rule, RNG
│   └── shared/          zod schemas, API/socket types, public boss-fight view
├── apps/
│   ├── server/src/      config · controllers · routes · socket · services · models · store · middleware
│   │   └── game/        engine · math · evaluator · bonus · freeSpins (server wrappers of game-math)
│   └── client/src/
│       ├── game/        core · reels · symbols · animations · particles · bonus · freeSpins · character · audio · assets
│       ├── components/  HUD, spin button, modals            stores/  game, player, bet, settings, bonus, layout, ui
│       ├── services/    REST + Socket.io transport           hooks/   count-up, keyboard, spin-button state
│       └── styles/
├── scripts/simulate.ts  Monte-Carlo RTP simulation
├── Dockerfile · docker-compose.yml
```

## Quick start

```bash
npm install
npm run dev            # server :4000 (in-memory store) + client :5173
```

Open http://localhost:5173 and press **TAP TO PLAY** (also unlocks audio).

Without `MONGO_URI` / `REDIS_URL` the server uses an in-memory store and cache. That's fine for local
play, but data is lost on restart and it only works as a single instance. With Docker:

```bash
docker compose up --build   # app + MongoDB 7 + Redis 7 on http://localhost:4000
```

Production build (the server serves the built client from one port):

```bash
npm run build && npm start
```

## Gameplay & math

- **Ways to win**: 3+ matching symbols on adjacent reels starting from reel 1. Ways are the product
  of the matching positions on each reel, and each symbol is paid once.
- **WILD** (reels 2–6) substitutes for every paying symbol, but never for SCATTER or BONUS.
- **Cascades**: winning symbols explode, the remaining symbols fall, and new symbols drop in.
  Cascade multiplier ladder ×1, ×1, ×2, ×3, ×5, up to 20 cascades.
- **Free spins**: 3/4/5/6 scatters award 10/12/15/20 spins (retriggers +5/8/10/15). A persistent
  multiplier grows +1 after every winning free spin, up to ×10.
- **Boss Fight**: 3+ BONUS symbols in the base game. You get 3 shots, each revealing a multiplier
  tier (5×/10×/15×/50× bet, weighted). All rewards are **generated with the round**, and a pick
  only reveals the next predetermined reward.
- **Lucky Win**: a deterministic presentation rule (3+ winning cascades, or a single win using 3+
  wilds). It never changes the payout. While the reels are stopping, the spin button switches to
  the *Lucky Spin* state.
- **Win tiers**: Big ≥ 15×, Mega ≥ 40×, Epic ≥ 100× bet. Maximum win is 5,000× bet.

Everything is configurable in `packages/game-math/src/config.ts`: symbol weights per reel, pays,
ladders, thresholds and bet levels. Operators can also merge overrides with
`GAME_CONFIG_OVERRIDES` (JSON).

Simulation of the default configuration (`npm run simulate -- 300000 7`):

| Metric | Value |
| --- | --- |
| Total RTP | **96.41 %** (base 65.08 %, free spins 23.49 %, boss 7.85 %) |
| Hit frequency | 43.6 % |
| Free spins | ~1 in 203 spins |
| Boss fight | ~1 in 403 spins |

> These are simulation numbers for a virtual-credit demo. Any real-money use would require
> independent RNG/math certification, regulatory approval, licensing and a security audit.

## Server authority & integrity

- Outcomes come from `node:crypto.randomInt`, are generated **only** on the server
  (`RoundEngine` → `playRound`), and the full round is persisted (`SETTLING`) **before** anything
  is sent to the client.
- The ledger has a unique key per round and type (`roundId:BET|WIN|BONUS_WIN`), and balance
  changes are atomic. In Mongo this is a conditional `findOneAndUpdate` with `$inc` and
  `balance >= bet`.
- A per-user Redis lock (`SET NX PX` plus a safe Lua release) blocks concurrent spins. Idempotency
  keys are cached in Redis for 24h, with a persistent fallback (unique index
  `userId + idempotencyKey`).
- Rounds left in `SETTLING` after a crash are settled exactly once on the next request or
  reconnection. Unfinished boss fights and free spins are restored on reconnect.
- The client never sends outcomes, payouts, balances, multipliers or rewards. During free spins
  the bet is taken from the server's session.

### REST API

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/demo` | creates a demo user (125,600.00 credits) and returns a JWT |
| POST | `/api/game/session` | session state: balance, free spins, pending boss fight, last round |
| POST | `/api/game/spin` | `{ bet, idempotencyKey }` (bet in minor units) |
| POST | `/api/game/bonus/pick` | `{ roundId, targetIndex, idempotencyKey }` |
| GET | `/api/game/balance` · `/api/game/history` · `/api/game/paytable` · `/api/game/config` · `/api/health` | |

### Socket.io events

Client → server (with ack): `game:join`, `game:resume`, `game:spin`, `game:bonusPick`.
Server → client: `game:state`, `game:spinAccepted`, `game:reels`, `game:cascade`, `game:win`,
`game:balance`, `game:freeSpins`, `game:bonus`, `game:error`. Results are pushed to every tab of
the user. If the socket is down, the client falls back to REST, retrying with the **same**
idempotency key.

## Client architecture

- **React** renders the HUD: header, balance, bet, the spin button with
  idle/hover/pressed/spinning/disabled/auto/turbo/lucky states, modals (paytable, rules, history,
  settings, auto spin, menu), toasts and the loading screen.
- The HUD is laid out in the *same design space* as the Pixi stage and scaled with one transform,
  so controls always line up with the reels. There are two layouts:
  - landscape: 1500–2100 × 1080
  - portrait: 1080 × 1500–2400
- **PixiJS 8** renders everything game-related. The main modules:
  - `GameApplication`, `GameStage`, `ResizeManager` (ResizeObserver, DPR up to 2),
    `BackgroundAnimator`
  - `ReelManager` / `Reel` / `ReelController`: masked strips of 7 pooled `SymbolView`s per reel
    that really move; the stop lands exactly on the server grid with a landing bounce
  - `SymbolFactory`, `SymbolAnimator`, `WinAnimator`, `CascadeManager`, `ParticleManager`
    (pooled sprites, no per-frame allocations)
  - `CelebrationController` (Big / Mega / Epic) and `LuckyWinController`
  - `FreeSpinsPresenter`, `BossFightScene`, `CharacterAnimator`, `AudioManager`
- **GSAP** drives acceleration, deceleration, bounce, cascades, celebrations, character reactions
  and transitions. Timelines are killed on cleanup, and lag smoothing is disabled so presentations
  stay in sync with real time.
- **Zustand** holds the stores: `gameStore` (a guarded state machine:
  IDLE → SPIN_REQUESTED → SPINNING → REEL_STOPPING → EVALUATING → CASCADING → WIN_PRESENTATION →
  FREE_SPINS / BONUS / ERROR), `playerStore` (authoritative balance vs display balance),
  `betStore`, `settingsStore` (persisted), `bonusStore`, `layoutStore`, `uiStore`, `configStore`.
- `GameFlowController` orchestrates each round:
  request → spin → server stop → cascades → scatter/bonus emphasis → win tier → free spins →
  boss fight → auto spin.

Controls: **Space/Enter** spins. Tapping the reels or the spin button while spinning does a quick
stop. Tapping a celebration completes the count, and a second tap closes it.

## Tests

```bash
npm test               # game-math (28) + server (22) + client (35) unit/integration tests
npm run test:e2e       # Playwright: full demo rounds, bet changes, double-click guard, menus, auto spin, mobile
```

- **Game math**: ways, wilds, scatters, multiple wins, payouts, cascade chain consistency, the
  multiplier ladder, free spins progression, boss fight generation, win tiers, the lucky rule,
  the max-win cap and an RTP smoke test.
- **Server**: auth, bet validation, insufficient funds, idempotency (including after cache loss),
  concurrent spins with a ledger consistency check, transaction integrity over 40 rounds, round
  persistence and history, server-driven free spins, boss fight reveal and single credit, crash
  recovery, CSPRNG distribution, socket gameplay, reconnection with a pending bonus, and a **real
  Redis** integration (skipped automatically if `redis-server` is missing).
- **Client**: the state machine (valid/invalid transitions, duplicate-spin guard), stores, all
  spin-button states, controls, header and settings audio controls, responsive layout for every
  target viewport, network retries with the same idempotency key, the AudioManager (unlock,
  dedupe, mute) and the **reel engine** (moving symbols, landing on the target grid, cascade
  gravity).

## Asset checklist

There are no external or third-party image or audio files. **All artwork is original and authored
in code**: SVG and Canvas2D, baked at boot into texture atlases (`src/game/assets`). All audio is
synthesised with the Web Audio API. Fonts are self-hosted via `@fontsource` (Orbitron, Rajdhani,
Russo One, all under the OFL licence).

| # | Asset | Status |
| --- | --- | --- |
| 1 | Cyberpunk city background (base / free spins / boss variants) | ✅ procedural Canvas2D plus animated neon signs, searchlights, dust, air-car lights |
| 2 | Female heroine full body | ✅ SVG (`art/characters.ts`) |
| 3–5 | Character idle / celebration / shooting animation | ✅ transform-based rig: breathing, ponytail sway, gun glow, jump, recoil. ⚠️ No frame-by-frame sprite sheets; can be replaced with Spine or sprite sheets later |
| 6–7 | Male fighter, female hacker, soldier, hero symbols | ✅ SVG portraits |
| 8–10 | Plasma rifle, energy blaster, cyber helmet, neon grenade, power cell, holo deck | ✅ SVG |
| 11–13 | WILD, SCATTER, BONUS | ✅ SVG with Canvas text labels |
| 14–17 | Big / Mega / Epic / Lucky Win typography and effects | ✅ Pixi Text with gradients, beams, rings, wings, star, particles |
| 18–19 | Boss mech and health bar | ✅ SVG mech and Pixi Graphics bar |
| 20 | Particle textures (coin, spark, star, clover, glow, ring, shard, bolt) | ✅ Canvas atlas |
| 21 | Button icons | ✅ inline SVG |
| 22–23 | Sound effects and background music | ✅ Web Audio synthesis (21 SFX, synthwave loop) |

The art is clean vector work that follows the reference's composition, palette and mood. It is
**not** painterly illustration. For a commercial release, replace the SVG sources in
`src/game/assets/art/` with painted or 3D-rendered PNG/WebP atlases. The texture keys and the
`SymbolView` pipeline stay the same. `/preview.html` (dev server) shows every generated asset.

## Known limitations

- The MongoDB store (`apps/server/src/store/mongoStore.ts`) is implemented with atomic updates and
  unique indexes, but the automated tests run against the in-memory store. No MongoDB binary was
  available in the development sandbox, so validate it with `docker compose up` before deploying.
- Multi-document transactions aren't used. Integrity relies on ordered writes, unique ledger keys
  and crash recovery. Use a replica set and transactions for stricter guarantees.
- Headless CI renders WebGL through SwiftShader at a few FPS. Real GPUs run the scene at 60 FPS,
  but the E2E timeouts are deliberately generous.
