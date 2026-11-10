import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';
import { loadEnv } from './config/env';
import { loadGameConfig } from './config/gameConfig';
import { createMemoryCache, createRedisCache, type Cache } from './services/cache';
import { attachSocket } from './socket';
import { createMemoryStore } from './store/memoryStore';
import { createMongoStore } from './store/mongoStore';
import type { Store } from './store/types';

async function main() {
  const env = loadEnv();
  const config = loadGameConfig();

  let store: Store;
  if (env.mongoUri) {
    store = await createMongoStore(env.mongoUri);
    console.log('[neon] MongoDB connected');
  } else {
    store = createMemoryStore();
    console.warn('[neon] MONGO_URI not set – using in-memory store (data is lost on restart)');
  }
  let cache: Cache;
  if (env.redisUrl) {
    cache = await createRedisCache(env.redisUrl);
    console.log('[neon] Redis connected');
  } else {
    cache = createMemoryCache();
    console.warn('[neon] REDIS_URL not set – using in-memory cache (single instance only)');
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = env.clientDist ?? path.resolve(here, '../../client/dist');
  const { app, auth, game, events } = createApp({ store, cache, config, jwtSecret: env.jwtSecret, initialBalance: env.initialBalance, corsOrigin: env.corsOrigin, clientDist });
  const http = createServer(app);
  const { notifySpin, notifyBonus } = attachSocket(http, { auth, game, cache, corsOrigin: env.corsOrigin });
  events.onSpin = notifySpin;
  events.onBonusPick = notifyBonus;

  http.listen(env.port, () => console.log(`[neon] NEON BREAK server listening on :${env.port}`));
  const shutdown = async () => {
    http.close();
    await store.close();
    await cache.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
