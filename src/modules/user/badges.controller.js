import asyncHandler from '../../utils/asyncHandler.js';
import badgesService from './badges.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

/**
 * Get user badges
 */
export const getUserBadgesHandler = asyncHandler(async (req, res) => {
  // Audit for active dater badge automatically on view
  await badgesService.auditActiveDater(req.user.id);
  
  const badges = await badgesService.getUserBadges(req.user.id);
  
  sendSuccess(res, {
    message: 'User badges fetched.',
    data: badges,
  });
});

export default {
  getUserBadgesHandler,
};
