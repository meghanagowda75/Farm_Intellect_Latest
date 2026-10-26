
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import {
  resolveAuthenticatedUser,
  authenticate,
  authorize,
} from './middleware/auth.js';
import * as Sentry from '@sentry/node';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import documentRoutes from './routes/documents.js';
import notificationRoutes from './routes/notifications.js';
import forumRoutes from './routes/forum.js';
import chatRoutes from './routes/chat.js';
import analyticsRoutes from './routes/analytics.js';
import calendarRoutes from './routes/calendar.js';
import aiRoutes from './routes/ai.js';
import voiceRoutes from './routes/voice.js';
import commandRoutes from './routes/commands.js';
import farmRoutes from './routes/farm.js';
import marketRoutes from './routes/market.js';
import pollRoutes from './routes/polls.js';
import datasetRoutes from './routes/datasets.js';
import weatherRoutes from './routes/weather.js';

import { scheduleIngestionJobs } from './jobs/ingestion.js';
import { errorHandler } from './middleware/errorHandler.js';
import {
  metricsHandler,
  metricsMiddleware,
} from './middleware/metrics.js';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();
app.disable('x-powered-by');

const server = createServer(app);

const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

const developmentOrigins = [
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  'http://10.110.192.70:4000',
  'https://enabled-activated-assignment-reuters.trycloudflare.com',
  'https://burner-sprint-latest-tackle.trycloudflare.com',
  'https://know-prospects-meet-subsection.trycloudflare.com',
  'https://peas-healing-talk-proposals.trycloudflare.com',
  'https://capital-noted-secrets-currently.trycloudflare.com',
];

const productionOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const normalizeOrigin = (origin) =>
  origin?.replace(/\/+$/, '');

const allowedOrigins = isProduction
  ? productionOrigins
  : developmentOrigins;

const isAllowedOrigin = (origin) =>
  allowedOrigins.includes(normalizeOrigin(origin));

const corsOptions = {
  origin(origin, callback) {
    // Allow requests without an Origin header, such as curl.
    if (!origin) {
      return callback(null, true);
    }

    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    logger.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
  ],
};

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by Socket.IO CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

// Rate limiting
const limiter = rateLimit({
  windowMs:
    parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) ||
    15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  message: 'Too many requests from this IP, please try again later.',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message:
    'Too many authentication attempts. Please try again later.',
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message:
    'Too many AI requests. Please slow down and try again shortly.',
});

const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  message:
    'Too many chat requests. Please wait a bit before sending more messages.',
});

// Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });

  app.use(Sentry.Handlers.requestHandler());
}

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'http:', 'https:', 'ws:', 'wss:'],
        fontSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
  }),
);

const MAINTENANCE_MODE =
  process.env.MAINTENANCE_MODE === 'true';

const FORCE_HTTPS =
  process.env.NODE_ENV === 'production' &&
  process.env.FORCE_HTTPS === 'true';

// Maintenance mode
app.use((req, res, next) => {
  if (!MAINTENANCE_MODE || req.path === '/health') {
    return next();
  }

  return res.status(503).json({
    error: 'Service temporarily unavailable for maintenance',
    maintenance: true,
  });
});

// Force HTTPS in production when enabled
if (FORCE_HTTPS) {
  app.enable('trust proxy');

  app.use((req, res, next) => {
    const forwardedProto = req.get('x-forwarded-proto');

    if (forwardedProto && forwardedProto !== 'https') {
      return res.redirect(
        301,
        `https://${req.get('host')}${req.originalUrl}`,
      );
    }

    return next();
  });
}

// CORS must be registered before API routes.
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// General middleware
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(metricsMiddleware);

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/chat', chatLimiter, chatRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/voice', aiLimiter, voiceRoutes);
app.use('/api/commands', aiLimiter, commandRoutes);
app.use('/api/farm', farmRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/weather', weatherRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    maintenance: MAINTENANCE_MODE,
    timestamp: new Date().toISOString(),
  });
});

// Protected metrics endpoint
app.get('/metrics', authenticate, authorize('ADMIN'), metricsHandler);

// Socket.IO JWT authentication
io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace(
      'Bearer ',
      '',
    );

  if (!token) {
    return next(new Error('Authentication required'));
  }

  resolveAuthenticatedUser(token)
    .then((user) => {
      if (!user) {
        return next(new Error('Invalid token'));
      }

      socket.userId = user.id;
      socket.userRole = user.role;

      return next();
    })
    .catch(() => next(new Error('Invalid token')));
});

// Socket.IO real-time features
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  socket.on('join-user-room', () => {
    socket.join(`user-${socket.userId}`);
  });

  socket.on('send-message', (data) => {
    if (String(data.senderId) !== String(socket.userId)) {
      return;
    }

    socket
      .to(`user-${data.recipientId}`)
      .emit('new-message', data);
  });

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

if (process.env.NODE_ENV !== 'test') {
  scheduleIngestionJobs();

  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(
      `Allowed frontend origins: ${JSON.stringify(allowedOrigins)}`,
    );
  });
}

export { app, server, io };
