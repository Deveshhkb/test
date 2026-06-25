import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import connectDB from './config/db.js';
import apiRoutes from './routes/index.js';
import { uploadDir } from './middleware/upload.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

// Trust the reverse proxy (nginx) so HTTPS/IP detection works behind it.
app.set('trust proxy', 1);

// Security & performance middleware.
// crossOriginResourcePolicy: cross-origin lets the frontend domain embed
// uploaded images served from this API domain.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use('/uploads', express.static(uploadDir));

// ---- CORS ----
// The production frontend domain and localhost are always allowed, plus any
// extra origins from CLIENT_URL (comma-separated). This guarantees the live
// site works even if CLIENT_URL is misconfigured on the server.
const DEFAULT_ORIGINS = ['https://ayodhyatour.cloudpunch.in', 'http://localhost:3000'];
const envOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...DEFAULT_ORIGINS, ...envOrigins])];

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser requests (curl, server-to-server) that have no origin.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // explicitly answer preflight requests

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Basic rate limiting on the API surface
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ayodhya-tirtham-api' }));

// API
app.use('/api', apiRoutes);

// Errors
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✔ API running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
});

export default app;
