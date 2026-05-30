import { Router } from 'express';
import validate from '../../middlewares/validate.middleware.js';
import {
  googleLoginSchema,
  phoneLoginSchema,
  refreshTokenSchema,
} from './auth.validation.js';
import {
  googleLogin,
  phoneLogin,
  refresh,
} from './auth.controller.js';

const router = Router();

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Login with Google
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idToken:
 *                 type: string
 *                 example: google-id-token-here
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid request
 */

// POST /api/v1/auth/google
router.post('/google',  validate(googleLoginSchema),  googleLogin);

/**
 * @swagger
 * /auth/phone:
 *   post:
 *     summary: Login with phone
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+919999999999"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *             required:
 *               - phone
 *               - otp
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid request
 */

// POST /api/v1/auth/phone
router.post('/phone',   validate(phoneLoginSchema),   phoneLogin);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: refresh-token-here
 *             required:
 *               - refreshToken
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Invalid or expired refresh token
 */

// POST /api/v1/auth/refresh
router.post('/refresh', validate(refreshTokenSchema), refresh);

export default router;
