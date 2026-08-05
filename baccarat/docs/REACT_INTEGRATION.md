# React integration

The engine is framework-agnostic. React's only jobs are **mount** and **unmount**.

> No React code runs inside Pixi, and no Pixi state drives a React render. Data leaves the
> engine through callbacks, so a busy table never re-renders the host tree.

---

## Drop-in component

`src/react/BaccaratGameView.tsx` ships ready to use. It is exported as the `./react`
subpath and distributed as TSX, so your app compiles it with its own React version — the
engine never bundles one:

```tsx
import { BaccaratGameView } from "@hkb/baccarat-engine/react";

export function TablePage() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <BaccaratGameView
        config={{ tableName: "VIP Baccarat", currency: "USD" }}
        onReady={(game) => console.log("ready", game.state)}
        onRoundSettled={({ netProfit }) => toast(`Net ${netProfit}`)}
        onBalanceChanged={({ balance }) => setBalance(balance)}
      />
    </div>
  );
}
```

The host element must have a real size — the engine fills it exactly.

### Imperative handle

```tsx
const ref = useRef<BaccaratGameHandle>(null);

<BaccaratGameView ref={ref} />;

ref.current?.pause();
ref.current?.resume();
ref.current?.reset();
ref.current?.updateConfig({ timing: { bettingSeconds: 20 } });
```

---

## Doing it by hand

If you would rather own the effect:

```tsx
import { useEffect, useRef } from "react";
import { BaccaratGame } from "@hkb/baccarat-engine";

export function BaccaratTable({ currency }: { currency: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<BaccaratGame | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const game = new BaccaratGame();
    gameRef.current = game;
    void game.init(host, { currency }).catch(console.error);

    return () => {
      game.destroy();          // releases the WebGL context — never skip this
      gameRef.current = null;
    };
    // Empty deps on purpose: config changes go through updateConfig(), below.
  }, []);

  useEffect(() => {
    gameRef.current?.updateConfig({ currency });
  }, [currency]);

  return <div ref={hostRef} style={{ width: "100%", height: "100%" }} />;
}
```

### Four things that actually matter

1. **Empty dependency array on the boot effect.** Re-running it tears down and rebuilds the
   renderer. Push changes through `updateConfig()` instead.
2. **Always `destroy()` in cleanup.** Browsers allow a limited number of WebGL contexts;
   leaking one per mount will kill the tab.
3. **StrictMode double-invokes effects in development.** `init()` is idempotent and
   `destroy()` is safe to call on a half-initialised instance, so the mount/unmount/mount
   cycle is handled — but do not `await` `init()` outside the effect and then touch the
   instance without checking that cleanup has not run.
4. **Don't put engine state in React state.** Subscribing `round:settled` to a `setState`
   that re-renders the tree every coup is the one reliable way to make this feel slow.

---

## Sharing Pixi with an existing app

The library build marks `pixi.js` and `gsap` external, so bundlers dedupe them:

```bash
npm run build:lib      # dist/baccarat-engine.js
```

Both are peer-level dependencies — keep one copy of each in the host app. Two copies of
Pixi v8 in a bundle produces confusing texture and renderer errors.

The engine creates its **own** `Application` inside the element you pass. It does not attach
to a host renderer, which is what keeps its lifecycle (and its teardown) self-contained. If
you must share a single canvas across several games, mount them into sibling elements and
pause the inactive ones:

```tsx
useEffect(() => {
  if (isVisible) ref.current?.resume();
  else ref.current?.pause();
}, [isVisible]);
```

---

## Reading state

Prefer events over polling:

```tsx
useEffect(() => {
  const game = gameRef.current;
  if (!game) return;
  const offs = [
    game.on("round:settled", ({ netProfit }) => onNet(netProfit)),
    game.on("balance:changed", ({ balance }) => onBalance(balance)),
    game.on("state:changed", ({ to }) => onPhase(to)),
    game.on("game:error", ({ message, fatal }) => onError(message, fatal)),
  ];
  return () => offs.forEach((off) => off());
}, []);
```

The full catalogue is in [EVENT_FLOW.md](EVENT_FLOW.md). Synchronous reads
(`game.state`, `game.balance`, `game.metrics`) exist for one-off checks.

---

## Routing and visibility

- **Route change away** → `pause()` if the component stays mounted, otherwise unmount and
  let cleanup `destroy()`.
- **Tab hidden** → handled automatically; `InputManager` watches `visibilitychange`.
- **Modal over the table** → `pause()`, then `resume()`; audio fades rather than cutting.

---

## Server-side rendering

The engine touches `window`, `document` and WebGL at construction. Under Next.js or any SSR
framework, load it client-side only:

```tsx
const BaccaratGameView = dynamic(
  () => import("@hkb/baccarat-engine/react").then((m) => m.BaccaratGameView),
  { ssr: false },
);
```
