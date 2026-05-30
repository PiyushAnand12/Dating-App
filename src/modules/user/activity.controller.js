import asyncHandler from '../../utils/asyncHandler.js';
import activityService from './activity.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

/**
 * Get activity feed history
 * GET /api/v1/users/activity
 */
export const getActivityHistoryHandler = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const feed = await activityService.getActivityFeed(req.user.id, {
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20
  });

  sendSuccess(res, feed);
});

/**
 * Mark activities as read
 * PATCH /api/v1/users/activity/read
 */
export const markActivityReadHandler = asyncHandler(async (req, res) => {
  const { activityIds } = req.body; // Optional array
  await activityService.markActivitiesRead(req.user.id, activityIds || []);
  
  sendSuccess(res, { message: 'Activities marked as read' });
});

export default {
  getActivityHistoryHandler,
  markActivityReadHandler
};
