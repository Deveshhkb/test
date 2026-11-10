export interface Env {
  port: number;
  jwtSecret: string;
  mongoUri: string | null;
  redisUrl: string | null;
  corsOrigin: string;
  initialBalance: number;
  clientDist: string | null;
  nodeEnv: string;
}

export function loadEnv(src: NodeJS.ProcessEnv = process.env): Env {
  const nodeEnv = src.NODE_ENV ?? 'development';
  const jwtSecret = src.JWT_SECRET ?? (nodeEnv === 'production' ? '' : 'neon-break-dev-secret');
  if (!jwtSecret) throw new Error('JWT_SECRET must be set in production');
  return {
    port: Number(src.PORT ?? 4000),
    jwtSecret,
    mongoUri: src.MONGO_URI || null,
    redisUrl: src.REDIS_URL || null,
    corsOrigin: src.CORS_ORIGIN ?? '*',
    // 125,600.00 credits in minor units
    initialBalance: Number(src.INITIAL_BALANCE ?? 12_560_000),
    clientDist: src.CLIENT_DIST ?? null,
    nodeEnv,
  };
}
