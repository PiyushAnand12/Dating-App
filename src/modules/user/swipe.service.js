import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { createActivity } from './activity.service.js';

const normalizePair = (userA, userB) => {
  return userA < userB ? [userA, userB] : [userB, userA];
};

export const createSwipe = async ({
  actorId,
  targetUserId,
  direction,
}) => {
  const normalizedDirection = direction.trim().toUpperCase();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Use a transaction for atomic checks and writes
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch actor and target simultaneously with selective fields
    const [actor, targetUser, existingSwipe] = await Promise.all([
      tx.user.findUnique({
        where: { id: actorId },
        select: { id: true, subscriptionTier: true }
      }),
      tx.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, isActive: true, discoverEnabled: true, profileStatus: true, firstName: true }
      }),
      tx.swipe.findUnique({
        where: { actorId_targetId: { actorId, targetId: targetUserId } }
      })
    ]);

    if (!actor) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    if (existingSwipe) throw new AppError('Already swiped.', 409, 'DUPLICATE_SWIPE');
    if (!targetUser || !targetUser.isActive || targetUser.profileStatus !== 'APPROVED') {
      throw new AppError('Target user unavailable.', 404, 'USER_NOT_AVAILABLE');
    }

    const isPremium = ['GOLD', 'PLATINUM', 'ELITE'].includes(actor.subscriptionTier);

    // 2. Limit checks
    if (!isPremium) {
      if (normalizedDirection === 'LIKE') {
        const count = await tx.swipe.count({
          where: { actorId, direction: 'LIKE', createdAt: { gte: twentyFourHoursAgo } }
        });
        if (count >= 50) throw new AppError('Daily like limit reached.', 403, 'UPGRADE_REQUIRED');
      } else if (normalizedDirection === 'SUPERLIKE') {
        const count = await tx.swipe.count({
          where: { actorId, direction: 'SUPERLIKE', createdAt: { gte: twentyFourHoursAgo } }
        });
        if (count >= 1) throw new AppError('Daily super like limit reached.', 403, 'UPGRADE_REQUIRED');
      }
    }

    // 3. Create Swipe
    const swipe = await tx.swipe.create({
      data: { actorId, targetId: targetUserId, direction: normalizedDirection }
    });

    let isMatch = false;
    let match = null;

    if (['LIKE', 'SUPERLIKE'].includes(normalizedDirection)) {
      const reverseSwipe = await tx.swipe.findUnique({
        where: { actorId_targetId: { actorId: targetUserId, targetId: actorId } }
      });

      if (reverseSwipe && ['LIKE', 'SUPERLIKE'].includes(reverseSwipe.direction)) {
        const [user1Id, user2Id] = normalizePair(actorId, targetUserId);
        match = await tx.match.upsert({
          where: { user1Id_user2Id: { user1Id, user2Id } },
          update: {},
          create: { user1Id, user2Id }
        });
        isMatch = true;
      }
    }

    // 4. Async Notifications (Don't wait for these to block the transaction return)
    // In a real prod environment, these would be queued in a background job
    if (['LIKE', 'SUPERLIKE'].includes(normalizedDirection)) {
      const { sendNotificationToUser } = await import('./notifications.service.js');
      if (isMatch) {
        const actorName = (await tx.user.findUnique({ where: { id: actorId }, select: { firstName: true } }))?.firstName;
        sendNotificationToUser(targetUserId, actorId, { title: 'New Match! ❤️', body: `You matched with ${actorName}!` }, 'NEW_MATCH', { matchId: match.id }).catch(() => {});
        sendNotificationToUser(actorId, targetUserId, { title: 'New Match! ❤️', body: `You matched with ${targetUser.firstName}!` }, 'NEW_MATCH', { matchId: match.id }).catch(() => {});
      } else {
        const isSuper = normalizedDirection === 'SUPERLIKE';
        sendNotificationToUser(targetUserId, actorId, { 
          title: isSuper ? 'Priority Super Like! ⭐' : 'New Like! ✨', 
          body: isSuper ? 'Someone just Super Liked you!' : 'Someone just liked your profile!' 
        }, isSuper ? 'SUPERLIKE_RECEIVED' : 'LIKE_RECEIVED').catch(() => {});
      }
    }

    return {
      swipeId: swipe.id,
      actorId: swipe.actorId,
      targetUserId: swipe.targetId,
      direction: swipe.direction,
      isMatch,
      matchId: match ? match.id : null,
    };
  });
};

/**
 * Backtrack the last swipe for Premium/Elite users
 */
export const backtrackSwipe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });

  if (user.subscriptionTier === 'FREE') {
    throw new AppError('Backtrack is a premium feature. Upgrade now!', 403, 'UPGRADE_REQUIRED');
  }

  const lastSwipe = await prisma.swipe.findFirst({
    where: { actorId: userId },
    orderBy: { createdAt: 'desc' },
    include: { target: { select: { firstName: true } } },
  });

  if (!lastSwipe) {
    throw new AppError('No swipes to backtrack.', 404, 'NOT_FOUND');
  }

  // Check if it resulted in a match
  const [u1, u2] = normalizePair(userId, lastSwipe.targetId);
  const match = await prisma.match.findUnique({
    where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
  });

  if (match) {
    throw new AppError('Cannot backtrack a swipe that resulted in a match.', 400, 'INVALID_ACTION');
  }

  await prisma.swipe.delete({
    where: { id: lastSwipe.id },
  });

  return {
    message: 'Backtrack successful',
    targetUserId: lastSwipe.targetId,
    targetFirstName: lastSwipe.target.firstName,
  };
};

/**
 * Get users who liked the current user (See who liked you)
 * Premium/Elite only.
 */
export const getLikesReceived = async (userId, { page = 1, limit = 10 } = {}) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });

  if (user.subscriptionTier === 'FREE') {
    throw new AppError('See who liked you is a premium feature. Upgrade now!', 403, 'UPGRADE_REQUIRED');
  }

  const normalizedPage = Number(page);
  const normalizedLimit = Math.min(Number(limit), 50);
  const skip = (normalizedPage - 1) * normalizedLimit;

  // Find all LIKE swipes towards this user that haven't been matched yet
  // We exclude users that the current user has already swiped on
  const swipedByIds = await prisma.swipe.findMany({
    where: { actorId: userId },
    select: { targetId: true },
  });

  const excludedIds = swipedByIds.map(s => s.targetId);

  const whereClause = {
    targetId: userId,
    direction: 'LIKE',
    actorId: { notIn: excludedIds }
  };

  const [total, incomingLikes] = await Promise.all([
    prisma.swipe.count({ where: whereClause }),
    prisma.swipe.findMany({
      where: whereClause,
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            dateOfBirth: true,
            city: true,
            photos: {
              where: { status: 'APPROVED' },
              orderBy: { position: 'asc' },
              take: 1
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: normalizedLimit
    })
  ]);

  const data = incomingLikes.map(like => {
    const u = like.actor;
    return {
      userId: u.id,
      firstName: u.firstName,
      age: u.dateOfBirth ? Math.floor((new Date() - new Date(u.dateOfBirth)) / 31557600000) : null,
      city: u.city,
      photo: u.photos[0]?.url || null,
      likedAt: like.createdAt
    };
  });

  return {
    data,
    meta: {
      total,
      page: normalizedPage,
      limit: normalizedLimit,
      hasNextPage: skip + normalizedLimit < total
    }
  };
};

export default {
  createSwipe,
  backtrackSwipe,
  getLikesReceived
};