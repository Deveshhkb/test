import type { NextFunction, Request, Response } from "express";
import { parseExpiry, parseSymbol, parseTimeframe } from "../middleware/validation";
import {
  getAnalytics,
  getExpiries,
  getHistoricalData,
  getOptionChain,
} from "../services/marketService";

export async function expiriesHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.json({ data: await getExpiries(parseSymbol(request.params.symbol)) });
  } catch (error) {
    next(error);
  }
}

export async function chainHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const symbol = parseSymbol(request.params.symbol);
    const expiry = parseExpiry(request.query.expiry);
    response.json({ data: await getOptionChain(symbol, expiry) });
  } catch (error) {
    next(error);
  }
}

export async function historyHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const symbol = parseSymbol(request.params.symbol);
    const timeframe = parseTimeframe(request.query.timeframe);
    response.json({ data: await getHistoricalData(symbol, timeframe) });
  } catch (error) {
    next(error);
  }
}

export async function analyticsHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const symbol = parseSymbol(request.params.symbol);
    const expiry = parseExpiry(request.query.expiry);
    response.json({ data: await getAnalytics(symbol, expiry) });
  } catch (error) {
    next(error);
  }
}
