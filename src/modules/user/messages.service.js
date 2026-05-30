import AppError from '../../utils/AppError.js';
import prisma from '../../config/prisma.js';

export const sendDirectMessage = async ({
  senderId,
  receiverId,
  body,
  replyToId,
}) => {
  if (!senderId || typeof senderId !== 'string') {
    throw new AppError('senderId is required.', 400);
  }
  if (!receiverId || typeof receiverId !== 'string') {
    throw new AppError('receiverId is required.', 400);
  }
  if (senderId === receiverId) {
    throw new AppError('You cannot message yourself.', 400);
  }
  if (!body || typeof body !== 'string' || !body.trim()) {
    throw new AppError('Message body is required.', 400);
  }

  // Parallelize receiver and match checks
  const [receiver, match] = await Promise.all([
    prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, isActive: true }
    }),
    prisma.match.findFirst({
      where: {
        OR: [
          { user1Id: senderId, user2Id: receiverId },
          { user1Id: receiverId, user2Id: senderId },
        ],
      },
      select: { id: true }
    })
  ]);

  if (!receiver || !receiver.isActive) {
    throw new AppError('Receiver is not available.', 404);
  }
  if (!match) {
    throw new AppError('You can only message matches.', 403);
  }

  const message = await prisma.message.create({
    data: { senderId, receiverId, body, replyToId, type: 'TEXT', status: 'SENT' },
    include: {
      replyTo: { select: { id: true, body: true } },
      sender: { select: { firstName: true } }
    },
  });

  // ─── Trigger Unified Notification ──────────────────
  try {
    const { sendNotificationToUser } = await import('./notifications.service.js');
    await sendNotificationToUser(
      receiverId,
      senderId,
      { 
        title: `New message from ${message.sender.firstName}`, 
        body: body.length > 50 ? body.substring(0, 47) + '...' : body 
      },
      'NEW_MESSAGE',
      { messageId: message.id }
    );
  } catch (err) {
    console.error('Failed to send message notification:', err);
  }

  return message;
};

export const editMessage = async (userId, messageId, body) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message || message.senderId !== userId) {
    throw new AppError('Unauthorized or message not found.', 403);
  }

  if (new Date() - new Date(message.createdAt) > 24 * 60 * 60 * 1000) {
    throw new AppError('Edit window expired (24h).', 400);
  }

  return await prisma.message.update({
    where: { id: messageId },
    data: {
      body,
      isEdited: true,
      editedAt: new Date(),
    },
  });
};

export const deleteMessage = async (userId, messageId) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message || message.senderId !== userId) {
    throw new AppError('Unauthorized.', 403);
  }

  return await prisma.message.update({
    where: { id: messageId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      body: null,
    },
  });
};

export const reactToMessage = async (userId, messageId, emoji) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { reactions: true }
  });

  if (!message) {
    throw new AppError('Message not found.', 404);
  }

  let reactions = [];
  try {
    reactions = typeof message.reactions === 'string' ? JSON.parse(message.reactions) : (message.reactions || []);
  } catch (err) {
    reactions = [];
  }
  
  if (!Array.isArray(reactions)) reactions = [];

  const existingIndex = reactions.findIndex(r => r.userId === userId && r.emoji === emoji);
  
  if (existingIndex > -1) {
    reactions.splice(existingIndex, 1);
  } else {
    reactions.push({ userId, emoji, createdAt: new Date() });
  }

  const updatedMessage = await prisma.message.update({
    where: { id: messageId },
    data: { reactions: JSON.stringify(reactions) },
    select: { reactions: true }
  });

  try {
    return JSON.parse(updatedMessage.reactions);
  } catch (err) {
    return [];
  }
};

export const getMessageById = async (messageId) => {
  return await prisma.message.findUnique({
    where: { id: messageId },
    select: { senderId: true, receiverId: true }
  });
};

export const forwardMessage = async (userId, messageId, receiverId) => {
  const originalMessage = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!originalMessage) {
    throw new AppError('Original message not found.', 404);
  }

  return await prisma.message.create({
    data: {
      senderId: userId,
      receiverId,
      body: originalMessage.body,
      type: originalMessage.type,
      status: 'SENT',
    },
  });
};

export const markAsRead = async (userId, senderId) => {
  return await prisma.message.updateMany({
    where: {
      senderId,
      receiverId: userId,
      status: { not: 'READ' },
    },
    data: {
      status: 'READ',
      readAt: new Date(),
    },
  });
};

export const markAsDelivered = async (messageId) => {
  return await prisma.message.update({
    where: { id: messageId },
    data: {
      status: 'DELIVERED',
      deliveredAt: new Date(),
    },
  });
};

export default {
  sendDirectMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  getMessageById,
  forwardMessage,
  markAsRead,
  markAsDelivered,
};
