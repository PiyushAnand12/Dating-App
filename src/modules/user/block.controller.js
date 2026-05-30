import asyncHandler from '../../utils/asyncHandler.js';
import blockService from './block.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { getIO } from '../../config/socket.js';

/**
 * POST /users/block
 */
export const blockUserHandler = asyncHandler(async (req, res) => {
  const { targetUserId, reason } = req.body;
  const actorId = req.user.id;

  const block = await blockService.blockUser(actorId, targetUserId, reason);

  // REAL-TIME: Notify both users to disconnect immediately
  const io = getIO();
  io.to(`user:${actorId}`).emit('user_blocked', { targetUserId });
  io.to(`user:${targetUserId}`).emit('blocked_by_user', { actorId });

  sendSuccess(res, {
    statusCode: 201,
    message: 'User blocked successfully.',
    data: block,
  });
});

/**
 * DELETE /users/block/:targetUserId
 */
export const unblockUserHandler = asyncHandler(async (req, res) => {
  const { targetUserId } = req.params;
  const actorId = req.user.id;

  await blockService.unblockUser(actorId, targetUserId);

  // REAL-TIME: Notify the actor
  const io = getIO();
  io.to(`user:${actorId}`).emit('user_unblocked', { targetUserId });

  sendSuccess(res, {
    message: 'User unblocked successfully.',
  });
});

/**
 * GET /users/blocks
 */
export const getBlockedUsersHandler = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit } = req.query;
  const result = await blockService.getBlockedUsers(userId, { page, limit });

  sendSuccess(res, {
    message: 'Blocked users fetched successfully.',
    data: result,
  });
});

export default {
  blockUserHandler,
  unblockUserHandler,
  getBlockedUsersHandler,
};
