import asyncHandler from '../../utils/asyncHandler.js';
import AppError from '../../utils/AppError.js';
import { getMyConversations } from './conversations.service.js';

export const getMyConversationsHandler = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new AppError('Authentication required.', 401, 'ACCESS_DENIED');
  }

  const result = await getMyConversations({
    userId: req.user.id,
    page: req.query.page || 1,
    limit: req.query.limit || 10,
  });

  res.status(200).json({
    status: 'success',
    message: 'Conversations fetched successfully.',
    data: result.data,
    meta: result.meta,
  });
});

export default {
  getMyConversationsHandler,
};