# 🎰 Royal Fortune — HTML5 Slot Machine

A production-grade 5×3, 20-payline video slot in the style of Pragmatic Play / NetEnt /
Hacksaw Gaming titles. Built with **React 19 + PixiJS 8 + GSAP + Zustand + TypeScript**
on the front, and a **Node/Express RGS backend** (`server/`) that owns balance, RNG and
win evaluation — with a transparent in-browser fallback so the frontend also runs alone.

```bash
npm install
npm run dev      # backend :8080 + client :3000 (proxied) → http://localhost:3000
```

```bash
npm test           # unit + API tests (payline engine, RNG, engine, backend routes)
npm run build      # type-check + production bundle
npm start          # production: one process serves the built game + API on :8080
npm run dev:client # frontend only (falls back to the in-browser mock RGS)
npm run dev:server # backend only
```

No binary assets are required — all textures are generated procedurally at boot and all
audio is synthesized with the Web Audio API. Reskinning means swapping the generators
for `Assets.load(...)` / decoded audio buffers behind the same cache APIs.

---

## Feature summary

| Area | What's implemented |
| --- | --- |
| Reels | Real reel motion (no faked frame swaps): acceleration → constant speed → eased deceleration with overshoot bounce, motion blur, staggered starts/stops, scatter anticipation slow-roll on reel 5, virtual weighted strips, infinite scroll, object-pooled symbols (5 sprites per reel, re-textured forever) |
| Spin types | Normal, Quick, Turbo, Auto (10/25/50/100/∞ + Stop), Free Spins, Bonus |
| Betting | Bet level ±, coin value ±, total bet, balance, win readouts |
| Features | Wild, expanding wild (free spins), sticky wild (free spins), scatter, free spins w/ retrigger, ×2 free-spin multiplier, random wild drop, mystery symbol, cascading (tumble) wins with ×1/×2/×3 progression |
| Free spins | Darkened world, camera zoom, intro/outro splashes, music restart, banner with remaining spins + running total, full restore afterwards |
| Win presentation | Payline traces, symbol glow + scale pulse, sparkle/star particles, floating win amount |
| Mega wins | Big / Mega / Super Mega / Epic / Legendary tiers — escalating counter duration, coin fountains, camera shake, tap-to-skip counter |
| Particles | Pooled particle system (400 sprites, zero allocation per burst): coins, stars, sparkles, fire, smoke, magic |
| UI | Balance/bet/win HUD, spin/turbo/auto cluster, settings, paytable & rules, history, menu, sound toggle, fullscreen, bonus pick modal, error toast, game-over screen. Space bar spins. |
| Settings | Music/sound volume, turbo, quick spin, language, graphics quality — persisted to localStorage and mirrored to the API |
| Responsive | Fixed 1280×720 design space letterbox-scaled by `ResizeObserver`; CSS handles desktop / tablet / landscape / portrait breakpoints + safe-area insets |
| Audio | Web Audio API graph (master → music/sfx buses) — spin loop, reel stops, wins, scatter, bonus, free spins, big-win fanfare, buttons, coins |
| States | Loading → Idle → Spin → Stopping → Evaluating → Win → Bonus / FreeSpin / AutoSpin → GameOver |
| Backend | Express RGS (`server/`): session-per-player (`x-session-id` issued at login, 30-min TTL), CSPRNG (`crypto.randomInt`), typed error responses, health endpoint, static serving of `dist/` in production |
| API | Axios service (`login/spin/bonus/collect/history/settings`) with timeout, typed errors, response validation, session header injection, and transparent fallback to the in-browser mock RGS on network failure |
| Math | Weighted virtual reel strips per reel, configurable volatility (low/med/high), ~96.5% simulated RTP (tuned via 20k-spin simulation), win evaluation lives server-side (mock) |
| Errors | Lost internet / API failure / timeout / invalid response / asset failure surfaced via toast; optimistic bet refunds on failure |

## Project structure

```
server/
  app.ts         Express RGS: routes, sessions, error handling  (+ API tests)
  index.ts       entry point: CSPRNG wiring, static dist/ serving
src/
  animations/    AnimationManager — tracked GSAP tweens + reusable presets
  api/           axios client, gameApi facade, mock RGS (mockServer)
  assets/        global CSS (all art/audio is procedural)
  components/    React UI (HUD, TopBar, panels, bonus modal, canvas host)
  config/        gameConfig — paylines, paytable, strips, features, win tiers
  constants/     layout + physics + betting constants
  effects/       ParticleSystem, presets, WinPresentation, BigWinOverlay
  hooks/         useGameEngine (Pixi lifecycle), useFullscreen
  reels/         Reel (physics), ReelManager, ReelSymbol, SymbolPool
  scenes/        SlotGame (app shell), LoadingScene, GameScene
  services/      GameController (flow), SoundManager, AssetManager, EventBus
  store/         Zustand stores: gameStore, settingsStore (persisted)
  types/         shared domain types
  utils/         paylineEngine (pure win math), rng, format  (+ tests)
```

## Architecture notes

- **Server-authoritative math, one engine.** The client never decides outcomes.
  `src/services/SlotEngine.ts` owns balance, RNG, feature state and win evaluation and
  returns the `SpinResult` contract
  (`{ balance, bet, totalWin, reels, paylines, scatter, freeSpins, multiplier, ... }`).
  The Node backend runs one engine per session (backed by `crypto.randomInt`); the
  in-browser mock runs the same engine as an offline fallback, so behaviour is
  identical either way. `VITE_API_URL` targets a remote RGS; `VITE_USE_MOCK=true`
  forces mock-only.
- **Store as the bridge.** React reads Zustand via hooks; the Pixi world reads it via
  `getState()/subscribe`. `GameController` is the single orchestrator that talks to
  both the API and the scene.
- **Deterministic testability.** The RNG source is injectable (`setRandomSource`), so
  the payline engine, strips and the whole mock server are unit-tested with seeded
  runs — including a 3,000-spin statistical RTP guard.
- **Performance.** One ticker; pooled reel symbols and particles; textures generated
  once and cached; every GSAP tween is tracked and killed on teardown; Pixi containers
  and textures are destroyed explicitly on unmount.

## Tuning the math

Everything a math team would touch is in `src/config/gameConfig.ts`: paylines,
paytable, per-reel symbol weights, volatility shifts, feature odds, cascade
multipliers, free-spin rules and win-tier thresholds. RTP was tuned by simulation;
if you change weights, re-check with a quick 20k-spin run against `mockServer.spin`.

## API contract

Implemented by `server/app.ts` (and mirrored by the in-browser mock). All routes
except `/login` and `/health` require the `x-session-id` header issued at login.

| Endpoint | Body | Returns |
| --- | --- | --- |
| `POST /api/login` | — | `{ playerId, balance, currency, sessionId }` |
| `POST /api/spin` | `{ bet }` | `SpinResult` (see `src/types/index.ts`); `400 {error}` on bad/unaffordable bets |
| `POST /api/bonus` | `{ pickedIndex }` | `{ balance, prize, options, pickedIndex }` |
| `POST /api/collect` | — | `{ balance }` |
| `GET /api/history` | — | `HistoryEntry[]` |
| `POST /api/settings` | `GameSettings` | `GameSettings` |
| `GET /api/health` | — | `{ ok, sessions }` |

To swap in your own RGS, reimplement these routes (or reuse `SlotEngine` — it is
plain TypeScript with an injectable RNG) and point `VITE_API_URL` at it.
