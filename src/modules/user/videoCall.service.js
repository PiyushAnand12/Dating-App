import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { createActivity } from './activity.service.js';

/**
 * Create an initial call record (Dialing)
 */
export const initiateCallLog = async (callerId, receiverId) => {
  // Check if they are matched
  const match = await prisma.match.findFirst({
    where: {
      OR: [
        { user1Id: callerId, user2Id: receiverId },
        { user1Id: receiverId, user2Id: callerId }
      ]
    }
  });

  if (!match) {
    throw new AppError('You can only call users you have matched with.', 403);
  }

  return prisma.videoCall.create({
    data: {
      callerId,
      receiverId,
      status: 'DIALED'
    }
  });
};

/**
 * Mark call as connected
 */
export const connectCallLog = async (callId) => {
  return prisma.videoCall.update({
    where: { id: callId },
    data: {
      status: 'CONNECTED',
      startTime: new Date()
    }
  });
};

/**
 * Handle call completion/termination
 */
export const completeCallLog = async (callId, status) => {
  const call = await prisma.videoCall.findUnique({ where: { id: callId } });
  if (!call) return null;

  const endTime = new Date();
  let duration = 0;

  if (call.startTime && status === 'ENDED') {
    duration = Math.floor((endTime.getTime() - call.startTime.getTime()) / 1000);
  }

  // ─── Log Missed Call Activity ──────────────────────
  if (status === 'MISSED') {
    await createActivity({
      userId: call.receiverId,
      actorId: call.callerId,
      type: 'MISSED_CALL',
      metadata: { callId }
    });
  }

  return prisma.videoCall.update({
    where: { id: callId },
    data: {
      status,
      endTime,
      duration
    }
  });
};

/**
 * Get call history for a user
 */
export const getCallHistory = async (userId, { page = 1, limit = 20 } = {}) => {
  const safeLimit = Math.min(Number(limit), 100);
  const skip = (page - 1) * safeLimit;

  const [total, calls] = await Promise.all([
    prisma.videoCall.count({
      where: { OR: [{ callerId: userId }, { receiverId: userId }] }
    }),
    prisma.videoCall.findMany({
      where: {
        OR: [{ callerId: userId }, { receiverId: userId }]
      },
      include: {
        caller: { select: { id: true, firstName: true, avatarUrl: true } },
        receiver: { select: { id: true, firstName: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit
    })
  ]);

  return {
    data: calls,
    meta: {
      total,
      page: Number(page),
      limit: safeLimit,
      hasNextPage: skip + safeLimit < total
    }
  };
};

export default {
  initiateCallLog,
  connectCallLog,
  completeCallLog,
  getCallHistory
};
