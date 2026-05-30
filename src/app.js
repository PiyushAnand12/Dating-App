import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/env.js';
import requestLogger from './middlewares/requestLogger.js';
import notFound from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';
import apiRouter from './routes/index.js';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import cacheMiddleware from './middlewares/cache.middleware.js';

const app = express();

// ─── Infrastructure ─────────────────────────────────────
// Enable trust proxy for correct IP detection behind Load Balancers/Cloudflare
app.set('trust proxy', 1);

// ─── HTTPS Enforcer ─────────────────────────────────────
// Redirect all HTTP traffic to HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect(`https://${req.headers.host}${req.originalUrl}`);
    }
    next();
  });
}

// ─── Security ───────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https://*.unsplash.com", "https://*.supabase.co"],
      "media-src": ["'self'", "https://*.supabase.co", "data:", "blob:"],
      "connect-src": ["'self'", "https://*.supabase.co", "https://*.unsplash.com"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));
app.use(cors({ origin: config.app.corsOrigin }));

// ─── Request logging ────────────────────────────────────
app.use(requestLogger);

// ─── Body parsing ───────────────────────────────────────
app.use(express.json({
  limit: '100kb',
  verify: (req, res, buf) => {
    // We need the raw body for Stripe webhook signature verification
    if (req.originalUrl && req.originalUrl.includes('/payments/webhook')) {
      req.rawBody = buf;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// ─── Global Rate Limiter ────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // 1000 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    errorCode: 'TOO_MANY_REQUESTS',
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});
app.use('/api', globalLimiter);

// ─── Health check ───────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

const swipeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    errorCode: 'RATE_LIMITED',
    message: 'Too many swipe requests. Please try again later.',
  },
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    errorCode: 'RATE_LIMITED',
    message: 'Too many message requests. Please try again later.',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Temporarily increased to 100 to resolve login block
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    errorCode: 'RATE_LIMITED',
    message: 'Too many auth requests. Please try again later.',
  },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    errorCode: 'RATE_LIMITED',
    message: 'Too many upload requests. Please try again later.',
  },
});

const activityLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    errorCode: 'RATE_LIMITED',
    message: 'Too many activity requests. Please try again later.',
  },
});

const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    errorCode: 'RATE_LIMITED',
    message: 'Heavy analytics request limit reached. Please wait a minute.',
  },
});

if (process.env.NODE_ENV !== 'test') {
  app.use('/api/v1/users/swipes', swipeLimiter);
  app.use('/api/v1/users/messages', messageLimiter);
  app.use('/api/v1/auth', authLimiter);
  app.use('/api/v1/media/upload-photo', uploadLimiter);
  app.use('/api/v1/users/kyc/upload-video', uploadLimiter);
  app.use('/api/v1/users/messages/voice-note', uploadLimiter);
  app.use('/api/v1/users/activity', activityLimiter);
  app.use('/api/v1/admin/analytics', analyticsLimiter);
}

// ─── Global API Cache (GET only) ────────────────────────
app.use('/api', cacheMiddleware());

// ─── API routes ─────────────────────────────────────────
app.use('/api', apiRouter);

app.get('/api/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── 404 handler ────────────────────────────────────────
app.use(notFound);

// ─── Global error handler ───────────────────────────────
app.use(errorHandler);

export default app;
