import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { loadConfig } from './config';
import { registerSocketHandlers, type GameServer } from './sockets/registerSocketHandlers';

/**
 * Server entry point.
 *
 * Phase 1 stands up the transport skeleton: Express for REST/health,
 * Socket.io (with heartbeat) for the real-time channel, both typed against
 * the shared contract. Round engine, Redis pub/sub, MongoDB persistence,
 * rate limiting and anti-cheat land in the dedicated backend phase.
 */
const config = loadConfig();

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', serverTime: Date.now() });
});

const httpServer = http.createServer(app);

const io: GameServer = new Server(httpServer, {
  cors: { origin: config.corsOrigin },
  pingInterval: config.pingIntervalMs,
  pingTimeout: config.pingTimeoutMs,
});

registerSocketHandlers(io);

httpServer.listen(config.port, () => {
  console.info(`[aviator] server listening on :${config.port}`);
});

// Graceful shutdown so load balancers / orchestrators can drain cleanly.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    io.close();
    httpServer.close(() => process.exit(0));
  });
}
