import asyncHandler from '../../utils/asyncHandler.js';
import AppError from '../../utils/AppError.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { getMyMatches } from './matches.service.js';

export const getMyMatchesHandler = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new AppError('Authentication required.', 401, 'ACCESS_DENIED');
  }

  const result = await getMyMatches({
    userId: req.user.id,
    page: req.query.page || 1,
    limit: req.query.limit || 10,
  });

  sendSuccess(res, {
    statusCode: 200,
    message: 'Matches fetched successfully.',
    data: result.data,
    meta: result.meta,
  });
});

export default {
  getMyMatchesHandler,
};