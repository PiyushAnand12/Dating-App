import Redis from 'ioredis';
import { config } from './env.js';

const redis = new Redis(config.redis.url, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
});

redis.on('error', (err) => {
  console.error('[redis] error:', err.message);
});

export default redis;