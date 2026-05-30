import redis from '../../config/redis.js';
import { logger } from '../../config/logger.js';

const CACHE_TTL = 300; // 5 minutes

export const getCachedDiscovery = async (userId, page) => {
  try {
    const cacheKey = `discovery:${userId}:page:${page}`;
    const cachedData = await redis.get(cacheKey);
    
    if (cachedData) {
      logger.info({ userId, page }, 'Discovery cache hit');
      return JSON.parse(cachedData);
    }
    
    return null;
  } catch (err) {
    logger.error({ err, userId }, 'Failed to get discovery cache');
    return null;
  }
};

export const setCachedDiscovery = async (userId, page, data) => {
  try {
    const cacheKey = `discovery:${userId}:page:${page}`;
    await redis.set(cacheKey, JSON.stringify(data), 'EX', CACHE_TTL);
    logger.debug({ userId, page }, 'Discovery cache set');
  } catch (err) {
    logger.error({ err, userId }, 'Failed to set discovery cache');
  }
};

export const clearAllDiscoveryCache = async () => {
  try {
    const keys = await redis.keys('discovery:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info({ count: keys.length }, 'Discovery cache cleared');
    }
  } catch (err) {
    logger.error({ err }, 'Failed to clear discovery cache');
  }
};

export default {
  getCachedDiscovery,
  setCachedDiscovery,
  clearAllDiscoveryCache,
};