import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { ErrorCodes } from '../../utils/ErrorCodes.js';

/**
 * Block a user
 */
export const blockUser = async (actorId, targetId, reason = null) => {
  if (actorId === targetId) {
    throw new AppError('You cannot block yourself.', 400, ErrorCodes.INVALID_INPUT);
  }

  // 1. Create block record
  const block = await prisma.block.upsert({
    where: {
      actorId_targetId: { actorId, targetId },
    },
    update: { reason },
    create: { actorId, targetId, reason },
  });

  // 2. Remove Match if it exists
  const user1Id = actorId < targetId ? actorId : targetId;
  const user2Id = actorId < targetId ? targetId : actorId;

  await prisma.match.deleteMany({
    where: {
      user1Id,
      user2Id,
    },
  });

  // 3. Remove Swipe if it exists (so they don't see each other again easily)
  await prisma.swipe.deleteMany({
    where: {
      OR: [
        { actorId, targetId },
        { actorId: targetId, targetId: actorId },
      ],
    },
  });

  return block;
};

/**
 * Unblock a user
 */
export const unblockUser = async (actorId, targetId) => {
  return prisma.block.delete({
    where: {
      actorId_targetId: { actorId, targetId },
    },
  });
};

/**
 * Get list of blocked users
 */
export const getBlockedUsers = async (userId, { page = 1, limit = 20 } = {}) => {
  const normalizedPage = Number(page);
  const normalizedLimit = Math.min(Number(limit), 50);
  const skip = (normalizedPage - 1) * normalizedLimit;

  const [total, blocks] = await Promise.all([
    prisma.block.count({ where: { actorId: userId } }),
    prisma.block.findMany({
      where: { actorId: userId },
      include: {
        target: {
          select: {
            id: true,
            firstName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: normalizedLimit
    })
  ]);

  return {
    data: blocks,
    meta: {
      total,
      page: normalizedPage,
      limit: normalizedLimit,
      hasNextPage: skip + normalizedLimit < total
    }
  };
};

/**
 * Check if a block exists between two users (either way)
 */
export const isBlocked = async (userA, userB) => {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { actorId: userA, targetId: userB },
        { actorId: userB, targetId: userA },
      ],
    },
  });
  return !!block;
};

export default {
  blockUser,
  unblockUser,
  getBlockedUsers,
  isBlocked,
};
