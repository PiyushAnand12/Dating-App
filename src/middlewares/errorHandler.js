import { logger } from '../config/logger.js';
import AppError from '../utils/AppError.js';

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const isOperational = err instanceof AppError && err.isOperational;

  const statusCode = Number.isInteger(err.statusCode)
    ? err.statusCode
    : 500;

  const errorCode = isOperational
    ? err.errorCode || 'APP_ERROR'
    : 'INTERNAL_ERROR';

  const message = isOperational
    ? err.message
    : 'Internal server error';

  const meta = {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    errorCode,
  };

  if (isOperational) {
    logger.warn({ err, ...meta }, err.message);
  } else {
    logger.error({ err, ...meta }, 'Unexpected error');
  }

  const body = {
    status: 'error',
    errorCode,
    message,
  };

  if (isOperational && err.errors != null) {
    body.errors = err.errors;
  }

  return res.status(statusCode).json(body);
};

export default errorHandler;
