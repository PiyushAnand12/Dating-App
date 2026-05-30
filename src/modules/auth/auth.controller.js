import asyncHandler from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import {
  loginWithGoogle,
  loginWithPhone,
  refreshTokens,
} from './auth.service.js';

/**
 * POST /api/v1/auth/google
 */
export const googleLogin = asyncHandler(async (req, res) => {
  const tokens = await loginWithGoogle(req.body);
  sendSuccess(res, {
    statusCode: 200,
    message: 'Logged in with Google',
    data: tokens,
  });
});

/**
 * POST /api/v1/auth/phone
 */
export const phoneLogin = asyncHandler(async (req, res) => {
  const tokens = await loginWithPhone(req.body);
  sendSuccess(res, {
    statusCode: 200,
    message: 'Logged in with phone',
    data: tokens,
  });
});

/**
 * POST /api/v1/auth/refresh
 */
export const refresh = asyncHandler(async (req, res) => {
  const tokens = await refreshTokens(req.body);
  sendSuccess(res, {
    statusCode: 200,
    message: 'Tokens refreshed',
    data: tokens,
  });
});
