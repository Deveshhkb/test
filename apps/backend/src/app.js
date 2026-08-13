import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

// Origins allowed to call this API with credentials. Production domains come
// from CORS_ORIGINS; local dev hosts are always permitted so a developer
// hitting 127.0.0.1 instead of localhost isn't rejected.
const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

const parseOrigins = (value) =>
  (value || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, '')) // tolerate trailing slashes
    .filter(Boolean);

// Fall back to FRONTEND_URL so a deploy that only sets that variable still
// works, rather than silently blocking every browser request.
const configuredOrigins = parseOrigins(process.env.CORS_ORIGINS);
const fallbackOrigins = configuredOrigins.length
  ? []
  : parseOrigins(process.env.FRONTEND_URL);

const allowedOrigins = [
  ...new Set(
    configuredOrigins
      .concat(fallbackOrigins)
      .concat(process.env.NODE_ENV === 'production' ? [] : DEV_ORIGINS)
  ),
];

if (fallbackOrigins.length) {
  console.warn(
    `[cors] CORS_ORIGINS is not set — falling back to FRONTEND_URL (${fallbackOrigins.join(', ')}). ` +
      'Set CORS_ORIGINS explicitly to list every site that calls this API.'
  );
}

if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  console.warn(
    '[cors] CORS_ORIGINS is not set — every browser request will be blocked.\n' +
      '       Set it to your site origin(s), e.g.\n' +
      '       CORS_ORIGINS=https://clothinary.cloudpunch.in,https://admin.clothinary.cloudpunch.in'
  );
}

const rejectedOrigins = new Set();

/**
 * Origins implied by the host this API is served from. When the API runs at
 * `api.example.com`, its storefront is almost always `example.com` /
 * `www.example.com`, so allow those even when nothing is configured.
 *
 * Only the exact sibling site is derived — never the whole parent domain —
 * so unrelated subdomains (a shared hosting neighbour, say) stay blocked.
 */
const siblingOrigins = (req) => {
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim()
    .split(':')[0];
  if (!host || !host.startsWith('api.')) return [];
  const site = host.slice(4); // drop the leading "api."
  if (!site.includes('.')) return [];
  return [`https://${site}`, `https://www.${site}`];
};

// Behind nginx/a load balancer: needed for correct client IPs (rate limiting)
// and for `secure` cookies to be issued over the proxied HTTPS connection.
app.set('trust proxy', 1);

app.use(helmet({
  // The API is served from a different subdomain than the storefront, so the
  // default same-origin resource policy would block it.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(
  cors((req, done) => {
    const derived = allowedOrigins.length ? [] : siblingOrigins(req);
    const permitted = allowedOrigins.concat(derived);

    done(null, {
      credentials: true,
      origin: (origin, cb) => {
        // No Origin header = same-origin, curl, or a server-side call.
        if (!origin) return cb(null, true);
        if (permitted.includes(origin.replace(/\/$/, ''))) return cb(null, true);

        // Reject WITHOUT throwing. Passing an Error here would surface as a
        // confusing 500 on the CORS preflight; returning false simply omits the
        // CORS headers so the browser reports a proper CORS error instead.
        if (!rejectedOrigins.has(origin)) {
          rejectedOrigins.add(origin);
          console.warn(
            `[cors] Blocked origin "${origin}". Add it to CORS_ORIGINS to allow it. ` +
              `Currently allowed: ${permitted.join(', ') || '(none)'}`
          );
        }
        return cb(null, false);
      },
    });
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// Basic rate limiting on the API surface.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/', (req, res) => res.json({ name: 'Clothinary API', version: '1.0.0' }));

/**
 * Deployment self-check. Reports whether the caller's Origin is allowed, so a
 * CORS misconfiguration can be diagnosed from the browser without server logs.
 * Only echoes the operator's own site origins — nothing secret.
 */
app.get('/api/cors-check', (req, res) => {
  const origin = req.headers.origin || null;
  const derived = allowedOrigins.length ? [] : siblingOrigins(req);
  const permitted = allowedOrigins.concat(derived);
  res.json({
    success: true,
    yourOrigin: origin,
    allowed: origin ? permitted.includes(origin.replace(/\/$/, '')) : null,
    allowedOrigins: permitted,
    fromEnv: allowedOrigins,
    derivedFromHost: derived,
    corsOriginsEnvSet: Boolean(process.env.CORS_ORIGINS),
    nodeEnv: process.env.NODE_ENV || '(unset)',
    hint:
      'If "allowed" is false, add "yourOrigin" to the CORS_ORIGINS environment variable and restart the server.',
  });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
