import asyncHandler from '../../utils/asyncHandler.js';
import AppError from '../../utils/AppError.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { uploadUserPhoto, getMyPhotos, getApprovedPublicPhotos, moderatePhoto, deleteUserPhoto } from './photos.service.js';
import { evaluateProfileCompleteness } from '../user/user.service.js';
import notificationsService from '../user/notifications.service.js';
import prisma from '../../config/prisma.js';

/**
 * POST /api/v1/media/upload-photo
 */
export const uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new AppError('Authentication required.', 401, 'ACCESS_DENIED');
  }

  if (!req.file) {
    throw new AppError('Photo file is required.', 400, 'FILE_REQUIRED');
  }

  const { id: userId } = req.user;

  const rawPosition = req.body?.position;
  const position = Number(rawPosition);

  if (!Number.isInteger(position) || position < 0 || position > 8) {
    throw new AppError(
      'Position must be an integer between 0 and 8.',
      400,
      'INVALID_INPUT',
    );
  }

  console.log(`[GodMode] Incoming Body:`, req.body);
  console.log(`[GodMode] Incoming File:`, {
    fieldname: req.file.fieldname,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  });

  console.log(`[PhotoUpload] Starting upload for user: ${userId}, position: ${position}`);

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

  const result = await uploadUserPhoto({
    userId,
    position,
    fileBuffer: req.file.buffer,
    mimetype: req.file.mimetype,
    ext,
  });

  // CRITICAL VERIFICATION: Does it actually exist in the refreshed profile?
  const { getMe } = await import('../user/user.service.js');
  const freshUser = await getMe(userId);
  const found = freshUser.photos.find(p => p.position === position);

  if (!found) {
    console.error(`[CRITICAL] Photo created successfully but NOT FOUND in fresh profile! Position: ${position}`);
    console.log(`[GodMode] Refresh Success. Full Fresh Photos:`, freshUser.photos);
  } else {
    console.log(`[GodMode] Verification Successful. Photo found in Slot ${position} with ID: ${found.id}`);
  }

  await evaluateProfileCompleteness(userId);

  // ── Notify Followers (Favorites) ──────────────────
  (async () => {
    try {
      const followers = await prisma.favorite.findMany({
        where: { targetId: userId },
        select: { actorId: true },
      });

      if (followers.length > 0) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true }
        });
        const message = `${user?.firstName || 'A user you favorited'} just uploaded a new photo!`;
        
        for (const follower of followers) {
          if (follower.actorId !== userId) {
            await notificationsService.sendNotificationToUser(
              follower.actorId, 
              userId, 
              { title: 'New Photo Alert! 📸', body: message }, 
              'FAVORITE_PHOTO_UPLOAD', 
              { userId }
            );
          }
        }
      }
    } catch (err) {
      console.error('Failed to notify followers about photo upload:', err);
    }
  })();

  sendSuccess(res, {
    statusCode: 201,
    message: 'Photo uploaded successfully and submitted for review.',
    data: result,
  });
});

/**
 * GET /api/v1/media/my-photos
 */
export const getMyPhotosHandler = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new AppError('Authentication required.', 401, 'ACCESS_DENIED');
  }

  const photos = await getMyPhotos({
    userId: req.user.id,
  });

  sendSuccess(res, {
    statusCode: 200,
    message: 'Photos fetched successfully.',
    data: photos,
  });
});

export const getApprovedPublicPhotosHandler = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId || typeof userId !== 'string') {
    throw new AppError('Target userId is required.', 400, 'INVALID_INPUT');
  }

  const photos = await getApprovedPublicPhotos({ userId });

  sendSuccess(res, {
    statusCode: 200,
    message: 'Approved public photos fetched successfully.',
    data: photos,
  });
});

export const moderatePhotoHandler = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new AppError('Authentication required.', 401, 'ACCESS_DENIED');
  }

  const { photoId, status, reviewReason } = req.body ?? {};

  const result = await moderatePhoto({
    photoId,
    status,
    reviewReason,
    reviewedById: req.user.id,
  });

  sendSuccess(res, {
    statusCode: 200,
    message: 'Photo moderated successfully.',
    data: result,
  });
});

export const deletePhotoHandler = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new AppError('Authentication required.', 401, 'ACCESS_DENIED');
  }

  const { photoId } = req.params;

  await deleteUserPhoto({
    photoId,
    userId: req.user.id,
  });

  sendSuccess(res, {
    statusCode: 200,
    message: 'Photo deleted successfully.',
  });
});

export default {
  uploadPhoto,
  getMyPhotosHandler,
  getApprovedPublicPhotosHandler,
  moderatePhotoHandler,
  deletePhotoHandler,
};