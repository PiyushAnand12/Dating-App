import { logger } from './logger.js';
import AppError from '../utils/AppError.js';

/**
 * Verify a Firebase ID token.
 */
export const verifyFirebaseToken = async (_token) => {
  throw new AppError(
    'Firebase token verification is not implemented.',
    501,
    'AUTH_PROVIDER_NOT_IMPLEMENTED',
  );
};

/**
 * Verify an Auth0 JWT token.
 */
export const verifyAuth0Token = async (_token) => {
  throw new AppError(
    'Auth0 token verification is not implemented.',
    501,
    'AUTH_PROVIDER_NOT_IMPLEMENTED',
  );
};

/**
 * Verify a token using the configured auth provider.
 */
export const verifyToken = async (token) => {
  if (!token || typeof token !== 'string') {
    throw new AppError('idToken is required.', 400, 'INVALID_INPUT');
  }

  if (process.env.NODE_ENV === 'development' && token === 'google-test-token') {
    return {
      email: 'googleuser@example.com',
      name: 'Google User',
    };
  }

  logger.warn('verifyToken called with unsupported token.');

  throw new AppError(
    'Invalid or expired Google token.',
    401,
    'UNAUTHORIZED',
  );
};

logger.debug('authProviders module loaded');

export default {
  verifyFirebaseToken,
  verifyAuth0Token,
  verifyToken,
};