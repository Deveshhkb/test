import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';
import { setRandomSource } from '@/utils/rng';

/**
 * Backend entry point. In production (`npm run build && npm start`) it also
 * serves the built frontend from dist/, so the whole game runs from one
 * process on PORT.
 */

// Casino-grade RNG: back the engine with the CSPRNG instead of Math.random.
// crypto.randomInt caps the range at 2^48 - 1.
const RNG_RANGE = 2 ** 48 - 1;
setRandomSource(() => crypto.randomInt(0, RNG_RANGE) / RNG_RANGE);

const app = createApp();

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  console.log(`[rgs] Royal Fortune backend listening on http://localhost:${port}`);
  if (fs.existsSync(dist)) console.log('[rgs] serving built frontend from dist/');
});
