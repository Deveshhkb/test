/**
 * Server configuration, sourced from the environment with safe defaults.
 * Redis / MongoDB connection settings join this file in the backend phase.
 */
export interface ServerConfig {
  port: number;
  corsOrigin: string;
  /** Socket.io heartbeat: how often the server pings each client (ms). */
  pingIntervalMs: number;
  /** How long to wait for a pong before considering the client gone (ms). */
  pingTimeoutMs: number;
}

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadConfig(): ServerConfig {
  return {
    port: intFromEnv('PORT', 8080),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    pingIntervalMs: intFromEnv('PING_INTERVAL_MS', 10_000),
    pingTimeoutMs: intFromEnv('PING_TIMEOUT_MS', 5_000),
  };
}
