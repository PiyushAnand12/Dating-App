/**
 * photos.service.js
 *
 * Business logic for user photo uploads.
 * Orchestrates quota enforcement, versioning, R2 upload, and DB record creation.
 *
 * Depends on:
 *   - photos.repository.js      (DB operations)
 *   - storagePaths.js           (R2 key construction)
 *   - uploadToStorage.js        (R2 upload)
 *   - AppError.js               (shared structured error class)
 */

import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

import { getSignedObjectUrl } from '../../utils/signedUrl.js';
import notificationsService from '../user/notifications.service.js';
import prisma from '../../config/prisma.js';

import {
  countUserPhotoSlots,
  getLatestPhotoVersion,
  createPhoto,
  findUserPhotosOrdered,
  updatePhotoStatus,
  findLatestApprovedPhotosByPosition,
} from './photos.repository.js';
import { deleteFromStorage } from '../../utils/deleteFromStorage.js';

import { userPhotoCardPath } from '../../utils/storagePaths.js';
import { uploadToStorage } from '../../utils/uploadToStorage.js';
import AppError from '../../utils/AppError.js';
import { optimizeImage } from '../../utils/imageProcessor.js';
import { detectNSFW } from '../moderation/aiModeration.service.js';

const MAX_PHOTO_SLOTS = 9;

const EXT_TO_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const getCleanupClient = (() => {
  let client = null;

  return () => {
    if (client) return client;

    const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      return null;
    }

    client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    return client;
  };
})();

/**
 * Best-effort cleanup if DB write fails after a successful R2 upload.
 * Never throws; never masks the original DB error.
 *
 * @param {string} key
 * @param {string} bucket
 * @returns {Promise<void>}
 */
const tryRollbackR2Object = async (key, bucket) => {
  try {
    const client = getCleanupClient();

    if (!client) {
      console.error(
        `[photos.service] R2 rollback skipped — cleanup client unavailable. Orphaned object: ${bucket}/${key}`,
      );
      return;
    }

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    console.info(
      `[photos.service] R2 rollback succeeded — deleted orphaned object: ${bucket}/${key}`,
    );
  } catch (deleteErr) {
    console.error(
      `[photos.service] R2 rollback failed — object may be orphaned: ${bucket}/${key}`,
      deleteErr,
    );
  }
};

/**
 * Upload a photo for a user.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.username
 * @param {number} params.position
 * @param {Buffer} params.fileBuffer
 * @param {string} params.mimetype
 * @param {string} params.ext
 * @returns {Promise<{
 *   photoId: string,
 *   userId: string,
 *   storageKey: string,
 *   position: number,
 *   version: number,
 *   mimetype: string,
 *   size: number,
 *   status: string,
 * }>}
 */
