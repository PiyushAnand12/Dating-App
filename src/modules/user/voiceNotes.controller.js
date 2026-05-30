import asyncHandler from '../../utils/asyncHandler.js';
import voiceNotesService from './voiceNotes.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import AppError from '../../utils/AppError.js';

/**
 * Handle voice note upload
 * POST /api/v1/users/messages/voice
 */
export const uploadVoiceNoteHandler = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No voice note file uploaded', 400);
  }

  const { receiverId, tempId } = req.body;
  if (!receiverId) {
    throw new AppError('receiverId is required', 400);
  }

  const message = await voiceNotesService.sendVoiceNote({
    senderId: req.user.id,
    receiverId,
    fileBuffer: req.file.buffer,
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
    tempId,
  });

  sendSuccess(res, { 
    message: 'Voice note sent successfully',
    data: message 
  });
});

export default {
  uploadVoiceNoteHandler,
};
