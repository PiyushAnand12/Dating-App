import asyncHandler from '../../utils/asyncHandler.js';
import AppError from '../../utils/AppError.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { uploadKycVideo, getMyKycVideo } from './kyc.service.js';

export const uploadKycVideoHandler = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new AppError('Authentication required.', 401, 'ACCESS_DENIED');
  }

  if (!req.file) {
    throw new AppError('KYC video file is required.', 400, 'FILE_REQUIRED');
  }

  const { id: userId, username } = req.user;

  if (!username || typeof username !== 'string') {
    throw new AppError(
      'Authenticated user is missing a valid username required for storage path generation.',
      400,
      'INVALID_USER_CONTEXT',
    );
  }

  const originalName = req.file.originalname || '';
  const ext =
    originalName.includes('.')
      ? originalName.split('.').pop().toLowerCase()
      : '';

  if (!ext) {
    throw new AppError(
      'Could not determine file extension from uploaded file name.',
      400,
      'INVALID_FILE_EXTENSION',
    );
  }

  const result = await uploadKycVideo({
    userId,
    username,
    fileBuffer: req.file.buffer,
    mimetype: req.file.mimetype,
    ext,
  });

  sendSuccess(res, {
    statusCode: 201,
    message: 'KYC video uploaded successfully.',
    data: result,
  });
});

export const getMyKycVideoHandler = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new AppError('Authentication required.', 401, 'ACCESS_DENIED');
  }

  const result = await getMyKycVideo({
    userId: req.user.id,
  });

  sendSuccess(res, {
    statusCode: 200,
    message: 'KYC video fetched successfully.',
    data: result,
  });
});

export default {
  uploadKycVideoHandler,
  getMyKycVideoHandler,
};