export const uploadUserPhoto = async ({
  userId,
  position,
  fileBuffer,
  mimetype,
  ext,
}) => {
  if (!userId || typeof userId !== 'string') {
    throw new AppError('uploadUserPhoto: "userId" is required.', 400, 'INVALID_INPUT');
  }

  if (!Number.isInteger(position) || position < 0 || position > 8) {
    throw new AppError(
      'uploadUserPhoto: "position" must be an integer between 0 and 8.',
      400,
      'INVALID_INPUT',
    );
  }

  if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw new AppError(
      'uploadUserPhoto: "fileBuffer" must be a non-empty Buffer.',
      400,
      'INVALID_INPUT',
    );
  }

  if (!mimetype || typeof mimetype !== 'string') {
    throw new AppError('uploadUserPhoto: "mimetype" is required.', 400, 'INVALID_INPUT');
  }

  if (!ext || typeof ext !== 'string') {
    throw new AppError('uploadUserPhoto: "ext" is required.', 400, 'INVALID_INPUT');
  }

  const normalizedExt = ext.toLowerCase().replace(/^\./, '');
  const expectedMime = EXT_TO_MIME[normalizedExt];

  if (!expectedMime) {
    throw new AppError(
      `Unsupported file extension ".${normalizedExt}". Allowed: ${Object.keys(EXT_TO_MIME).join(', ')}.`,
      415,
      'UNSUPPORTED_FILE_TYPE',
    );
  }

  const normalizedMime = mimetype.trim().toLowerCase().replace('image/jpg', 'image/jpeg');

  if (normalizedMime !== expectedMime) {
    throw new AppError(
      `File extension ".${normalizedExt}" does not match MIME type "${mimetype}". Expected MIME type for this extension: "${expectedMime}".`,
      422,
      'MIMETYPE_EXTENSION_MISMATCH',
    );
  }

  const latest = await getLatestPhotoVersion(userId, position);
  const isNewSlot = latest === null;

  if (isNewSlot) {
    const occupiedSlots = await countUserPhotoSlots(userId);

    if (occupiedSlots >= MAX_PHOTO_SLOTS) {
      throw new AppError(
        `Photo limit reached. A maximum of ${MAX_PHOTO_SLOTS} photo slots are allowed.`,
        422,
        'PHOTO_SLOT_LIMIT_REACHED',
      );
    }
  }

  const nextVersion = isNewSlot ? 1 : latest.version + 1;
  const card = `p${position}`;

  console.log(`[PhotoService] Starting AI Moderation for ${userId}...`);
  const moderation = await detectNSFW(fileBuffer);
  console.log(`[PhotoService] AI Moderation finished. Status: ${moderation.status}`);

  console.log(`[PhotoService] BYPASSING Image Optimization (Sharp) for diagnostic test...`);
  // const optimization = await optimizeImage(fileBuffer);
  // console.log(`[PhotoService] Image Optimization finished.`);
  const optimizedBuffer = fileBuffer; // Use raw buffer
  
  const optimizedMime = mimetype; // Use original mime since we didn't convert to webp
  const storageKey = userPhotoCardPath(userId, card, nextVersion, ext); // Use original ext

  console.log(`[PhotoService] Starting Upload to Supabase Storage: ${storageKey}`);
  const uploaded = await uploadToStorage(storageKey, optimizedBuffer, optimizedMime);
  console.log(`[PhotoService] Upload to Storage finished successfully.`);

  let photo;

    try {
      photo = await createPhoto({
        userId,
        url: uploaded.key,
        position,
        version: nextVersion,
        status: moderation.status,
        moderationMetadata: moderation.metadata,
      });

      // ── Notify Followers & Matches ──────────────────
      (async () => {
        try {
          const { notifyUserMatches } = await import('../user/user.service.js');
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { firstName: true }
          });
          
          // Notify matches
          await notifyUserMatches(userId, 'PHOTOS_UPDATED', '{name} added new photos! Check them out.');

          // Notify followers (if any)
          const followers = await prisma.favorite.findMany({
            where: { targetId: userId },
            select: { actorId: true },
          });

          for (const follower of followers) {
             await notificationsService.sendNotificationToUser(follower.actorId, userId, {
               title: 'New Photo!',
               body: `${user?.firstName || 'A user you favorited'} just uploaded a new photo!`,
             }, 'PHOTOS_UPDATED');
          }
        } catch (notifyErr) {
          console.error('Failed to send photo notifications', notifyErr);
        }
      })();
  } catch (dbErr) {
    await tryRollbackR2Object(uploaded.key, uploaded.bucket);
    throw dbErr;
  }

  return {
    id: photo.id,
    userId: photo.userId,
    storageKey: photo.url,
    position: photo.position,
    version: photo.version,
    mimetype: uploaded.contentType,
    size: uploaded.size,
    status: photo.status,
  };
};

export const getMyPhotos = async ({ userId }) => {
  if (!userId || typeof userId !== 'string') {
    throw new AppError('getMyPhotos: "userId" is required.', 400, 'INVALID_INPUT');
  }

  const photos = await findUserPhotosOrdered(userId);

  const photosWithUrls = await Promise.all(
    photos.map(async (photo) => {
      const signedUrl = await getSignedObjectUrl(photo.url);

      return {
        id: photo.id,
        storageKey: photo.url,
        imageUrl: signedUrl,
        position: photo.position,
        version: photo.version,
        status: photo.status,
        createdAt: photo.createdAt,
      };
    }),
  );

  return photosWithUrls;
};

