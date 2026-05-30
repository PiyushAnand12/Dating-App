import 'dotenv/config';
import { logger } from './config/logger.js';
import { initSocket } from './config/socket.js';
import { initCrons } from './config/cron.js';

// ─── Shutdown idempotency guard ─────────────────────────
let isShuttingDown = false;
let server;

const shutdown = (signal, exitCode = 0) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'Shutdown initiated');

  if (!server) {
    logger.warn('Server not yet initialised — exiting immediately');
    process.exit(exitCode);
  }

  server.close(() => {
    logger.info('HTTP server closed — exiting cleanly');
    process.exit(exitCode);
  });

  setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10_000).unref();
};

// ─── Fatal process handlers ─────────────────────────────
process.on('SIGTERM', () => shutdown('SIGTERM', 0));
process.on('SIGINT', () => shutdown('SIGINT', 0));

process.on('unhandledRejection', (reason) => {
  logger.error(
    {
      reason:
        reason instanceof Error
          ? { message: reason.message, stack: reason.stack }
          : reason,
    },
    'Unhandled promise rejection — shutting down',
  );
  shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (err) => {
  logger.fatal(
    { err: { message: err.message, stack: err.stack } },
    'Uncaught exception — shutting down',
  );
  shutdown('uncaughtException', 1);
});

// ─── App bootstrap ──────────────────────────────────────
let app;

try {
  ({ default: app } = await import('./app.js'));
} catch (err) {
  logger.fatal(
    { err: { message: err.message, stack: err.stack } },
    'Failed to import app — aborting startup',
  );
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

try {
  server = app.listen(PORT, () => {
    logger.info(
      { port: PORT, env: process.env.NODE_ENV || 'development' },
      'Server started',
    );
  });

  // ─── Socket.io bootstrap ────────────────────────────────
  initSocket(server);
  logger.info('Socket.IO server initialised');

  // ─── Cron bootstrap ───────────────────────────────────
  initCrons();

  server.on('error', (err) => {
    logger.fatal(
      { err: { message: err.message, stack: err.stack } },
      'HTTP server error — aborting startup',
    );
    process.exit(1);
  });
} catch (err) {
  logger.fatal(
    { err: { message: err.message, stack: err.stack } },
    'Failed to start HTTP server — aborting',
  );
  process.exit(1);
}