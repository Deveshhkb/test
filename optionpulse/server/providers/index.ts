import { env, hasProviderCredentials } from "../config/env";
import { MockProvider } from "./MockProvider";
import type { ServerMarketDataProvider } from "./ServerMarketDataProvider";

let provider: ServerMarketDataProvider | null = null;

/**
 * Resolves the configured provider.
 *
 * A live vendor integration registers here. Until one exists, the server
 * refuses to pretend: if live mode is requested without credentials it logs and
 * falls back to the mock provider, which is always labelled MOCK downstream.
 */
export function getProvider(): ServerMarketDataProvider {
  if (provider) return provider;

  if (env.marketDataMode === "live" && !hasProviderCredentials()) {
    console.warn(
      "[optionpulse] MARKET_DATA_MODE=live but no provider credentials are set. Falling back to mock data.",
    );
  }

  provider = new MockProvider();
  return provider;
}

export type { ServerMarketDataProvider };
