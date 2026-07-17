# 🎰 Royal Fortune — HTML5 Slot Machine

A production-grade 5×3, 20-payline video slot in the style of Pragmatic Play / NetEnt /
Hacksaw Gaming titles. Built with **React 19 + PixiJS 8 + GSAP + Zustand + TypeScript**,
fully responsive, and runs entirely client-side out of the box (mock RGS included) —
ready to be pointed at a real backend later.

```bash
npm install
npm run dev      # → http://localhost:3000
```

```bash
npm test         # unit tests (payline engine, RNG, mock server, utils)
npm run build    # type-check + production bundle
npm run preview  # serve the production build
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
| API | Axios service (`login/spin/bonus/collect/history/settings`) with timeout, typed errors, response validation, and transparent fallback to the in-memory mock RGS on network failure |
| Math | Weighted virtual reel strips per reel, configurable volatility (low/med/high), ~96.5% simulated RTP (tuned via 20k-spin simulation), win evaluation lives server-side (mock) |
| Errors | Lost internet / API failure / timeout / invalid response / asset failure surfaced via toast; optimistic bet refunds on failure |

## Project structure

```
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

- **Server-authoritative math.** The client never decides outcomes. `mockServer.ts`
  plays the role of a real RGS: it owns balance, RNG, feature state and win
  evaluation, and returns the exact `SpinResult` contract a backend would
  (`{ balance, bet, totalWin, reels, paylines, scatter, freeSpins, multiplier, ... }`).
  Point `VITE_API_URL` at a real backend and set `VITE_USE_MOCK=false` — nothing else
  changes.
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

## Backend integration

Implement these endpoints and the game works unchanged:

| Endpoint | Body | Returns |
| --- | --- | --- |
| `POST /login` | — | `{ playerId, balance, currency }` |
| `POST /spin` | `{ bet }` | `SpinResult` (see `src/types/index.ts`) |
| `POST /bonus` | `{ pickedIndex }` | `{ balance, prize, options, pickedIndex }` |
| `POST /collect` | — | `{ balance }` |
| `GET /history` | — | `HistoryEntry[]` |
| `POST /settings` | `GameSettings` | `GameSettings` |
