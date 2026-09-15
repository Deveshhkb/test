import type { NextFunction, Request, Response } from "express";
import { parseSymbol } from "../middleware/validation";
import { getIndexQuote, getMarketSnapshot } from "../services/marketService";

export async function indicesHandler(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.json({ data: await getMarketSnapshot() });
  } catch (error) {
    next(error);
  }
}

export async function indexQuoteHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const symbol = parseSymbol(request.params.symbol);
    response.json({ data: await getIndexQuote(symbol) });
  } catch (error) {
    next(error);
  }
}
