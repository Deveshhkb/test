import type { NextFunction, Request, Response } from "express";
import { UNDERLYINGS } from "../../src/config/underlyings";
import type { Timeframe, UnderlyingSymbol } from "../../src/types/market";

const TIMEFRAMES: Timeframe[] = ["1m", "3m", "5m", "15m", "30m", "1H", "1D", "1W", "1M"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Never trust a path or query parameter: validate before it reaches a service. */
export function parseSymbol(value: unknown): UnderlyingSymbol {
  const candidate = String(value ?? "").toUpperCase();
  if (candidate in UNDERLYINGS) return candidate as UnderlyingSymbol;
  throw new HttpError(
    400,
    `Unknown underlying "${candidate}". Expected one of: ${Object.keys(UNDERLYINGS).join(", ")}.`,
  );
}

export function parseTimeframe(value: unknown, fallback: Timeframe = "15m"): Timeframe {
  if (value === undefined || value === null || value === "") return fallback;
  const candidate = String(value);
  if ((TIMEFRAMES as string[]).includes(candidate)) return candidate as Timeframe;
  throw new HttpError(
    400,
    `Unsupported timeframe "${candidate}". Expected one of: ${TIMEFRAMES.join(", ")}.`,
  );
}

export function parseExpiry(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  const candidate = String(value);
  if (!ISO_DATE.test(candidate)) {
    throw new HttpError(
      400,
      `Invalid expiry "${candidate}". Expected an ISO date (yyyy-mm-dd).`,
    );
  }
  return candidate;
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  const status = error instanceof HttpError ? error.status : 500;
  const message =
    error instanceof Error && status < 500
      ? error.message
      : "Market data is temporarily unavailable.";
  if (status >= 500) console.error("[optionpulse]", error);
  // Errors return no data at all rather than a plausible-looking placeholder.
  response.status(status).json({ error: { message, status } });
}

export function notFoundHandler(_request: Request, response: Response): void {
  response.status(404).json({ error: { message: "Unknown endpoint.", status: 404 } });
}
