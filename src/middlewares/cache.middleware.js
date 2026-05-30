import redis from '../config/redis.js';
import { logger } from '../config/logger.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Global Redis Caching Middleware for GET requests
 * @param {number} ttl - Cache time-to-live in seconds (default 5 minutes)
 */
export const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching for specific non-cacheable GET routes (like profile settings)
    const skipPaths = [
      '/health', 
      '/api/docs.json', 
      '/api/v1/auth/me', 
      '/api/v1/payments/config',
      '/api/v1/users/me',
      '/api/v1/users/prompts',
      '/api/v1/media/my-photos',
      '/api/v1/users/interests'
    ];
    if (skipPaths.some(path => req.originalUrl.includes(path))) {
      return next();
    }

    // Determine cache key - Must be user-specific for security
    let userId = 'public';
    
    // 1. Check if user is already attached to request (if auth middleware ran first)
    if (req.user?.id) {
      userId = req.user.id;
    } 
    // 2. Otherwise, peek at the JWT token if present to generate a specific key
    // This allows applying the middleware globally before route-specific auth
    else if (req.headers.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      
      // Handle non-JWT dev tokens specifically
      const devTokenMap = {
        'test-token': 'dev-user-1',
        'test-token-2': 'dev-user-samantha',
        'test-token-banned': 'banned-user-1',
        'admin-test-token': 'dev-admin-1'
      };

      if (devTokenMap[token]) {
        userId = devTokenMap[token];
      } else {
        try {
          const decoded = jwt.verify(token, config.jwt.secret);
          userId = decoded.sub || decoded.id || 'public';
        } catch (err) {
          // If token is invalid, fallback to public (actual auth middleware will reject the request later)
          userId = 'public';
        }
      }
    }

    const key = `cache:${userId}:${req.originalUrl}`;

    try {
      if (!redis) {
        return next();
      }

      // Check cache
      const cachedResponse = await redis.get(key);
      if (cachedResponse) {
        logger.debug({ key }, 'Redis Cache Hit');
        res.set('X-Cache', 'HIT');
        return res.json(JSON.parse(cachedResponse));
      }

      res.set('X-Cache', 'MISS');

      // Intercept res.json to store the response in Redis before sending
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.set(key, JSON.stringify(body), 'EX', ttl).catch(err => {
            logger.error({ err, key }, 'Redis Cache Store Error');
          });
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      logger.error({ err, key }, 'Global Cache Middleware Error');
      next();
    }
  };
};

export default cacheMiddleware;
