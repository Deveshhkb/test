import { networkInterfaces } from "node:os";
import { RateLimiterRegistry, delay } from "./rateLimiter";
import { generateTotp, secondsUntilNextStep } from "./totp";

/**
 * Minimal SmartAPI transport.
 *
 * Routes and header names are taken from Angel One's own Python SDK
 * (angel-one/smartapi-python, SmartApi/smartConnect.py) rather than from
 * memory. Credentials never leave this process.
 */

export const SMARTAPI_ROOT = "https://apiconnect.angelone.in";

export const ROUTES = {
  login: "/rest/auth/angelbroking/user/v1/loginByPassword",
  refresh: "/rest/auth/angelbroking/jwt/v1/generateTokens",
  profile: "/rest/secure/angelbroking/user/v1/getProfile",
  quote: "/rest/secure/angelbroking/market/v1/quote",
  candles: "/rest/secure/angelbroking/historical/v1/getCandleData",
  oiData: "/rest/secure/angelbroking/historical/v1/getOIData",
  optionGreek: "/rest/secure/angelbroking/marketData/v1/optionGreek",
  putCallRatio: "/rest/secure/angelbroking/marketData/v1/putCallRatio",
} as const;

/**
 * Published SmartAPI limits. The quote endpoint is one request per second;
 * the others are given conservative gaps rather than guessed exact numbers.
 */
const RATE_LIMITS: Record<string, number> = {
  quote: 1100,
  candles: 400,
  optionGreek: 1100,
  putCallRatio: 1100,
  login: 2000,
};

/** The quote endpoint accepts at most 50 tokens per call. */
export const QUOTE_BATCH_SIZE = 50;

export interface AngelOneCredentials {
  apiKey: string;
  clientCode: string;
  /** Account MPIN (SmartAPI replaced the password login with MPIN). */
  mpin: string;
  /** Base32 TOTP secret from the account's two-factor setup. */
  totpSecret: string;
}

export interface AngelOneSession {
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
  issuedAt: number;
}

/**
 * The surface the provider depends on. Narrow on purpose so the provider can
 * be tested against a fake transport without any network or credentials.
 */
export interface SmartApiTransport {
  post<T>(route: string, body: unknown, limitKey: string): Promise<T>;
  get<T>(route: string, limitKey: string): Promise<T>;
}

export class AngelOneError extends Error {
  constructor(
    message: string,
    readonly errorCode?: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "AngelOneError";
  }
}

interface SmartApiEnvelope<T> {
  status?: boolean;
  message?: string;
  errorcode?: string;
  data?: T;
}

/** SmartAPI requires these headers present; the values are informational. */
function clientIdentityHeaders(): Record<string, string> {
  const interfaces = Object.values(networkInterfaces()).flat();
  const active = interfaces.find(
    (entry) => entry && entry.family === "IPv4" && !entry.internal,
  );
  const localIp = process.env.ANGELONE_LOCAL_IP ?? active?.address ?? "127.0.0.1";
  return {
    "X-ClientLocalIP": localIp,
    "X-ClientPublicIP": process.env.ANGELONE_PUBLIC_IP ?? localIp,
    "X-MACAddress": process.env.ANGELONE_MAC ?? active?.mac ?? "00:00:00:00:00:00",
  };
}

/** Sessions are good for a trading day; refresh well before that. */
const SESSION_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export class AngelOneClient implements SmartApiTransport {
  private session: AngelOneSession | null = null;
  private loginInFlight: Promise<AngelOneSession> | null = null;
  private readonly limiter = new RateLimiterRegistry(RATE_LIMITS);

  constructor(
    private readonly credentials: AngelOneCredentials,
    private readonly root: string = SMARTAPI_ROOT,
  ) {}

  getFeedToken(): string | null {
    return this.session?.feedToken ?? null;
  }

  private baseHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-UserType": "USER",
      "X-SourceID": "WEB",
      "X-PrivateKey": this.credentials.apiKey,
      ...clientIdentityHeaders(),
    };
  }

  /** Logs in, reusing an in-flight login so concurrent callers share one. */
  async ensureSession(): Promise<AngelOneSession> {
    if (this.session && Date.now() - this.session.issuedAt < SESSION_MAX_AGE_MS) {
      return this.session;
    }
    if (this.loginInFlight) return this.loginInFlight;

    this.loginInFlight = this.login().finally(() => {
      this.loginInFlight = null;
    });
    return this.loginInFlight;
  }

  private async login(): Promise<AngelOneSession> {
    // Logging in on a step boundary can produce a code the server has already
    // rolled past; waiting a moment is cheaper than a failed login.
    const remaining = secondsUntilNextStep();
    if (remaining <= 1) await delay((remaining + 0.5) * 1000);

    const totp = generateTotp(this.credentials.totpSecret);
    const data = await this.limiter.run("login", () =>
      this.send<AngelOneSession & { jwtToken: string }>(ROUTES.login, {
        clientcode: this.credentials.clientCode,
        password: this.credentials.mpin,
        totp,
      }),
    );

    if (!data?.jwtToken) {
      throw new AngelOneError("SmartAPI login succeeded but returned no jwtToken.");
    }
    this.session = {
      jwtToken: data.jwtToken,
      refreshToken: data.refreshToken,
      feedToken: data.feedToken,
      issuedAt: Date.now(),
    };
    return this.session;
  }

  /** POST to a secure route, logging in first and retrying once on 401. */
  async post<T>(route: string, body: unknown, limitKey: string): Promise<T> {
    const session = await this.ensureSession();
    try {
      return await this.limiter.run(limitKey, () =>
        this.send<T>(route, body, session.jwtToken),
      );
    } catch (error) {
      if (error instanceof AngelOneError && error.status === 401) {
        this.session = null;
        const retry = await this.ensureSession();
        return this.limiter.run(limitKey, () => this.send<T>(route, body, retry.jwtToken));
      }
      throw error;
    }
  }

  async get<T>(route: string, limitKey: string): Promise<T> {
    const session = await this.ensureSession();
    return this.limiter.run(limitKey, () => this.send<T>(route, undefined, session.jwtToken));
  }

  private async send<T>(route: string, body?: unknown, jwt?: string): Promise<T> {
    const headers = this.baseHeaders();
    if (jwt) headers.Authorization = `Bearer ${jwt}`;

    let response: Response;
    try {
      response = await fetch(`${this.root}${route}`, {
        method: body === undefined ? "GET" : "POST",
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (cause) {
      throw new AngelOneError(
        `Could not reach SmartAPI (${route}): ${cause instanceof Error ? cause.message : "unknown error"}`,
      );
    }

    let payload: SmartApiEnvelope<T>;
    try {
      payload = (await response.json()) as SmartApiEnvelope<T>;
    } catch {
      throw new AngelOneError(
        `SmartAPI returned a non-JSON response (${response.status}) for ${route}.`,
        undefined,
        response.status,
      );
    }

    if (!response.ok || payload.status === false) {
      throw new AngelOneError(
        payload.message || `SmartAPI request failed (${response.status}) for ${route}.`,
        payload.errorcode,
        response.status,
      );
    }
    if (payload.data === undefined || payload.data === null) {
      throw new AngelOneError(`SmartAPI returned no data for ${route}.`, payload.errorcode);
    }
    return payload.data;
  }
}
