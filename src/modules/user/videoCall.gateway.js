import { logger } from '../../config/logger.js';
import videoCallService from './videoCall.service.js';
import reportsService from './reports.service.js';
import redis from '../../config/redis.js';
import prisma from '../../config/prisma.js';

/**
 * Handle WebRTC Video Call Signaling
 */
export const registerVideoCallHandlers = (io, socket) => {
  const userId = socket.user?.id;

  /**
   * Initiate a call
   */
  socket.on('call:initiate', async ({ receiverId }) => {
    if (!receiverId) return;

    try {
      // 1. Create Dialing Log (Service handles Match-check)
      const call = await videoCallService.initiateCallLog(userId, receiverId);

      // 2. Join the call room
      const roomId = `call:${call.id}`;
      socket.join(roomId);

      // 3. Check if receiver is online
      const receiverSocketId = await redis.get(`user:${receiverId}:socket`);
      
      if (!receiverSocketId) {
        await videoCallService.completeCallLog(call.id, 'MISSED');
        return socket.emit('call:error', { message: 'User is offline', code: 'OFFLINE' });
      }

      // 4. Notify receiver via multiple methods for absolute reliability
      const requestPayload = {
        callId: call.id,
        callerId: userId,
        callerName: socket.user.firstName || 'A user'
      };

      // Method A: User Room (Best for multi-device/multi-tab)
      io.to(`user:${receiverId}`).emit('call:request', requestPayload);
      
      // Method B: Direct Socket ID (Fallback)
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('call:request', requestPayload);
      }

      // ─── Call Timeout Logic (30 Seconds) ──────────────────
      setTimeout(async () => {
        try {
          const callId = call.id;
          const finalCheck = await prisma.videoCall.findUnique({
            where: { id: callId },
            select: { status: true, callerId: true, receiverId: true }
          });

          if (finalCheck && finalCheck.status === 'DIALED') {
            await videoCallService.completeCallLog(callId, 'MISSED');
            
            const timeoutSignal = JSON.parse(JSON.stringify({ 
              callId, 
              status: 'MISSED',
              message: 'Call timed out due to no response.' 
            }));
            const usersToNotify = [finalCheck.callerId, finalCheck.receiverId];
            for (const id of usersToNotify) {
              // Notify the room
              io.to(`user:${id}`).emit('call:timeout', timeoutSignal);
              // Fallback: Notify individual sockets if possible
              const sid = await redis.get(`user:${id}:socket`);
              if (sid) io.to(sid).emit('call:timeout', timeoutSignal);
            }

            const callRoom = `call:${callId}`;
            io.in(callRoom).emit('call:ended', { callId, reason: 'TIMEOUT' });
            io.in(callRoom).socketsLeave(callRoom);
          }
        } catch (error) {
          logger.error({ error, callId: call.id }, 'Call Timeout Watchdog failed');
        }
      }, 30000);

      // 5. Success feedback to caller (for global UI - all sockets of this user)
      io.to(`user:${userId}`).emit('call:started', { 
        callId: call.id, 
        matchName: call.receiver?.firstName || 'User',
        photos: call.receiver?.photos || []
      });

      logger.info({ callId: call.id, callerId: userId, receiverId }, 'Video call initiated');
    } catch (err) {
      logger.error({ err, userId, receiverId }, 'Failed to initiate video call');
      socket.emit('call:error', { message: err.message || 'Call failed', code: err.errorCode });
    }
  });

  /**
   * Accept call
   */
  socket.on('call:accept', async ({ callId, callerId }) => {
    if (!callId || !callerId) return;

    try {
      await videoCallService.connectCallLog(callId);
      
      const roomId = `call:${callId}`;
      socket.join(roomId);

      // 1. Notify the Call Room (for WebRTC relay if active)
      io.in(roomId).emit('call:accepted', { callId, receiverId: userId });
      
      // 2. Notify User Rooms (for CallManager UI sync)
      const usersToNotify = [callerId, userId];
      for (const id of usersToNotify) {
        io.to(`user:${id}`).emit('call:accepted', { callId, receiverId: userId });
      }
    } catch (err) {
      logger.error({ err, callId }, 'Failed to accept call');
    }
  });

  /**
   * Reject call
   */
  socket.on('call:reject', async ({ callId, callerId }) => {
    if (!callId || !callerId) return;

    try {
      await videoCallService.completeCallLog(callId, 'REJECTED');
      
      const targetSocketId = await redis.get(`user:${callerId}:socket`);
      
      // Notify all sockets of the caller
      io.to(`user:${callerId}`).emit('call:rejected', { callId });
      
      // Notify all sockets of the receiver (to clear their UI)
      io.to(`user:${userId}`).emit('call:rejected', { callId });
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:rejected', { callId });
      }
    } catch (err) {
      logger.error({ err, callId }, 'Failed to reject call');
    }
  });

  /**
   * WebRTC Signaling Relay (Offer/Answer/Candidates)
   */
  socket.on('call:signal', async ({ signalData, callId }) => {
    if (!callId || !signalData) return;

    const roomId = `call:${callId}`;
    // Broadcast to others in the call room
    socket.to(roomId).emit('call:signal', {
      from: userId,
      signalData,
      callId
    });
  });

  /**
   * End call
   */
  socket.on('call:end', async ({ callId }) => {
    if (!callId) return;

    try {
      await videoCallService.completeCallLog(callId, 'ENDED');
      
      const roomId = `call:${callId}`;
      io.to(roomId).emit('call:ended', { callId });

      // Sync all sockets for both users
      const callRecord = await prisma.videoCall.findUnique({ where: { id: callId } });
      if (callRecord) {
        io.to(`user:${callRecord.callerId}`).emit('call:ended', { callId });
        io.to(`user:${callRecord.receiverId}`).emit('call:ended', { callId });
      }
      
      // All sockets leave the room
      const room = io.sockets.adapter.rooms.get(roomId);
      if (room) {
        for (const socketId of room) {
          const s = io.sockets.sockets.get(socketId);
          if (s) s.leave(roomId);
        }
      }
    } catch (err) {
      logger.error({ err, callId }, 'Failed to end call');
    }
  });

  /**
   * Report inappropriate call
   */
  socket.on('call:report', async ({ callId, targetId, reason }) => {
    if (!callId || !targetId) return;

    try {
      const report = await reportsService.createReport(userId, targetId, 'VIDEO_CALL_INAPPROPRIATE', `Call ID: ${callId}. Reason: ${reason || 'Inappropriate behavior'}`);
      
      socket.emit('call:report_success', { message: 'Report submitted. The user has been flagged.', reportId: report.id });
    } catch (err) {
      socket.emit('call:error', { message: err.message || 'Failed to submit report' });
    }
  });
};
