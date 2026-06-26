import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map((o) => o.trim());

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
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

app.get('/', (req, res) => res.json({ name: 'NovaStyle API', version: '1.0.0' }));
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
