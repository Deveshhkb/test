import { Router, type RequestHandler } from "express";
import { indexQuoteHandler, indicesHandler } from "../controllers/marketController";
import {
  analyticsHandler,
  chainHandler,
  expiriesHandler,
  historyHandler,
} from "../controllers/optionsController";
import { env } from "../config/env";
import { getIndexQuote } from "../services/marketService";
import type { UnderlyingSymbol } from "../../src/types/market";

export const apiRouter = Router();

/** Fixed-symbol shorthand for the three headline indices. */
function quoteAlias(symbol: UnderlyingSymbol): RequestHandler {
  return async (_request, response, next) => {
    try {
      response.json({ data: await getIndexQuote(symbol) });
    } catch (error) {
      next(error);
    }
  };
}

apiRouter.get("/health", (_request, response) => {
  response.json({
    data: {
      status: "ok",
      mode: env.marketDataMode,
      // Never echo credentials - only whether one is configured.
      providerConfigured: env.marketDataProvider,
      time: new Date().toISOString(),
    },
  });
});

// Market
apiRouter.get("/market/indices", indicesHandler);
apiRouter.get("/market/index/:symbol", indexQuoteHandler);
// Convenience aliases for the three headline indices.
apiRouter.get("/market/nifty", quoteAlias("NIFTY"));
apiRouter.get("/market/banknifty", quoteAlias("BANKNIFTY"));
apiRouter.get("/market/sensex", quoteAlias("SENSEX"));

// Options
apiRouter.get("/options/expiries/:symbol", expiriesHandler);
apiRouter.get("/options/chain/:symbol", chainHandler);
apiRouter.get("/options/history/:symbol", historyHandler);

// Analytics
apiRouter.get("/analytics/:symbol", analyticsHandler);
