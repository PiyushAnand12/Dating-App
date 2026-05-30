import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { uploadToStorage } from '../../utils/uploadToStorage.js';
import { chatVoicePath } from '../../utils/storagePaths.js';
import { getSignedObjectUrl } from '../../utils/signedUrl.js';
import { getIO } from '../../config/socket.js';
import { logger } from '../../config/logger.js';

/**
 * Upload a voice note and create a message
 */
export const sendVoiceNote = async ({ senderId, receiverId, fileBuffer, filename, mimeType, tempId }) => {
  // 1. Basic Validation
  if (!senderId || !receiverId || !fileBuffer) {
    throw new AppError('Missing required fields for voice note', 400);
  }

  // 2. Verify Match exists
  const match = await prisma.match.findFirst({
    where: {
      OR: [
        { user1Id: senderId, user2Id: receiverId },
        { user1Id: receiverId, user2Id: senderId },
      ],
    },
  });

  if (!match) {
    throw new AppError('You can only send voice notes to matches.', 403);
  }

  // 3. Construct Storage Key
  const chatId = match.id;
  const timestamp = Date.now();
  const storageKey = chatVoicePath(chatId, `${timestamp}_${filename}`);

  // 4. Upload to Cloudflare R2
  const uploaded = await uploadToStorage(storageKey, fileBuffer, mimeType);

  // 5. Create Message Record
  const message = await prisma.message.create({
    data: {
      senderId,
      receiverId,
      type: 'AUDIO',
      mediaUrl: uploaded.key,
      mediaMimeType: mimeType,
      body: 'Voice Message',
    },
    include: {
      sender: { select: { firstName: true } }
    }
  });

  // 6. Trigger Real-time Socket Update
  (async () => {
    try {
      const io = getIO();
      const signedUrl = await getSignedObjectUrl(message.mediaUrl).catch(err => {
        logger.error({ err, messageId: message.id }, 'Failed to sign media URL for socket broadcast');
        return message.mediaUrl; // Fallback to raw key so message at least appears
      });

      const broadcastData = {
        ...message,
        userId: senderId, 
        senderId,
        receiverId,
        tempId,
        mediaUrl: signedUrl
      };
      
      const roomId = `chat:${[senderId, receiverId].sort().join('_')}`;
      
      // Multi-channel broadcast for 100% reliability
      io.to(roomId).emit('new_message', broadcastData);
      io.to(`user:${receiverId}`).emit('new_message', broadcastData);
      io.to(`user:${receiverId}`).emit('voice_note_received', broadcastData);

      logger.info({ messageId: message.id, roomId, receiverId }, 'Voice note broadcasted (Triple Channel)');
    } catch (err) {
      logger.error({ err, messageId: message.id }, 'Voice note socket emission critical failure');
    }
  })();

  // 7. Trigger Push Notification
  (async () => {
    try {
      const { sendToUser } = await import('../../config/firebase.js');
      await sendToUser(receiverId, {
        title: message.sender.firstName || 'New Message',
        body: '🎤 Sent a voice message',
      }, {
        type: 'NEW_MESSAGE',
        senderId: message.senderId,
        messageId: message.id,
        messageType: 'AUDIO'
      });
    } catch (err) {
      console.error('Voice note notification failed:', err);
    }
  })();

  return {
    ...message,
    mediaUrl: await getSignedObjectUrl(message.mediaUrl)
  };
};

export default {
  sendVoiceNote,
};
