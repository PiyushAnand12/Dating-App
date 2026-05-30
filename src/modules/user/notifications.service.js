import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { sendToUser as sendPushNotification } from '../../config/firebase.js';
import redis from '../../config/redis.js';
import { logger } from '../../config/logger.js';

/**
 * Register or update a device token for a user.
 * 
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.token
 * @param {string} params.platform - 'FCM' or 'APNS'
 */
export const registerDeviceToken = async ({ userId, token, platform }) => {
  if (!userId || !token || !platform) {
    throw new AppError('userId, token, and platform are required.', 400);
  }

  // Deactivate the token if it's already associated with another user
  await prisma.notificationToken.updateMany({
    where: {
      token,
      userId: { not: userId },
    },
    data: { isActive: false },
  });

  // Upsert the token for this user
  return prisma.notificationToken.upsert({
    where: { token },
    update: {
      userId,
      platform,
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      userId,
      token,
      platform,
      isActive: true,
    },
  });
};

/**
 * Remove a device token (e.g., on logout).
 * 
 * @param {string} token 
 */
export const unregisterDeviceToken = async (token) => {
  return prisma.notificationToken.update({
    where: { token },
    data: { isActive: false },
  });
};

/**
 * Send a notification to a user via all available channels:
 * 1. Activity Feed (Database)
 * 2. Socket.io (Real-time if online)
 * 3. FCM (Push Notification)
 * 
 * @param {string} userId - Recipient
 * @param {string} actorId - Triggering user (optional)
 * @param {Object} notification - { title, body }
 * @param {string} type - Activity type (e.g., 'NEW_MATCH', 'LIKE_RECEIVED')
 * @param {Object} metadata - Additional payload
 */
export const sendNotificationToUser = async (userId, actorId, notification, type, metadata = {}) => {
  try {
    // 1. Create In-App Activity Feed record (Database)
    const { createActivity } = await import('./activity.service.js');
    await createActivity({
      userId,
      actorId,
      type,
      metadata: { ...metadata, ...notification }
    });

    // 2. Try Real-time via Socket.io (using Private Room)
    const { getIO } = await import('../../config/socket.js');
    try {
      const io = getIO();
      // Emitting to the user's private room is 100% reliable
      io.to(`user:${userId}`).emit('notification', {
        ...notification,
        type,
        metadata,
      });
      logger.info({ userId, type }, 'Real-time notification emitted to private room');
    } catch (ioErr) {
      logger.warn({ ioErr }, 'Socket.io broadcast failed');
    }

    // 3. Send Push Notification (FCM)
    await sendPushNotification(userId, notification, { ...metadata, type });
    
    logger.info({ userId, type }, 'Unified notification dispatched successfully');
  } catch (err) {
    logger.error({ err, userId, type }, 'Failed to dispatch unified notification');
  }
};

export default {
  registerDeviceToken,
  unregisterDeviceToken,
  sendNotificationToUser,
};
