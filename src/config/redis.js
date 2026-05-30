import Redis from 'ioredis';
import { config } from './env.js';
import { logger } from './logger.js';

let redis;

if (process.env.NODE_ENV === 'development' && config.redis.url.includes('localhost')) {
  logger.info('Development mode detected with localhost redis. Using ioredis-mock for stability.');
  // Using dynamic import to avoid bundling it in production
  const { default: RedisMock } = await import('ioredis-mock');
  redis = new RedisMock();
} else {
  try {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 20,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      logger.error({ err }, 'Redis client error');
    });

    redis.on('connect', () => logger.info('Redis connection established'));
    redis.on('ready', () => logger.info('Redis client ready'));
  } catch (err) {
    logger.error({ err }, 'Failed to initialize Redis client');
  }
}

export default redis;