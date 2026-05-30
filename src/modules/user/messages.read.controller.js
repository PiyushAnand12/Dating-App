import asyncHandler from '../../utils/asyncHandler.js';
import AppError from '../../utils/AppError.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { getConversationWithUser } from './messages.read.service.js';

export const getConversationWithUserHandler = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new AppError('Authentication required.', 401, 'ACCESS_DENIED');
  }

  const { otherUserId } = req.params;

  const result = await getConversationWithUser({
    currentUserId: req.user.id,
    otherUserId,
    page: req.query.page || 1,
    limit: req.query.limit || 10,
  });

  sendSuccess(res, {
    statusCode: 200,
    message: 'Conversation fetched successfully.',
    data: result.data,
    meta: result.meta,
  });
});

export default {
  getConversationWithUserHandler,
};