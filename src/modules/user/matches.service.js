import AppError from '../../utils/AppError.js';
import prisma from '../../config/prisma.js';
import { getPublicProfile } from './publicProfile.service.js';

export const getMyMatches = async ({ userId, page = 1, limit = 10 }) => {
  if (!userId || typeof userId !== 'string') {
    throw new AppError(
      'getMyMatches: "userId" is required.',
      400,
      'INVALID_INPUT',
    );
  }

  const normalizedPage = Number(page);
  const normalizedLimit = Number(limit);

  if (!Number.isInteger(normalizedPage) || normalizedPage < 1) {
    throw new AppError(
      'getMyMatches: "page" must be an integer greater than or equal to 1.',
      400,
      'INVALID_INPUT',
    );
  }

  if (!Number.isInteger(normalizedLimit) || normalizedLimit < 1 || normalizedLimit > 50) {
    throw new AppError(
      'getMyMatches: "limit" must be an integer between 1 and 50.',
      400,
      'INVALID_INPUT',
    );
  }

  const whereClause = {
    OR: [
      { user1Id: userId },
      { user2Id: userId },
    ],
  };

  const total = await prisma.match.count({
    where: whereClause,
  });

  const skip = (normalizedPage - 1) * normalizedLimit;

  const matches = await prisma.match.findMany({
    where: whereClause,
    orderBy: {
      createdAt: 'desc',
    },
    skip,
    take: normalizedLimit,
    select: {
      id: true,
      user1Id: true,
      user2Id: true,
      createdAt: true,
    },
  });

  const enrichedMatches = await Promise.all(
    matches.map(async (match) => {
      const otherUserId =
        match.user1Id === userId ? match.user2Id : match.user1Id;

      const profile = await getPublicProfile({ userId: otherUserId });
      
      // Check live status from Redis/Socket state
      const isOnline = await prisma.user.findUnique({
        where: { id: otherUserId },
        select: { isActive: true } // Placeholder, real logic should check Redis
      });

      // For development/test users, let's force online if they have a match
      // In production, this would use: const isOnline = await redis.get(`user:online:${otherUserId}`);
      const liveOnline = profile.userId.startsWith('dev-user-'); 

      return {
        matchId: match.id,
        createdAt: match.createdAt,
        user: { ...profile, isOnline: liveOnline },
      };
    }),
  );

  return {
    data: enrichedMatches,
    meta: {
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      hasNextPage: skip + normalizedLimit < total,
    },
  };
};

export default {
  getMyMatches,
};