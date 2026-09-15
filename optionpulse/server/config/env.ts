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
  /**
   * Angel One SmartAPI credentials. Read here and nowhere else, and never
   * included in any API response.
   */
  angelOne: {
    apiKey: process.env.ANGELONE_API_KEY ?? "",
    clientCode: process.env.ANGELONE_CLIENT_CODE ?? "",
    mpin: process.env.ANGELONE_MPIN ?? "",
    totpSecret: process.env.ANGELONE_TOTP_SECRET ?? "",
  },
  instrumentCacheFile:
    process.env.ANGELONE_INSTRUMENT_CACHE ?? ".cache/angelone-instruments.json",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5180")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;

/** Names the Angel One credentials that are missing, for a clear startup message. */
export function missingAngelOneCredentials(): string[] {
  const required: Array<[string, string]> = [
    ["ANGELONE_API_KEY", env.angelOne.apiKey],
    ["ANGELONE_CLIENT_CODE", env.angelOne.clientCode],
    ["ANGELONE_MPIN", env.angelOne.mpin],
    ["ANGELONE_TOTP_SECRET", env.angelOne.totpSecret],
  ];
  return required.filter(([, value]) => value.trim() === "").map(([name]) => name);
}

export function hasProviderCredentials(): boolean {
  return missingAngelOneCredentials().length === 0;
}