export const getApprovedPublicPhotos = async ({ userId }) => {
  if (!userId || typeof userId !== 'string') {
    throw new AppError(
      'getApprovedPublicPhotos: "userId" is required.',
      400,
      'INVALID_INPUT',
    );
  }

  const photos = await findLatestApprovedPhotosByPosition(userId);

  const photosWithUrls = await Promise.all(
    photos.map(async (photo) => {
      const signedUrl = await getSignedObjectUrl(photo.url);

      return {
        id: photo.id,
        imageUrl: signedUrl,
        position: photo.position,
        version: photo.version,
      };
    }),
  );

  return photosWithUrls;
};

export const moderatePhoto = async ({
  photoId,
  status,
  reviewedById,
  reviewReason = null,
}) => {
  if (!photoId || typeof photoId !== 'string') {
    throw new AppError('moderatePhoto: "photoId" is required.', 400, 'INVALID_INPUT');
  }

  if (!reviewedById || typeof reviewedById !== 'string') {
    throw new AppError('moderatePhoto: "reviewedById" is required.', 400, 'INVALID_INPUT');
  }

  if (!status || typeof status !== 'string') {
    throw new AppError('moderatePhoto: "status" is required.', 400, 'INVALID_INPUT');
  }

  const normalizedStatus = status.trim().toUpperCase();

  if (!['APPROVED', 'REJECTED'].includes(normalizedStatus)) {
    throw new AppError(
      'moderatePhoto: status must be either APPROVED or REJECTED.',
      400,
      'INVALID_INPUT',
    );
  }

  if (normalizedStatus === 'REJECTED') {
    if (!reviewReason || typeof reviewReason !== 'string' || !reviewReason.trim()) {
      throw new AppError(
        'moderatePhoto: reviewReason is required when rejecting a photo.',
        400,
        'INVALID_INPUT',
      );
    }
  }

  const updatedPhoto = await updatePhotoStatus(photoId, {
    status: normalizedStatus,
    reviewedById,
    reviewReason:
      normalizedStatus === 'REJECTED' ? reviewReason.trim() : null,
  });

  return {
    id: updatedPhoto.id,
    status: updatedPhoto.status,
    reviewedById: updatedPhoto.reviewedById,
    reviewReason: updatedPhoto.reviewReason,
    reviewedAt: updatedPhoto.reviewedAt,
  };
};

export const deleteUserPhoto = async ({ photoId, userId }) => {
  if (!photoId) throw new AppError('Photo ID is required.', 400, 'INVALID_INPUT');
  
  const photo = await prisma.photo.findUnique({
    where: { id: photoId }
  });

  if (!photo || photo.userId !== userId) {
    throw new AppError('Photo not found or access denied.', 404, 'NOT_FOUND');
  }

  // 1. Attempt to delete from Cloud Storage (with timeout)
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Storage removal timed out after 10s')), 10000)
    );
    const removePromise = deleteFromStorage(photo.url);
    
    console.log(`[PhotoService] Attempting to remove from storage: ${photo.url}`);
    await Promise.race([removePromise, timeoutPromise]);
    console.log(`[PhotoService] Storage removal process finished.`);
  } catch (err) {
    console.warn(`[PhotoService] Storage removal failed or timed out (continuing to DB deletion): ${err.message}`);
  }

  // 2. Always delete from DB regardless of storage success
  console.log(`[PhotoService] Deleting record from DB: ${photoId}`);
  await prisma.photo.delete({
    where: { id: photoId },
  });
  console.log(`[PhotoService] DB deletion successful.`);

  return { success: true };
};

export default {
  uploadUserPhoto,
  getMyPhotos,
  getApprovedPublicPhotos,
  moderatePhoto,
  deleteUserPhoto,
};