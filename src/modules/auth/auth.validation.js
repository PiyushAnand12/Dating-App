import { z } from 'zod';

/**
 * Google/Firebase login — expects an ID token from the client.
 */
export const googleLoginSchema = z.object({
  idToken: z
    .string({ required_error: 'ID token is required' })
    .trim()
    .min(1, 'ID token must not be empty'),
});

/**
 * Phone login — expects an E.164-formatted phone number
 * and a 6-digit OTP verification code.
 */
export const phoneLoginSchema = z.object({
  phone: z
    .string({ required_error: 'Phone number is required' })
    .regex(/^\+[1-9]\d{7,14}$/, 'Phone must be in E.164 format (e.g. +919876543210)'),

  otp: z
    .string({ required_error: 'OTP is required' })
    .regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});

/**
 * Refresh token — expects the refresh token issued at login.
 */
export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({ required_error: 'Refresh token is required' })
    .trim()
    .min(1, 'Refresh token must not be empty'),
});