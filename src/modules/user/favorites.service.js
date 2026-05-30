import AppError from '../../utils/AppError.js';
import prisma from '../../config/prisma.js';
import { getPublicProfile } from './publicProfile.service.js';

export const addFavorite = async ({ actorId, targetUserId }) => {
  if (!actorId || typeof actorId !== 'string') {
    throw new AppError('addFavorite: "actorId" is required.', 400, 'INVALID_INPUT');
  }

  if (!targetUserId || typeof targetUserId !== 'string') {
    throw new AppError('addFavorite: "targetUserId" is required.', 400, 'INVALID_INPUT');
  }

  if (actorId === targetUserId) {
    throw new AppError('You cannot favorite yourself.', 400, 'INVALID_INPUT');
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      isActive: true,
      discoverEnabled: true,
    },
  });

  if (!targetUser || !targetUser.isActive || !targetUser.discoverEnabled) {
    throw new AppError('Target user is not available.', 404, 'USER_NOT_AVAILABLE');
  }

  // Check if already favorited
  const existingFavorite = await prisma.favorite.findUnique({
    where: {
      actorId_targetId: {
        actorId,
        targetId: targetUserId,
      },
    },
  });

  if (!existingFavorite) {
    // Limit favorites to 100 per user
    const favoriteCount = await prisma.favorite.count({
      where: { actorId },
    });

    if (favoriteCount >= 100) {
      throw new AppError('You can only have up to 100 favorites.', 400, 'LIMIT_REACHED');
    }
  }

  const favorite = await prisma.favorite.upsert({
    where: {
      actorId_targetId: {
        actorId,
        targetId: targetUserId,
      },
    },
    update: {},
    create: {
      actorId,
      targetId: targetUserId,
    },
    include: {
      actor: { select: { firstName: true } }
    }
  });

  // ─── Trigger Unified Notification ──────────────────
  try {
    const { sendNotificationToUser } = await import('./notifications.service.js');
    await sendNotificationToUser(
      targetUserId,
      actorId,
      { 
        title: 'New Fan! ⭐', 
        body: `${favorite.actor.firstName} added you to their favorites!` 
      },
      'FAVORITE_RECEIVED'
    );
  } catch (err) {
    console.error('Failed to send favorite notification:', err);
  }

  return {
    actorId: favorite.actorId,
    targetUserId: favorite.targetId,
    createdAt: favorite.createdAt,
  };
};

export const getMyFavorites = async ({ userId, page = 1, limit = 10 }) => {
  if (!userId || typeof userId !== 'string') {
    throw new AppError('getMyFavorites: "userId" is required.', 400, 'INVALID_INPUT');
  }

  const normalizedPage = Number(page);
  const normalizedLimit = Number(limit);

  if (!Number.isInteger(normalizedPage) || normalizedPage < 1) {
    throw new AppError(
      'getMyFavorites: "page" must be an integer greater than or equal to 1.',
      400,
      'INVALID_INPUT',
    );
  }

  if (!Number.isInteger(normalizedLimit) || normalizedLimit < 1 || normalizedLimit > 50) {
    throw new AppError(
      'getMyFavorites: "limit" must be an integer between 1 and 50.',
      400,
      'INVALID_INPUT',
    );
  }

  const whereClause = {
    actorId: userId,
  };

  const total = await prisma.favorite.count({
    where: whereClause,
  });

  const skip = (normalizedPage - 1) * normalizedLimit;

  const favorites = await prisma.favorite.findMany({
    where: whereClause,
    orderBy: {
      createdAt: 'desc',
    },
    skip,
    take: normalizedLimit,
    include: {
      target: {
        select: {
          id: true,
          firstName: true,
          avatarUrl: true,
          gender: true,
          dateOfBirth: true,
          city: true,
          profileStatus: true,
          discoverEnabled: true,
          isActive: true,
          photos: {
            where: { status: 'APPROVED' },
            orderBy: { position: 'asc' },
            take: 1,
            select: { url: true },
          },
        },
      },
    },
  });

  const enrichedFavorites = favorites.map((fav) => {
    const user = fav.target;
    // Calculate age
    const age = user.dateOfBirth
      ? new Date().getFullYear() - user.dateOfBirth.getFullYear()
      : null;

    return {
      targetUserId: fav.targetId,
      createdAt: fav.createdAt,
      user: {
        ...user,
        age,
        // Map the first photo to match public profile expectation if needed
        mainPhotoUrl: user.photos[0]?.url || null,
        photos: undefined, // cleanup
      },
    };
  });

  return {
    data: enrichedFavorites,
    meta: {
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      hasNextPage: skip + normalizedLimit < total,
    },
  };
};

export const removeFavorite = async (actorId, targetId) => {
  if (!actorId || !targetId) {
    throw new AppError('Invalid input for favorite removal.', 400, 'INVALID_INPUT');
  }

  await prisma.favorite.delete({
    where: {
      actorId_targetId: {
        actorId,
        targetId,
      },
    },
  });

  return { success: true };
};

export const bulkRemoveFavorites = async (actorId, targetIds) => {
  if (!actorId || !Array.isArray(targetIds)) {
    throw new AppError('Invalid input for bulk removal.', 400, 'INVALID_INPUT');
  }

  await prisma.favorite.deleteMany({
    where: {
      actorId,
      targetId: { in: targetIds },
    },
  });

  return { removedCount: targetIds.length };
};

export default {
  addFavorite,
  getMyFavorites,
  bulkRemoveFavorites,
};