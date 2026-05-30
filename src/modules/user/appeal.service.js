import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { ErrorCodes } from '../../utils/ErrorCodes.js';

/**
 * Submit an appeal
 */
export const submitAppeal = async (userId, reason) => {
  // 1. Check if user has a pending appeal
  const existingPending = await prisma.appeal.findFirst({
    where: {
      userId,
      status: 'PENDING',
    },
  });

  if (existingPending) {
    throw new AppError(
      'You already have a pending appeal. Please wait for review.',
      400,
      ErrorCodes.INVALID_INPUT,
    );
  }

  // 2. Create Appeal
  return prisma.appeal.create({
    data: {
      userId,
      reason,
    },
  });
};

/**
 * Get user's appeal history
 */
export const getMyAppeals = async (userId, { page = 1, limit = 10 } = {}) => {
  const normalizedPage = Number(page);
  const normalizedLimit = Math.min(Number(limit), 20);
  const skip = (normalizedPage - 1) * normalizedLimit;

  const [total, appeals] = await Promise.all([
    prisma.appeal.count({ where: { userId } }),
    prisma.appeal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: normalizedLimit
    })
  ]);

  return {
    data: appeals,
    meta: {
      total,
      page: normalizedPage,
      limit: normalizedLimit,
      hasNextPage: skip + normalizedLimit < total
    }
  };
};

/**
 * Get all appeals (Admin only)
 */
export const getAllAppeals = async ({ status, page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;

  const [appeals, total] = await Promise.all([
    prisma.appeal.findMany({
      where: status ? { status } : {},
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            email: true,
            profileStatus: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.appeal.count({ where: status ? { status } : {} }),
  ]);

  return { appeals, total, page, limit };
};

/**
 * Review an appeal (Admin only)
 */
export const reviewAppeal = async (appealId, adminId, { status, remarks }) => {
  const appeal = await prisma.appeal.findUnique({
    where: { id: appealId },
    include: { user: true },
  });

  if (!appeal) {
    throw new AppError('Appeal not found', 404, ErrorCodes.USER_NOT_FOUND);
  }

  if (appeal.status !== 'PENDING') {
    throw new AppError('This appeal has already been reviewed.', 400, ErrorCodes.INVALID_INPUT);
  }

  // 1. Update Appeal record
  const updatedAppeal = await prisma.appeal.update({
    where: { id: appealId },
    data: {
      status,
      adminRemarks: remarks,
      reviewedById: adminId,
      reviewedAt: new Date(),
    },
  });

  // 2. If ACCEPTED, logic to reinstate user (e.g. set status back to APPROVED)
  if (status === 'ACCEPTED') {
    await prisma.user.update({
      where: { id: appeal.userId },
      data: {
        profileStatus: 'APPROVED',
        isActive: true, // Re-activate if they were deactivated
      },
    });
  }

  return updatedAppeal;
};

export default {
  submitAppeal,
  getMyAppeals,
  getAllAppeals,
  reviewAppeal,
};
