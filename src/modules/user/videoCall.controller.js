import asyncHandler from '../../utils/asyncHandler.js';
import videoCallService from './videoCall.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

/**
 * GET /api/v1/users/calls/history
 */
export const getMyCallHistoryHandler = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const history = await videoCallService.getCallHistory(req.user.id, {
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20
  });
  sendSuccess(res, history);
});

export default {
  getMyCallHistoryHandler
};
