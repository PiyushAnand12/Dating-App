import { logger } from '../../config/logger.js';
import { sendDirectMessage, forwardMessage, editMessage, deleteMessage, markAsRead } from './messages.service.js';

/**
 * Handle chat-related socket events.
 * 
 * @param {import('socket.io').Server} io 
 * @param {import('socket.io').Socket} socket 
 */
export const registerChatHandlers = (io, socket) => {
  const userId = socket.user?.id;
  if (!userId) {
    logger.warn({ socketId: socket.id }, 'Chat handlers skipped: Socket user missing');
    return;
  }

  const getRoomId = (otherId) => [userId, otherId].sort().join('_');

  /**
   * Join a private chat room with another user.
   */
  socket.on('join_conversation', ({ otherUserId }) => {
    if (!otherUserId) return;
    const fullRoomId = `chat:${getRoomId(otherUserId)}`;
    socket.join(fullRoomId);
    console.log(`[SOCKET] User ${userId} joined room ${fullRoomId}`);
    logger.info({ userId, otherUserId, fullRoomId }, 'User joined conversation room');
  });

  /**
   * Handle real-time typing indicators
   */
  socket.on('typing', ({ otherUserId, isTyping }) => {
    if (!otherUserId) return;
    io.to(`user:${otherUserId}`).emit('typing_update', { userId, isTyping });
  });

  /**
   * Handle instant message sending (with reply support)
   */
  socket.on('send_message', async ({ receiverId, body, replyToId, tempId }, callback) => {
    if (!receiverId || !body) return;

    try {
      const messageData = await sendDirectMessage({
        senderId: userId,
        receiverId,
        body,
        replyToId
      });

      const broadcastData = JSON.parse(JSON.stringify({ 
        ...messageData, 
        userId: userId, 
        senderId: userId,
        receiverId: receiverId,
        tempId 
      }));

      const fullRoomId = `chat:${getRoomId(receiverId)}`;
      const receiverRoomId = `user:${receiverId}`;
      const senderRoomId = `user:${userId}`;
      
      io.to(fullRoomId).emit('new_message', broadcastData);
      io.to(receiverRoomId).emit('new_message', broadcastData);
      io.to(senderRoomId).emit('new_message', broadcastData);
      
      if (callback) callback({ status: 'ok', messageId: messageData.id });
      logger.info({ messageId: messageData.id, receiverId }, 'Message broadcasted via socket');
    } catch (err) {
      logger.error({ err, userId, receiverId }, 'Failed to send socket message');
      socket.emit('error', { message: err.message });
    }
  });

  /**
   * Handle message editing (within 5 mins)
   */
  socket.on('edit_message', async ({ messageId, receiverId, newBody }) => {
    try {
      const updatedMessage = await editMessage(userId, messageId, newBody);
      const fullRoomId = `chat:${getRoomId(receiverId)}`;
      io.to(fullRoomId).to(`user:${receiverId}`).emit('message_edited', updatedMessage);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  /**
   * Handle message deletion (within 5 mins)
   */
  socket.on('delete_message', async ({ messageId, receiverId }) => {
    try {
      await deleteMessage(userId, messageId);
      const fullRoomId = `chat:${getRoomId(receiverId)}`;
      io.to(fullRoomId).to(`user:${receiverId}`).emit('message_deleted', { messageId });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  /**
   * Handle message seen (read receipts)
   */
  socket.on('message_seen', async ({ senderId }) => {
    try {
      await markAsRead(userId, senderId);
      // Dual-channel broadcast for 100% reliability
      const roomId = `chat:${getRoomId(senderId)}`;
      io.to(roomId).to(`user:${senderId}`).emit('messages_read', { readerId: userId });
    } catch (err) {
      logger.error({ err }, 'Failed to mark messages as read');
    }
  });

  /**
   * Handle typing indicator
   */
  socket.on('typing', ({ otherUserId, isTyping }) => {
    if (!otherUserId) return;
    // Push directly to the other user's global room for maximum reliability
    io.to(`user:${otherUserId}`).emit('typing_update', { userId, isTyping });
  });

  /**
   * Handle room departure
   */
  socket.on('leave_conversation', ({ otherUserId }) => {
    if (!otherUserId) return;
    socket.leave(`chat:${getRoomId(otherUserId)}`);
  });

  /**
   * Handle message forwarding
   */
  socket.on('forward_message', async ({ messageId, receiverId }) => {
    if (!messageId || !receiverId) return;
    try {
      const forwardedMessage = await forwardMessage(userId, messageId, receiverId);
      const fullRoomId = `chat:${getRoomId(receiverId)}`;
      io.to(fullRoomId).to(`user:${receiverId}`).emit('new_message', forwardedMessage);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });
  
  socket.on('edit_message', ({ messageId, newBody, otherUserId }) => {
    const roomId = `chat:${getRoomId(otherUserId)}`;
    io.to(roomId).emit('message_edited', { messageId, newBody });
  });

  socket.on('delete_message', ({ messageId, otherUserId }) => {
    const roomId = `chat:${getRoomId(otherUserId)}`;
    io.to(roomId).emit('message_deleted', { messageId });
  });

  /**
   * Handle screenshot detection alert
   */
  socket.on('chat_screenshot', ({ receiverId }) => {
    if (!receiverId) return;
    const fullRoomId = `chat:${getRoomId(receiverId)}`;
    io.to(fullRoomId).to(`user:${receiverId}`).emit('screenshot_alert', { 
      userId, 
      timestamp: new Date().toISOString() 
    });
    logger.info({ userId, receiverId }, 'Chat screenshot detected and broadcasted');
  });
};
