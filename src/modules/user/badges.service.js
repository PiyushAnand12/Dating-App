import prisma from '../../config/prisma.js';
import { logger } from '../../config/logger.js';

/**
 * Grant a badge to a user if they don't already have it
 */
export const grantBadge = async (userId, type) => {
  try {
    return await prisma.userBadge.upsert({
      where: {
        userId_type: { userId, type }
      },
      update: {},
      create: { userId, type }
    });
  } catch (err) {
    logger.error({ err, userId, type }, 'Failed to grant badge');
  }
};

/**
 * Audit user for Active Dater badge
 * Requirement: 50+ swipes in the last 7 days
 */
export const auditActiveDater = async (userId) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const swipesCount = await prisma.swipe.count({
    where: {
      actorId: userId,
      createdAt: { gte: sevenDaysAgo }
    }
  });

  if (swipesCount >= 50) {
    await grantBadge(userId, 'ACTIVE_DATER');
    return true;
  }
  return false;
};

/**
 * Get all badges for a user
 */
export const getUserBadges = async (userId) => {
  return prisma.userBadge.findMany({
    where: { userId },
    orderBy: { grantedAt: 'desc' }
  });
};

export default {
  grantBadge,
  auditActiveDater,
  getUserBadges,
};
