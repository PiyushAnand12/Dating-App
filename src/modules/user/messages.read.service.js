import { getSignedObjectUrl } from '../../utils/signedUrl.js';
import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';

export const getConversationWithUser = async ({
  currentUserId,
  otherUserId,
  page = 1,
  limit = 10,
}) => {
  if (!currentUserId || typeof currentUserId !== 'string') {
    throw new AppError(
      'getConversationWithUser: "currentUserId" is required.',
      400,
      'INVALID_INPUT',
    );
  }

  if (!otherUserId || typeof otherUserId !== 'string') {
    throw new AppError(
      'getConversationWithUser: "otherUserId" is required.',
      400,
      'INVALID_INPUT',
    );
  }

  if (currentUserId === otherUserId) {
    throw new AppError(
      'You cannot open a conversation with yourself.',
      400,
      'INVALID_INPUT',
    );
  }

  const normalizedPage = Number(page);
  const normalizedLimit = Number(limit);

  if (!Number.isInteger(normalizedPage) || normalizedPage < 1) {
    throw new AppError(
      'page must be an integer greater than or equal to 1.',
      400,
      'INVALID_INPUT',
    );
  }

  if (!Number.isInteger(normalizedLimit) || normalizedLimit < 1 || normalizedLimit > 50) {
    throw new AppError(
      'limit must be an integer between 1 and 50.',
      400,
      'INVALID_INPUT',
    );
  }

  const match = await prisma.match.findFirst({
    where: {
      OR: [
        { user1Id: currentUserId, user2Id: otherUserId },
        { user1Id: otherUserId, user2Id: currentUserId },
      ],
    },
    select: { id: true },
  });

  if (!match) {
    throw new AppError(
      'You can only view conversations with users you matched with.',
      403,
      'MATCH_REQUIRED',
    );
  }

  const whereClause = {
    OR: [
      {
        senderId: currentUserId,
        receiverId: otherUserId,
      },
      {
        senderId: otherUserId,
        receiverId: currentUserId,
      },
    ],
    isDeleted: false,
  };

  const total = await prisma.message.count({
    where: whereClause,
  });

  const skip = (normalizedPage - 1) * normalizedLimit;

  const messages = await prisma.message.findMany({
    where: whereClause,
    orderBy: {
      createdAt: 'desc',
    },
    skip,
    take: normalizedLimit,
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      type: true,
      body: true,
      mediaUrl: true,
      mediaMimeType: true,
      replyToId: true,
      replyTo: {
        select: {
          id: true,
          body: true,
          senderId: true,
        }
      },
      isEdited: true,
      editedAt: true,
      readAt: true,
      status: true,
      createdAt: true,
    },
  });

  const processedMessages = await Promise.all(messages.reverse().map(async (message) => {
    let signedUrl = message.mediaUrl;
    if (message.mediaUrl && (message.type === 'IMAGE' || message.type === 'AUDIO')) {
      try {
        signedUrl = await getSignedObjectUrl(message.mediaUrl);
      } catch (err) {
        console.error('Failed to sign media URL:', err);
      }
    }
    return {
      ...message,
      mediaUrl: signedUrl,
    };
  }));

  return {
    data: processedMessages,
    meta: {
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      hasNextPage: skip + normalizedLimit < total,
    },
  };
};

export default {
  getConversationWithUser,
};