import { Server } from 'socket.io';
import { verifyAccessToken } from '../modules/auth/auth.tokens.js';
import { logger } from './logger.js';
import { config } from './env.js';
import redis from './redis.js';
import prisma from './prisma.js';
import { registerChatHandlers } from '../modules/user/chat.gateway.js';
import { registerVideoCallHandlers } from '../modules/user/videoCall.gateway.js';
import { registerSafetyHandlers } from '../modules/user/safety.gateway.js';
import notificationsService from '../modules/user/notifications.service.js';

let io;

/**
 * Initialize Socket.io server and attach middleware.
 * 
 * @param {import('http').Server} server 
 * @returns {Server}
 */
export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [config.app.corsOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'],
      methods: ['GET', 'POST'],
      credentials: true
    },
  });

  // ─── Auth Middleware ────────────────────────────────────
  io.use((socket, next) => {
    let token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      logger.error('Socket connection rejected: Token missing');
      return next(new Error('Authentication error: Token missing'));
    }

    // Strip "Bearer " if present
    if (token.startsWith('Bearer ')) {
      token = token.slice(7);
    }

    // ── Dev bypass tokens (mirrors HTTP auth middleware) ──
    if (token === 'test-token-2' || token === 'test-token-sam') {
      socket.user = { id: 'dev-user-samantha', role: 'USER', firstName: 'Samantha' };
      return next();
    }
    if (token === 'test-token' || token === 'test-token-dev') {
      socket.user = { id: 'dev-user-1', role: 'USER', firstName: 'Dev' };
      return next();
    }
    if (token === 'admin-test-token') {
      socket.user = { id: 'dev-admin-1', role: 'ADMIN', firstName: 'Admin' };
      return next();
    }

    try {
      const decoded = verifyAccessToken(token);
      
      // Attach user info to the socket
      socket.user = {
        id: decoded.sub,
        role: decoded.role,
      };
      
      next();
    } catch (err) {
      logger.error({ err }, 'Socket connection rejected: Invalid token');
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user?.id;
    logger.info({ userId, socketId: socket.id }, 'Socket connected');

    // ─── Track Online Status ────────────────────────────────
    if (userId) {
      try {
        // Fetch user details to enhance socket.user (for names in calls, etc)
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true }
        });
        if (dbUser) {
          socket.user.firstName = dbUser.firstName;
        }

        await redis.set(`user:${userId}:status`, 'online');
        await redis.set(`user:${userId}:socket`, socket.id);
        
        // Broadcast online status to everyone
        io.emit('user_status', { userId, status: 'online' });

        // ── Notify Followers (Smart Favorites) ──────────────────
        (async () => {
          try {
            const followers = await prisma.favorite.findMany({
              where: { targetId: userId },
              select: { actorId: true },
            });

            if (followers.length > 0) {
              const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { firstName: true }
              });
              const message = `${user?.firstName || 'A user you favorited'} is now online!`;
              
              for (const follower of followers) {
                // Only send if they aren't the same user (sanity check)
                if (follower.actorId !== userId) {
                  await notificationsService.sendNotificationToUser(
                    follower.actorId, 
                    userId, 
                    { title: 'Someone is Online!', body: message }, 
                    'FAVORITE_ONLINE', 
                    { userId }
                  );
                }
              }
            }
          } catch (notifyErr) {
            logger.error({ notifyErr }, 'Failed to send favorite online notifications');
          }
        })();
      } catch (err) {
        logger.error({ err, userId }, 'Failed to set online status in Redis');
      }
    }

    // Join private notification room
    socket.join(`user:${userId}`);

    // ─── Register Module Handlers ───────────────────────────
    registerChatHandlers(io, socket);
    registerVideoCallHandlers(io, socket);
    registerSafetyHandlers(io, socket);

    // Broadcast online status to all matches via their private rooms
    const broadcastStatus = async (isOnline) => {
      try {
        const matches = await prisma.match.findMany({
          where: {
            OR: [{ user1Id: userId }, { user2Id: userId }]
          },
          select: { user1Id: true, user2Id: true }
        });

        matches.forEach(match => {
          const otherId = match.user1Id === userId ? match.user2Id : match.user1Id;
          // Emit to the match's global room instead of a specific chat room
          io.to(`user:${otherId}`).emit('user_status', {
            userId,
            isOnline,
            lastActiveAt: new Date()
          });
        });
      } catch (err) {
        logger.error({ err }, 'Failed to broadcast status');
      }
    };

    broadcastStatus(true);

    socket.on('disconnect', async () => {
      logger.info({ userId, socketId: socket.id }, 'Socket disconnected');
      broadcastStatus(false);
      
      if (userId) {
        try {
          // Verify if this is still the active socket for the user before deleting
          const currentSocketId = await redis.get(`user:${userId}:socket`);
          if (currentSocketId === socket.id) {
            await redis.del(`user:${userId}:status`);
            await redis.del(`user:${userId}:socket`);
            
            // Broadcast offline status
            io.emit('user_status', { userId, status: 'offline', lastSeen: new Date() });
            
            // Update lastActiveAt in DB
            try {
              await prisma.user.update({
                where: { id: userId },
                data: { lastActiveAt: new Date() }
              });
            } catch (dbErr) {
              logger.warn({ userId }, 'Could not update lastActiveAt - user might not exist in DB');
            }
          }
        } catch (err) {
          logger.error({ err, userId }, 'Failed to remove online status from Redis');
        }
      }
    });
  });

  return io;
};

/**
 * Get initialized IO instance.
 * 
 * @returns {Server}
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
