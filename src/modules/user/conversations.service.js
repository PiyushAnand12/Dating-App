import AppError from '../../utils/AppError.js';
import prisma from '../../config/prisma.js';
import { getPublicProfile } from './publicProfile.service.js';

export const getMyConversations = async ({ userId, page = 1, limit = 10 }) => {
  if (!userId || typeof userId !== 'string') {
    throw new AppError(
      'getMyConversations: "userId" is required.',
      400,
      'INVALID_INPUT',
    );
  }

  const normalizedPage = Number(page);
  const normalizedLimit = Number(limit);

  if (!Number.isInteger(normalizedPage) || normalizedPage < 1) {
    throw new AppError(
      'getMyConversations: "page" must be an integer greater than or equal to 1.',
      400,
      'INVALID_INPUT',
    );
  }

  if (!Number.isInteger(normalizedLimit) || normalizedLimit < 1 || normalizedLimit > 50) {
    throw new AppError(
      'getMyConversations: "limit" must be an integer between 1 and 50.',
      400,
      'INVALID_INPUT',
    );
  }

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId },
        { receiverId: userId },
      ],
      isDeleted: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      type: true,
      body: true,
      mediaUrl: true,
      createdAt: true,
    },
  });

  const latestByOtherUser = new Map();

  for (const message of messages) {
    const otherUserId =
      message.senderId === userId ? message.receiverId : message.senderId;

    if (!latestByOtherUser.has(otherUserId)) {
      latestByOtherUser.set(otherUserId, message);
    }
  }

  const allConversationEntries = Array.from(latestByOtherUser.entries());
  const total = allConversationEntries.length;
  const skip = (normalizedPage - 1) * normalizedLimit;
  const paginatedEntries = allConversationEntries.slice(skip, skip + normalizedLimit);

  const conversations = await Promise.all(
    paginatedEntries.map(async ([otherUserId, message]) => {
      const profile = await getPublicProfile({ userId: otherUserId });

      return {
        otherUserId,
        lastMessage: {
          messageId: message.id,
          senderId: message.senderId,
          receiverId: message.receiverId,
          type: message.type,
          body: message.body,
          mediaUrl: message.mediaUrl,
          createdAt: message.createdAt,
        },
        user: profile,
      };
    }),
  );

  return {
    data: conversations,
    meta: {
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      hasNextPage: skip + normalizedLimit < total,
    },
  };
};

export default {
  getMyConversations,
};