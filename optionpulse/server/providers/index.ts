import { env, hasProviderCredentials, missingAngelOneCredentials } from "../config/env";
import { AngelOneClient } from "./angelone/AngelOneClient";
import { AngelOneProvider } from "./angelone/AngelOneProvider";
import { InstrumentMasterStore } from "./angelone/instrumentMasterStore";
import { MockProvider } from "./MockProvider";
import type { ServerMarketDataProvider } from "./ServerMarketDataProvider";

let provider: ServerMarketDataProvider | null = null;

/**
 * Resolves the configured provider.
 *
 * If a live provider is requested but not usable, the server says exactly what
 * is missing and falls back to the mock provider. It never pretends: mock data
 * stays labelled MOCK all the way to the browser badge.
 */
export function getProvider(): ServerMarketDataProvider {
  if (provider) return provider;
  provider = createProvider();
  console.log(`[optionpulse] Market-data provider: ${provider.id}`);
  return provider;
}

function createProvider(): ServerMarketDataProvider {
  if (env.marketDataProvider !== "angelone") {
    if (env.marketDataProvider !== "mock") {
      console.warn(
        `[optionpulse] Unknown MARKET_DATA_PROVIDER "${env.marketDataProvider}". Using mock data.`,
      );
    }
    return new MockProvider();
  }

  if (!hasProviderCredentials()) {
    console.warn(
      "[optionpulse] MARKET_DATA_PROVIDER=angelone but these are not set:",
      missingAngelOneCredentials().join(", "),
      "- falling back to mock data.",
    );
    return new MockProvider();
  }

  const client = new AngelOneClient({
    apiKey: env.angelOne.apiKey,
    clientCode: env.angelOne.clientCode,
    mpin: env.angelOne.mpin,
    totpSecret: env.angelOne.totpSecret,
  });
  const instruments = new InstrumentMasterStore({ cacheFile: env.instrumentCacheFile });
  return new AngelOneProvider(
    client,
    instruments,
    env.marketDataMode === "delayed" ? "DELAYED" : "LIVE",
  );
}

/** Test seam. */
export function setProvider(next: ServerMarketDataProvider | null): void {
  provider = next;
}

export type { ServerMarketDataProvider };
