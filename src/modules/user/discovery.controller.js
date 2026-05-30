import asyncHandler from '../../utils/asyncHandler.js';
import AppError from '../../utils/AppError.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { getDiscoveryProfiles } from './discovery.service.js';
import redis from '../../config/redis.js';
import prisma from '../../config/prisma.js';

export const getDiscoveryProfilesHandler = asyncHandler(async (req, res) => {
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
    throw new AppError('You must upload a photo and KYC to access discovery.', 403, 'PROFILE_INCOMPLETE');
  }

  const page = req.query.page || 1;
  const limit = req.query.limit || 20;

  const cacheKey = `discovery:${req.user.id}:page:${page}:limit:${limit}`;

  try {
    const cached = await redis.get(cacheKey);

    if (cached) {
      const parsed = JSON.parse(cached);

      return sendSuccess(res, {
        statusCode: 200,
        message: 'Discovery profiles fetched successfully. (cache)',
        data: parsed.data,
        meta: parsed.meta,
      });
    }
  } catch (err) {
    console.error('[redis] read failed:', err.message);
  }

  const result = await getDiscoveryProfiles({
    currentUserId: req.user.id,
    page,
    limit,
  });

  try {
    await redis.setex(cacheKey, 60, JSON.stringify(result));
  } catch (err) {
    console.error('[redis] write failed:', err.message);
  }

  sendSuccess(res, {
    statusCode: 200,
    message: 'Discovery profiles fetched successfully.',
    data: result.data,
    meta: result.meta,
  });
});

export default {
  getDiscoveryProfilesHandler,
};