import asyncHandler from '../../utils/asyncHandler.js';
import AppError from '../../utils/AppError.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { createSwipe, backtrackSwipe, getLikesReceived } from './swipe.service.js';
import prisma from '../../config/prisma.js';

export const createSwipeHandler = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new AppError('Authentication required.', 401, 'ACCESS_DENIED');
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      kycVideoUrl: true,
      _count: { select: { photos: true } }
    }
  });

  // Bypass KYC/photo check for dev users
  const isDevUser = req.user.id.startsWith('dev-user-') || req.user.id.startsWith('admin-');

  if (!isDevUser && (!currentUser?.kycVideoUrl || currentUser._count.photos === 0)) {
    throw new AppError('You must upload a photo and KYC before swiping.', 403, 'PROFILE_INCOMPLETE');
  }

  const { targetUserId, direction } = req.body ?? {};

  const result = await createSwipe({
    actorId: req.user.id,
    targetUserId,
    direction,
  });

  sendSuccess(res, {
    statusCode: 201,
    message: result.isMatch
      ? 'Swipe saved and match created successfully.'
      : 'Swipe saved successfully.',
    data: result,
  });
});

export const backtrackSwipeHandler = asyncHandler(async (req, res) => {
  const result = await backtrackSwipe(req.user.id);

  sendSuccess(res, {
    message: 'Backtrack successful. Target user removed from your swipes.',
    data: result,
  });
});

export const getLikesReceivedHandler = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await getLikesReceived(req.user.id, { page, limit });

  sendSuccess(res, {
    message: 'Likes received fetched successfully.',
    data: result,
  });
});

export default {
  createSwipeHandler,
  backtrackSwipeHandler,
  getLikesReceivedHandler,
};