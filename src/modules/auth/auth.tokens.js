import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';
import AppError from '../../utils/AppError.js';

/**
 * Generate a short-lived access token.
 *
 * @param {{ id: string, role: string }} payload
 * @returns {string}
 */
export const generateAccessToken = (payload) =>
  jwt.sign(
    { sub: payload.id, role: payload.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

/**
 * Generate a long-lived refresh token.
 *
 * @param {{ id: string }} payload
 * @returns {string}
 */
export const generateRefreshToken = (payload) =>
  jwt.sign(
    { sub: payload.id },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

/**
 * Verify an access token.
 *
 * @param {string} token
 * @returns {import('jsonwebtoken').JwtPayload | string}
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (err) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      throw new AppError('Access token expired', 401, 'TOKEN_EXPIRED');
    }
    throw new AppError('Invalid access token', 401, 'INVALID_TOKEN');
  }
};

/**
 * Verify a refresh token.
 *
 * @param {string} token
 * @returns {import('jsonwebtoken').JwtPayload | string}
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret);
  } catch (err) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      throw new AppError('Refresh token expired', 401, 'REFRESH_TOKEN_EXPIRED');
    }
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }
};

/**
 * Generate both access and refresh tokens for a user.
 *
 * @param {{ id: string, role: string }} user
 * @returns {{ accessToken: string, refreshToken: string }}
 */
export const generateTokenPair = (user) => ({
  accessToken:  generateAccessToken(user),
  refreshToken: generateRefreshToken(user),
});
