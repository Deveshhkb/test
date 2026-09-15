# OptionPulse

Indian options market analysis for **NIFTY 50**, **BANK NIFTY** and **SENSEX**.

OptionPulse answers one question quickly: *what is happening in the Indian options market
right now, and what does the available data suggest about market bias?* It is an **analysis
platform, not a brokerage** - there is no order execution anywhere in it.

> Market data and analytics are provided for informational and educational purposes only and
> should not be considered financial advice.

This app lives alongside the unrelated `pixi-project/` demo in the same repository and shares
its toolchain conventions (Vite, strict TypeScript, ESLint flat config + Prettier).

---

## Running it

```bash
cd optionpulse
npm install

npm run dev          # web app on http://localhost:5180 (in-browser mock provider)
npm run dev:server   # API on http://localhost:4000 + ws://localhost:4000/ws/market
npm run dev:all      # both

npm run build        # typecheck (tsc -b) + production bundle
npm run lint
npm test             # calculation test suite
```

By default the browser uses the **in-browser mock provider** and needs no backend. To talk to
the Node API instead, copy `.env.example` to `.env` and set `VITE_API_BASE_URL=/api`; Vite
proxies `/api` to `http://localhost:4000`.

Everything the app currently shows is **simulated**, generated on-device by seeded random
walks, and is labelled `MOCK DATA` throughout. It is never labelled `LIVE`.

---

## Architecture

```
components -> hooks -> store (Redux Toolkit) -> services -> provider -> data source
                                 |
                          calculations/        (pure, shared with the backend)
```

| Layer | Location | Responsibility |
|---|---|---|
| Provider | `src/services/providers` | The only seam to a data source. `MarketDataProvider` is an abstract class; `MockMarketDataProvider` and `HttpMarketDataProvider` implement it. |
| Services | `src/services/*` | Provider-agnostic facades (`marketData`, `optionChain`, `historicalData`, `analysis`). |
| Store | `src/store` | Server state (`market`, `optionChain`, `chart`) kept separate from UI state (`ui`). Derived values live in memoised selectors, never duplicated into state. |
| Calculations | `src/calculations` | Pure functions: indicators, option analytics, market models. No React, no I/O. |
| Backend | `server/` | Express API + WebSocket hub. Owns every vendor credential. Reuses `src/calculations` so the two sides can never disagree. |

### Calculation modules

```
calculations/
  indicators/  ema - sma - rsi - macd - vwap - bollinger
  options/     atm - moneyness - pcr - maxPain - buildup - supportResistance -
               greeks - oiAnalysis - chainAnalytics - chainFilters
  market/      marketBias - marketBreadth
```

Nothing in the UI computes a formula inline. `getATMStrike`, `detectBuildup`,
`calculateMaxPain`, `calculateMarketBias` and the rest are imported, not re-implemented.

### Data provenance

Every figure carries a mode: `MOCK`, `DELAYED`, `LIVE`, `CALCULATED` or `ESTIMATED`
(`src/config/dataMode.ts`). Simulated data is never presented as live, and derived values are
badged `CALCULATED` rather than quoted. When a request fails the UI shows an error state - it
never falls back to inventing numbers.

### Market bias engine

`calculations/market/marketBias.ts` scores up to eleven factors (price momentum, EMA trend,
RSI, MACD, VWAP, breadth, India VIX, FII/DII, PCR, OI structure, support/resistance) using
weights from `config/marketBias.config.ts`, then maps the total onto bands:

| Score | Label |
|---|---|
| +8 and above | STRONG BULLISH |
| +3 to +7 | BULLISH |
| -2 to +2 | SIDEWAYS |
| -3 to -7 | BEARISH |
| -8 and below | STRONG BEARISH |

A factor with no input is **skipped**, not scored neutral, and the UI always renders the full
factor breakdown. This is an analytical score describing current conditions - not a prediction
and not a recommendation.

### Greeks

`calculations/options/greeks.ts` implements Black-Scholes with its assumptions documented in
the file (European exercise, constant rate and volatility, ACT/365, optional continuous
dividend yield). Everything it produces is tagged `source: "CALCULATED"` so the UI can keep it
distinct from greeks a provider publishes. Implied volatility is solved by bisection, which
cannot diverge on near-expiry or deep-ITM quotes, and returns `null` rather than a guess when
a quote sits outside what the model can reproduce.

---

## API

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Service status and configured mode |
| `GET /api/market/indices` | Snapshot: three indices, VIX, breadth, FII/DII, session status |
| `GET /api/market/index/:symbol` | Single index quote |
| `GET /api/market/nifty` `/banknifty` `/sensex` | Fixed-symbol shorthands |
| `GET /api/options/expiries/:symbol` | Expiry ladder |
| `GET /api/options/chain/:symbol?expiry=` | Option chain (nearest expiry when omitted) |
| `GET /api/options/history/:symbol?timeframe=` | Candles |
| `GET /api/analytics/:symbol?expiry=` | PCR, max pain, OI structure, support/resistance |

`ws://localhost:4000/ws/market` accepts `subscribe:quotes` and `subscribe:chain` messages and
pushes `quote` / `chain` updates.

### Security

Provider credentials are read only in `server/config/env.ts` and never leave the backend.
Anything prefixed `VITE_` is inlined into the browser bundle, so no secret may go there. Path
and query parameters are validated (`server/middleware/validation.ts`) before reaching a
service, and error responses never echo configuration.

---

## Connecting real market data

1. Implement `ServerMarketDataProvider` (`server/providers/`) against a **licensed** vendor.
2. Register it in `server/providers/index.ts`.
3. Set `MARKET_DATA_MODE=live` and the vendor credentials in `.env`.
4. Point the frontend at the API with `VITE_API_BASE_URL=/api` and `VITE_DATA_MODE=live`.

No UI, store or calculation code changes. Do not scrape exchange or broker websites, and do
not assume publicly visible market data is licensed for redistribution.

---

## Conventions

- Strike intervals, lot sizes, expiry weekdays and session hours are **configuration**
  (`src/config/`), never literals in components.
- Option-chain rows are memoised with a value comparator so a streamed update repaints only
  the strikes that actually moved.
- Chart instances are created once and mutated; they are never recreated on render.
- Transient UI state (input drafts, hover, open menus) stays in components, out of Redux.

## Not built yet

Strategy Builder, Watchlist, Alerts and Market Replay are routed and scoped in the UI but not
implemented; those screens state so plainly and show no figures rather than mock ones. The
frontend also does not yet consume the backend WebSocket - it uses the mock provider's
simulated stream, which exercises the same store path.
