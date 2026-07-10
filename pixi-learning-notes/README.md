# 🎮 Pixi.js Learning Notes (v8) — Fast Track

Notes made for learning Pixi.js **fast**, the practical way:
learn a concept → use it in a project → know the real-world problems → answer it in an interview.

These notes use **Pixi.js v8** syntax (same version as `pixi-project/` in this repo) and examples are based on a **casino / betting game** (Dragon Tiger style), because that is the project you are building.

## 📚 How to use these notes (7-day plan)

| Day | File | What you learn |
|-----|------|----------------|
| 1–2 | [01-fundamentals.md](./01-fundamentals.md) | Core concepts: Application, Container, Sprite, Texture, Graphics, Text, Ticker, Events |
| 3–4 | [02-project-based-learning.md](./02-project-based-learning.md) | Build a mini Dragon-Tiger betting game step by step |
| 5 | [03-realtime-problems.md](./03-realtime-problems.md) | Real production problems + how to fix them (resize, memory, performance, z-order...) |
| 6 | [04-interview-questions.md](./04-interview-questions.md) | Interview Q&A — from basic to senior level |
| 7 | [05-cheatsheet.md](./05-cheatsheet.md) | One-page quick reference. Revise before interview. |

## 💡 The #1 rule for learning fast

**Don't read → type.** For every code block in these notes, type it into
`pixi-project/src/main.ts`, run `npm run dev`, break it, fix it.
You remember what you debug, not what you read.

## 🧠 The mental model (memorize this first)

```
Application  = the game engine (renderer + ticker + stage)
Stage        = the root Container (the "world")
Container    = an empty group (like a <div> for canvas)
Sprite       = an image on screen (uses a Texture)
Texture      = the image data in GPU memory
Graphics     = shapes you draw with code (rect, circle, polygon)
Text         = words on screen
Ticker       = the game loop (runs ~60 times per second)
Assets       = the loader (downloads images/spritesheets/fonts)
```

Everything on screen is a **tree** starting from `app.stage`.
You move/scale/rotate a Container → all its children move with it.
That one idea is 50% of Pixi.
