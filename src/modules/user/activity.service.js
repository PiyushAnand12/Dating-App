import prisma from '../../config/prisma.js';

/**
 * Log a new activity for a user
 */
export const createActivity = async ({ userId, actorId, type, metadata }) => {
  return prisma.activity.create({
    data: {
      userId,
      actorId,
      type,
      metadata: metadata ? JSON.stringify(metadata) : null
    }
  });
};

/**
 * Get paginated activity feed for a user
 */
export const getActivityFeed = async (userId, { page = 1, limit = 20 } = {}) => {
  // Clamp limit to prevent server exhaustion
  const safeLimit = Math.min(Number(limit), 50);
  const skip = (page - 1) * safeLimit;

  const [total, activities] = await Promise.all([
    prisma.activity.count({ where: { userId } }),
    prisma.activity.findMany({
      where: { userId },
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit
    })
  ]);

  const parsedActivities = activities.map(act => ({
    ...act,
    metadata: act.metadata ? JSON.parse(act.metadata) : null
  }));

  return {
    data: parsedActivities,
    meta: {
      total,
      page: Number(page),
      limit: safeLimit,
      hasNextPage: skip + safeLimit < total
    }
  };
};

/**
 * Mark specific or all activities as read
 */
export const markActivitiesRead = async (userId, activityIds = []) => {
  const where = { userId };
  if (activityIds.length > 0) {
    where.id = { in: activityIds };
  }

  return prisma.activity.updateMany({
    where,
    data: { isRead: true }
  });
};

export default {
  createActivity,
  getActivityFeed,
  markActivitiesRead
};
