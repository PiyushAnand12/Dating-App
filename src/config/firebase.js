import admin from 'firebase-admin';
import { config } from './env.js';
import { logger } from './logger.js';

let firebaseApp;

try {
  // Use environment variables for initialization
  const sdkConfig = {
    projectId: config.firebase.projectId,
    clientEmail: config.firebase.clientEmail,
    privateKey: config.firebase.privateKey,
  };

  if (sdkConfig.projectId && sdkConfig.clientEmail && sdkConfig.privateKey) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(sdkConfig),
    });
    logger.info({ projectId: sdkConfig.projectId }, 'Firebase Admin SDK initialized');
  } else {
    logger.warn('Firebase credentials missing. Push notifications will be mocked in development.');
    
    // Minimal mock for development to prevent crashes
    firebaseApp = {
      messaging: () => ({
        send: async (payload) => {
          logger.info({ payload }, '[MOCK-FCM] Notification sent');
          return 'mock-message-id';
        },
        sendEachForMulticast: async (payload) => {
          logger.info({ payload }, '[MOCK-FCM] Multicast notification sent');
          return { successCount: payload.tokens.length, failureCount: 0, responses: [] };
        }
      })
    };
  }
} catch (err) {
  logger.error({ err }, 'Failed to initialize Firebase Admin SDK');
}

import prisma from '../config/prisma.js';

export const messaging = firebaseApp?.messaging() || {
  send: async () => logger.error('FCM not initialized'),
  sendEachForMulticast: async () => logger.error('FCM not initialized')
};

/**
 * Send a push notification to all active devices of a specific user.
 * 
 * @param {string} userId 
 * @param {Object} notification - { title, body }
 * @param {Object} data - Optional data payload
 */
export const sendToUser = async (userId, notification, data = {}) => {
  try {
    const tokens = await prisma.notificationToken.findMany({
      where: { userId, isActive: true },
      select: { token: true },
    });

    if (tokens.length === 0) return;

    const tokenList = tokens.map((t) => t.token);

    const message = {
      notification,
      data,
      tokens: tokenList,
    };

    const response = await messaging.sendEachForMulticast(message);
    logger.info({ userId, successCount: response.successCount, failureCount: response.failureCount }, 'Push notifications sent');
    
    return response;
  } catch (err) {
    logger.error({ err, userId }, 'Failed to send push notification to user');
  }
};

export default firebaseApp;
