import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { ErrorCodes } from '../../utils/ErrorCodes.js';

/**
 * Activate a profile boost for a user
 */
export const activateBoost = async (userId, durationHours = 1) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, subscriptionTier: true },
  });

  if (!user) throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);

  // Check if already boosted
  const activeBoost = await prisma.userBoost.findFirst({
    where: {
      userId,
      expiresAt: { gte: new Date() },
    },
  });

  if (activeBoost) {
    throw new AppError('Profile is already boosted.', 400, 'ALREADY_BOOSTED');
  }

  // Calculate expiry
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

  const boost = await prisma.userBoost.create({
    data: {
      userId,
      expiresAt,
    },
  });

  return boost;
};

/**
 * Check if a user has an active boost
 */
export const hasActiveBoost = async (userId) => {
  const count = await prisma.userBoost.count({
    where: {
      userId,
      expiresAt: { gte: new Date() },
    },
  });
  return count > 0;
};

export default {
  activateBoost,
  hasActiveBoost,
};
