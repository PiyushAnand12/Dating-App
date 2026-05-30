import pinoHttp from 'pino-http';
import { logger } from '../config/logger.js';

const requestLogger = pinoHttp({
  logger,
  customSuccessMessage: (req, res) =>
    `${req.method} ${req.originalUrl} ${res.statusCode}`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.originalUrl} ${res.statusCode} — ${err.message}`,
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    responseTime: 'elapsed_ms',
  },
  redact: {
    paths: ['request.headers.authorization', 'request.headers.cookie'],
    censor: '[REDACTED]',
  },
});

export default requestLogger;
