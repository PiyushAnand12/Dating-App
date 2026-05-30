import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/auth.middleware.js';
import validate from '../../middlewares/validate.middleware.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import AppError from '../../utils/AppError.js';
import prisma from '../../config/prisma.js';
import { evaluateProfileCompleteness } from '../user/user.service.js';

const router = Router();

// ─── Validation ──────────────────────────────────────────
const setUserInterestsSchema = z.object({
  interestIds: z
    .array(z.string().min(1))
    .max(10, 'You can select up to 10 interests')
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'Interest ids must be unique',
    })
    .optional()
    .default([]),
}).strict();

// ─── GET /api/v1/interests ───────────────────────────────
// Public — returns the master interests list
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const interests = await prisma.interest.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: {
        id:       true,
        name:     true,
        slug:     true,
        category: true,
      },
    });

    sendSuccess(res, {
      statusCode: 200,
      message:    'Interests fetched',
      data:       interests,
    });
  })
);

// ─── POST /api/v1/interests/me ───────────────────────────
// Authenticated — replace the current user's interest selections
router.post(
  '/',
  authenticate,
  validate(setUserInterestsSchema),
  asyncHandler(async (req, res) => {
    const { interestIds = [] } = req.body;
    const userId = req.user.id;

    // Verify all supplied ids exist
    if (interestIds.length > 0) {
      const found = await prisma.interest.findMany({
        where:  { id: { in: interestIds } },
        select: { id: true },
      });

      if (found.length !== interestIds.length) {
        throw new AppError('One or more interest ids are invalid', 422, 'INVALID_INTEREST_IDS');
      }
    }

    // Replace in a transaction — delete existing, insert new
    await prisma.$transaction([
      prisma.userInterest.deleteMany({ where: { userId } }),
      ...(interestIds.length > 0 ? [
        prisma.userInterest.createMany({
          data: interestIds.map((interestId) => ({ userId, interestId })),
        })
      ] : []),
    ]);

    const updated = await prisma.userInterest.findMany({
      where:   { userId },
      include: {
        interest: {
          select: { id: true, name: true, slug: true, category: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    await evaluateProfileCompleteness(userId);

    sendSuccess(res, {
      statusCode: 200,
      message:    'Interests updated',
      data:       updated.map((ui) => ui.interest),
    });
  })
);

export default router;
