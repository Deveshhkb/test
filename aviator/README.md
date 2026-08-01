# Aviator — AAA Crash Game

A production-grade Aviator (crash) game. PixiJS v8 + React 19 + GSAP client,
authoritative Node.js + Socket.io server, strict TypeScript everywhere.

## Monorepo layout

```
aviator/
├── shared/          # Contracts shared by client & server (phases, socket events)
├── client/          # React 19 + Vite + PixiJS v8 game client
└── server/          # Express + Socket.io authoritative game server
```

npm workspaces; a single `npm install` at this directory's root installs everything.

## Quick start

```bash
npm install
npm run dev          # client → http://localhost:5173
npm run dev:server   # server → http://localhost:8080 (separate terminal)
```

The Vite dev server proxies `/socket.io` and `/api` to the game server, so the
client works with or without the server running during early phases.

Other commands: `npm run build` · `npm test` · `npm run lint` · `npm run typecheck`.

## Client architecture (feature-based)

```
client/src/
├── app/            # App shell, router
├── pages/          # Route components (code-split)
├── game/
│   ├── engine/     # GameEngine, EventBus, StateMachine — no rendering details
│   ├── scenes/     # Scene base class, SceneManager, concrete scenes
│   └── GameCanvas.tsx  # The single React ↔ Pixi bridge
├── ui/             # DOM UI layered above the canvas (HUD, panels)
├── store/          # Zustand stores (engine writes, React reads)
├── config/         # Quality tiers, engine constants — no magic numbers in code
├── i18n/           # i18next setup + locale resources (no hardcoded strings)
├── utils/          # Pure helpers (ObjectPool, math) — unit tested
└── styles/         # Global CSS: tokens, glassmorphism primitives, safe areas
```

### Core principles

- **One-way data flow.** Engine/socket → Zustand store → React. React never
  touches Pixi objects; the engine never triggers renders directly.
  High-frequency values (FPS, multiplier) are throttled at the source.
- **Whitelisted state machine.** Round phases (`waiting → betting → countdown
  → takeoff → running → crash → result → celebration → reset`, plus
  `reconnect`/`recovery`) live in a validated transition table shared with the
  server. Illegal transitions are rejected loudly.
- **Scenes own rendering; the engine owns the loop.** `GameEngine` is a
  composition root (~150 lines) — Pixi app, ticker, scene manager, state
  machine. Everything visual lives in `Scene` subclasses with a strict
  lifecycle (`init → enter → update/resize → exit → destroy`).
- **Quality tiers.** One detected tier (`low…ultra`) drives resolution cap,
  antialiasing, particle density and post-processing so effects scale together
  on low-end Android through 4K desktop.
- **Server authority.** The client renders and predicts; the server decides.
  The typed socket contract in `shared/` is the only interface between them.

## Roadmap

| Phase | Scope | Status |
| ----- | ----- | ------ |
| 1 | Setup, architecture, renderer, engine foundation | ✅ this commit |
| 2 | Flight scene: plane, crash curve, cinematic camera | ⏳ |
| 3 | Procedural sky, atmosphere, weather, particles | ⏳ |
| 4 | Game UI: bet panel, history, panels, animations | ⏳ |
| 5 | Backend: round engine, provably fair, Redis, MongoDB | ⏳ |
| 6 | Multiplayer: live bets, chat, leaderboards | ⏳ |
| 7 | Audio, crash variants, celebrations, polish | ⏳ |
| 8 | Performance passes, accessibility, i18n expansion | ⏳ |
