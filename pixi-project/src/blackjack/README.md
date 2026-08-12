# Blackjack

A playable casino blackjack table built with PixiJS 8, GSAP and TypeScript. All
artwork — felt, rail, cards, chips — is generated at runtime on 2D canvases, so
the game ships with no image assets and no third-party artwork.

## Running

```bash
npm install
npm run dev      # http://localhost:8080
npm run build    # lint + typecheck + production bundle
```

The blackjack table is the default page. The earlier Dragon Tiger prototype is
still served at `/dragon-tiger.html`.

## Architecture

The code is split so that rules, money, state and presentation never mix.

```
src/blackjack/
  BlackjackGame.ts        composition root; conducts a round
  config/gameConfig.ts    every tunable: rules, limits, layout, timings, colours
  core/
    GameStateManager.ts   phase machine + animation lock; decides what is legal
    EventEmitter.ts       typed emitter used by the model layer
  game/                   pure logic, no Pixi imports (unit-testable in node)
    Card.ts Deck.ts Hand.ts
    BlackjackRules.ts     rule decisions, driven entirely by config
    BlackjackEngine.ts    round runner; emits the deal as discrete steps
    BetManager.ts         balance, per-seat wagers, chip selection, repeat bet
    SettlementManager.ts  outcomes -> payouts
  entities/               CardSprite, ChipSprite, ShoeSprite, CardPool
  ui/                     TableView, BetSpot, ChipRail, ActionBar, BottomBar,
                          ResultPanel, InfoOverlay, HandView, UIManager
  animation/              CardAnimation, ChipAnimation, ResultAnimation
  audio/AudioManager.ts   Web Audio synthesis; no sound files
  utils/                  currency, responsive scaling, texture generation
```

### Round flow

```
BETTING -> DEALING -> PLAYER_TURN -> DEALER_TURN -> RESULT -> ROUND_END -> BETTING
```

`GameStateManager` owns the phase and an animation lock. Every player action
goes through `canPerform(action)`, so a control can never fire in a phase that
does not accept it — double-clicking DEAL starts exactly one round, and input is
dead while cards are in flight.

### Rules

Six-deck shoe reshuffled at 75% penetration; dealer draws to 16 and stands on
all 17s (soft-17 behaviour is a config flag); blackjack pays 3:2; pushes return
the stake; aces count as 11 until that would bust. Insurance payouts and
doubling are implemented in the rules layer and not yet surfaced in the UI.

Rules and payouts live in `BlackjackRules` / `SettlementManager` only. The view
renders what it is given and never decides an outcome.

### Responsive scaling

Everything is laid out in a 1780x994 design space. `StageScaler` scales the
content layer uniformly to fit and centres it, so the table keeps its
composition on any screen, while the felt layer is scaled to cover. The rail and
status bar overdraw past the design bounds so letterboxed edges are never bare.
Portrait phones get a rotate prompt, since the table is composed for landscape.

## Testing hooks

The current phase is mirrored onto the document as `data-game-state` and
`data-game-busy`, which lets end-to-end tests synchronise with the round instead
of sleeping.
