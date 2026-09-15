import "dotenv/config";

/**
 * Server-side configuration.
 *
 * Provider credentials are read here and nowhere else. Nothing in this module
 * is ever serialised into an API response, so keys cannot leak to the browser.
 */
export const env = {
  port: Number.parseInt(process.env.PORT ?? "4000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  marketDataMode: (process.env.MARKET_DATA_MODE ?? "mock").toLowerCase(),
  marketDataProvider: (process.env.MARKET_DATA_PROVIDER ?? "mock").toLowerCase(),
  credentials: {
    apiKey: process.env.MARKET_DATA_API_KEY ?? "",
    apiSecret: process.env.MARKET_DATA_API_SECRET ?? "",
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5180")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;

export function hasProviderCredentials(): boolean {
  return env.credentials.apiKey.length > 0;
}
