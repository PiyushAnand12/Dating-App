import cron from 'node-cron';
import prisma from './prisma.js';
import { logger } from './logger.js';
import discoveryService from '../modules/user/discovery.service.js';
import { sendToUser } from './firebase.js';

/**
 * Initialize all scheduled tasks
 */
import matchmakingService from '../modules/user/matchmaking.service.js';

/**
 * Initialize all scheduled tasks
 */
export const initCrons = () => {
  // 1. Daily Recommendations at 9 AM
  // Schedule: 0 9 * * *
  cron.schedule('0 9 * * *', async () => {
    logger.info('Running Daily Recommendations Cron...');
    try {
      const activeUsers = await prisma.user.findMany({
        where: { 
          isActive: true, 
          isProfileComplete: true,
          profileStatus: 'APPROVED'
        },
        select: { id: true, firstName: true }
      });

      for (const user of activeUsers) {
        // Fetch 5-10 recommended matches
        const recs = await matchmakingService.getDailyRecommendations(user.id, 5);

        if (recs.length > 0) {
          await sendToUser(user.id, {
            title: `Good morning, ${user.firstName}! ☀️`,
            body: `We've handpicked ${recs.length} matches with high compatibility for you today!`,
          }, { type: 'DAILY_RECOMMENDATIONS' });
        }
      }
      logger.info(`Daily Recommendations sent to ${activeUsers.length} users.`);
    } catch (err) {
      logger.error({ err }, 'Daily Recommendations Cron failed');
    }
  });

  // 2. Expired Story Cleanup - Every Hour
  // Schedule: 0 * * * *
  cron.schedule('0 * * * *', async () => {
    logger.info('Running Expired Story Cleanup Cron...');
    try {
      const result = await prisma.story.deleteMany({
        where: { expiresAt: { lt: new Date() } }
      });
      logger.info(`Cleaned up ${result.count} expired stories.`);
    } catch (err) {
      logger.error({ err }, 'Story Cleanup Cron failed');
    }
  });

  // 3. Clear Expired Boosts - Every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    logger.info('Running Expired Boosts Cleanup Cron...');
    try {
      const result = await prisma.userBoost.deleteMany({
        where: { expiresAt: { lt: new Date() } }
      });
      logger.info(`Cleaned up ${result.count} expired boosts.`);
    } catch (err) {
      logger.error({ err }, 'Boost Cleanup Cron failed');
    }
  });

  logger.info('Scheduled tasks initialised.');
};
