import { API_BASE_URL, DATA_MODE, DATA_SOURCE } from "../../config/dataMode";
import { HttpMarketDataProvider } from "./HttpMarketDataProvider";
import { MarketDataProvider } from "./MarketDataProvider";
import { MockMarketDataProvider } from "./MockMarketDataProvider";

let activeProvider: MarketDataProvider | null = null;

/**
 * Resolves the provider for this build. Swapping providers is a configuration
 * change (`VITE_API_BASE_URL`), never a code change in the UI layer.
 */
export function getMarketDataProvider(): MarketDataProvider {
  if (activeProvider) return activeProvider;
  activeProvider =
    DATA_SOURCE === "api"
      ? new HttpMarketDataProvider(API_BASE_URL, DATA_MODE)
      : new MockMarketDataProvider();
  return activeProvider;
}

/** Test/bootstrap hook for injecting a provider. */
export function setMarketDataProvider(provider: MarketDataProvider): void {
  activeProvider = provider;
}

export { HttpMarketDataProvider, MarketDataProvider, MockMarketDataProvider };
export * from "./MarketDataProvider";
