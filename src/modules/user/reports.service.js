import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { logger } from '../../config/logger.js';
import { ErrorCodes } from '../../utils/ErrorCodes.js';
import { optimizeImage } from '../../utils/imageProcessor.js';
import { uploadToStorage } from '../../utils/uploadToStorage.js';

/**
 * Create a report against a user
 */
export const createReport = async (actorId, targetId, reason, details, file) => {
  if (actorId === targetId) {
    throw new AppError('You cannot report yourself.', 400, ErrorCodes.INVALID_INPUT);
  }

  const validReasons = ['SPAM', 'FAKE_PROFILE', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'UNDERAGE', 'OTHER'];
  const normalizedReason = String(reason).toUpperCase().replace(/ /g, '_');
  if (!validReasons.includes(normalizedReason)) {
    throw new AppError('Invalid report reason.', 400, ErrorCodes.INVALID_INPUT);
  }

  // 1. Rate Limiting Check (Max 5 reports per hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentReportsCount = await prisma.report.count({
    where: {
      actorId,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentReportsCount >= 5) {
    throw new AppError('You have reached the limit for reporting users. Please try again later.', 429, ErrorCodes.RATE_LIMITED);
  }

  // 2. Check if target exists
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);

  // 3. Process Evidence
  let evidenceUrl = null;
  if (file) {
    const optimization = await optimizeImage(file.buffer);
    const key = `reports/${actorId}_${targetId}_${Date.now()}.webp`;
    evidenceUrl = await uploadToStorage(key, optimization.data, 'image/webp');
  }

  // 4. Create Report
  const report = await prisma.report.create({
    data: {
      actorId,
      targetId,
      reason: normalizedReason,
      details,
      evidenceUrl,
    },
  });

  // 4. Auto-hide profile if 10+ reports (Product Requirement Day 13)
  const totalReportsAgainstTarget = await prisma.report.count({
    where: { targetId, status: 'PENDING' },
  });

  if (totalReportsAgainstTarget >= 10) {
    await prisma.user.update({
      where: { id: targetId },
      data: { discoverEnabled: false },
    });
    logger.warn({ targetId }, 'User profile auto-hidden due to high volume of reports');
  }

  return report;
};

/**
 * Get reports (Admin only)
 */
export const getReportsQueue = async ({ status = 'PENDING', page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  
  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where: { status },
      include: {
        actor: { select: { id: true, firstName: true, email: true } },
        target: { select: { id: true, firstName: true, email: true, profileStatus: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.report.count({ where: { status } }),
  ]);

  return { reports, total, page, limit };
};

export default {
  createReport,
  getReportsQueue,
};
