import { logger } from '../../config/logger.js';
import prisma from '../../config/prisma.js';
import { getIO } from '../../config/socket.js';

/**
 * Register Safety Socket Handlers
 * 
 * @param {import('socket.io').Server} io 
 * @param {import('socket.io').Socket} socket 
 */
export const registerSafetyHandlers = (io, socket) => {
  const userId = socket.user?.id;

  /**
   * Handle real-time panic trigger
   */
  socket.on('panic_trigger', async (data) => {
    const { latitude, longitude, alertId } = data;
    logger.warn({ userId, latitude, longitude }, 'REAL-TIME PANIC TRIGGERED');

    try {
      // 1. Fetch the user's details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, phone: true }
      });

      // 2. Fetch emergency contacts
      const contacts = await prisma.emergencyContact.findMany({
        where: { userId },
        select: { userId: true, phone: true }
      });

      const alertPayload = {
        alertId,
        userId,
        userName: user.firstName,
        userPhone: user.phone,
        latitude,
        longitude,
        timestamp: new Date()
      };

      // 3. Notify Admin Moderators in real-time
      io.to('admin').emit('safety_alert', {
        type: 'PANIC_BUTTON',
        ...alertPayload
      });

      // 4. Notify Emergency Contacts (if they are on the platform)
      // We check if any of the contact phone numbers match registered users
      const contactUsers = await prisma.user.findMany({
        where: { 
          phone: { in: contacts.map(c => c.phone) }
        },
        select: { id: true }
      });

      contactUsers.forEach(contactUser => {
        io.to(`user:${contactUser.id}`).emit('emergency_alert', alertPayload);
      });

      logger.info({ userId, contactsNotified: contactUsers.length }, 'Real-time panic alerts broadcasted');
    } catch (err) {
      logger.error({ err, userId }, 'Failed to broadcast real-time panic alert');
    }
  });

  /**
   * Handle alert resolution
   */
  socket.on('panic_resolve', async (data) => {
    const { alertId } = data;
    
    // Broadcast resolution to same channels
    io.to('admin').emit('safety_alert_resolved', { alertId, userId });
    
    // Notify contacts again
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { emergencyContacts: true }
    });

    const contactUsers = await prisma.user.findMany({
      where: { 
        phone: { in: user.emergencyContacts.map(c => c.phone) }
      },
      select: { id: true }
    });

    contactUsers.forEach(contactUser => {
      io.to(`user:${contactUser.id}`).emit('emergency_resolved', { 
        alertId, 
        userName: user.firstName 
      });
    });
  });

  // Join admin room if user is admin
  if (socket.user?.role === 'ADMIN') {
    socket.join('admin');
    logger.info({ userId }, 'Admin joined safety moderation room');
  }
};
