# PixiJS v8 Universal Template

Reusable starter for PixiJS games: **PixiJS 8.22 + Vite 8 + TypeScript 6 + GSAP**.
Design once at a fixed resolution and it scales to every screen: desktop, mobile, portrait and landscape.

## Start

```bash
npm install
npm run dev      # http://localhost:8080
npm run build    # production build in /dist (relative paths, works from any folder)
npm run preview  # test the build
```

## Structure

```
src/
  config.ts          <- design size (landscape/portrait), scale mode, background
  assets.ts          <- asset manifest (aliases + bundles)
  main.ts            <- entry: init Game, open first scene
  core/Game.ts       <- Application, universal resize/scaling, scene switching
  core/Scene.ts      <- base class for all screens
  scenes/LoadingScene.ts  <- progress bar, loads "game" bundle
  scenes/GameScene.ts     <- demo scene (replace with your game)
  ui/Button.ts       <- reusable animated button
public/assets/       <- images, spritesheets, fonts, sounds
```

## Usage

**1. Add assets** – put files in `public/assets/` and register them in `src/assets.ts`:
```ts
{ alias: "bg", src: "assets/bg-image.png" }
```
Then use them anywhere: `Sprite.from("bg")`.

**2. Make a scene**
```ts
export class MenuScene extends Scene {
  async onEnter() { /* build UI */ }
  update(ticker: Ticker) { /* every frame */ }
  resize(w: number, h: number, portrait: boolean) {
    super.resize(w, h, portrait);
    // position things with w/h, e.g. this.logo.position.set(w / 2, h * 0.2)
  }
}
```

**3. Switch scenes** – `await Game.goTo(MenuScene);`

## Scaling

All scene coordinates are in **design pixels** (`1920x1080` landscape, `1080x1920` portrait by default).
`Game` scales and centers that area to fit the window:

- `scaleMode: "contain"` – whole design visible, bars on extra space
- `scaleMode: "cover"` – fills the screen, edges can be cropped

If you only support one orientation, set `portrait` equal to `landscape` in `config.ts`.
