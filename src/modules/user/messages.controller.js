import asyncHandler from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import * as messagesService from './messages.service.js';
import { getIO } from '../../config/socket.js';

export const sendDirectMessageHandler = asyncHandler(async (req, res) => {
  const result = await messagesService.sendDirectMessage({
    senderId: req.user.id,
    ...req.body,
  });
  sendSuccess(res, {
    statusCode: 201,
    message: 'Message sent successfully.',
    data: result,
  });
});

export const editMessageHandler = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { body } = req.body;
  const result = await messagesService.editMessage(req.user.id, messageId, body);
  sendSuccess(res, {
    statusCode: 200,
    message: 'Message edited successfully.',
    data: result,
  });
});

export const deleteMessageHandler = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  await messagesService.deleteMessage(req.user.id, messageId);
  sendSuccess(res, {
    statusCode: 200,
    message: 'Message deleted successfully.',
  });
});

export const markAsReadHandler = asyncHandler(async (req, res) => {
  const { senderId } = req.params;
  const result = await messagesService.markAsRead(req.user.id, senderId);
  sendSuccess(res, {
    statusCode: 200,
    message: 'Messages marked as read.',
    data: result,
  });
});

export const forwardMessageHandler = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { receiverId } = req.body;
  
  const result = await messagesService.forwardMessage(req.user.id, messageId, receiverId);
  
  // Real-time broadcast via Socket.io
  try {
    const io = getIO();
    const sortedIds = [req.user.id, receiverId].sort();
    const roomId = `chat:${sortedIds.join('_')}`;
    io.to(roomId).emit('new_message', result);
  } catch (err) {
    console.error('Socket broadcast failed for forward:', err);
  }

  sendSuccess(res, {
    statusCode: 201,
    message: 'Message forwarded successfully.',
    data: result
  });
});

export const reactToMessageHandler = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const reactions = await messagesService.reactToMessage(req.user.id, messageId, emoji);
  
  // Real-time broadcast for reaction
  try {
    const io = getIO();
    // We don't have receiverId easily here, but we can emit to the room
    // For now, let's just broadcast to the specific chat room
    // We need to fetch the message to know the other participant
    const message = await messagesService.getMessageById(messageId);
    const receiverId = message.senderId === req.user.id ? message.receiverId : message.senderId;
    
    const sortedIds = [req.user.id, receiverId].sort();
    const roomId = `chat:${sortedIds.join('_')}`;
    io.to(roomId).emit('message_reaction', { messageId, reactions });
  } catch (err) {
    console.error('Socket broadcast failed for reaction:', err);
  }

  sendSuccess(res, {
    statusCode: 200,
    message: 'Reaction updated successfully.',
    data: reactions
  });
});

export const getMessageDownloadUrlHandler = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const message = await messagesService.getMessageById(messageId);

  if (!message || (message.senderId !== req.user.id && message.receiverId !== req.user.id)) {
    throw new AppError('Message not found or access denied.', 404);
  }

  if (!message.mediaUrl) {
    throw new AppError('This message does not contain media.', 400);
  }

  const { getSignedObjectUrl } = await import('../../utils/signedUrl.js');
  const downloadUrl = await getSignedObjectUrl(message.mediaUrl, { 
    download: true,
    expiresIn: 300 // 5 minutes
  });

  sendSuccess(res, {
    statusCode: 200,
    data: { downloadUrl }
  });
});

export default {
  sendDirectMessageHandler,
  editMessageHandler,
  deleteMessageHandler,
  markAsReadHandler,
  forwardMessageHandler,
  reactToMessageHandler,
  getMessageDownloadUrlHandler,
};
