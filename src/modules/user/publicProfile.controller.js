import asyncHandler from '../../utils/asyncHandler.js';
import AppError from '../../utils/AppError.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { getPublicProfile } from './publicProfile.service.js';

export const getPublicProfileHandler = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId || typeof userId !== 'string') {
    throw new AppError('Target userId is required.', 400, 'INVALID_INPUT');
  }

  const profile = await getPublicProfile({ userId });

  sendSuccess(res, {
    statusCode: 200,
    message: 'Public profile fetched successfully.',
    data: profile,
  });
});

export default {
  getPublicProfileHandler,
};