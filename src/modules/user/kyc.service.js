import AppError from '../../utils/AppError.js';
import { userKycVideoPath } from '../../utils/storagePaths.js';
import { uploadToStorage } from '../../utils/uploadToStorage.js';
import { getSignedObjectUrl } from '../../utils/signedUrl.js';
import prisma from '../../config/prisma.js';

export const uploadKycVideo = async ({
  userId,
  username,
  fileBuffer,
  mimetype,
  ext,
}) => {
  if (!userId || typeof userId !== 'string') {
    throw new AppError('uploadKycVideo: "userId" is required.', 400, 'INVALID_INPUT');
  }

  if (!username || typeof username !== 'string') {
    throw new AppError('uploadKycVideo: "username" is required.', 400, 'INVALID_INPUT');
  }

  if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw new AppError(
      'uploadKycVideo: "fileBuffer" must be a non-empty Buffer.',
      400,
      'INVALID_INPUT',
    );
  }

  if (!mimetype || typeof mimetype !== 'string') {
    throw new AppError('uploadKycVideo: "mimetype" is required.', 400, 'INVALID_INPUT');
  }

  if (!ext || typeof ext !== 'string') {
    throw new AppError('uploadKycVideo: "ext" is required.', 400, 'INVALID_INPUT');
  }

  const normalizedExt = ext.toLowerCase().replace(/^\./, '');

  if (normalizedExt !== 'mp4') {
    throw new AppError(
      'KYC video must use mp4 format.',
      415,
      'UNSUPPORTED_FILE_TYPE',
    );
  }

  if (mimetype.trim().toLowerCase() !== 'video/mp4') {
    throw new AppError(
      'KYC video MIME type must be video/mp4.',
      415,
      'UNSUPPORTED_FILE_TYPE',
    );
  }

  const storageKey = userKycVideoPath(username, normalizedExt);

  const uploaded = await uploadToStorage(storageKey, fileBuffer, 'video/mp4');

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      kycVideoUrl: uploaded.key,
    },
    select: {
      id: true,
      kycVideoUrl: true,
    },
  });

  return {
    userId: updatedUser.id,
    storageKey: updatedUser.kycVideoUrl,
  };
};

export const getMyKycVideo = async ({ userId }) => {
  if (!userId || typeof userId !== 'string') {
    throw new AppError('getMyKycVideo: "userId" is required.', 400, 'INVALID_INPUT');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      kycVideoUrl: true,
    },
  });

  if (!user) {
    throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  }

  let videoUrl = null;

  if (user.kycVideoUrl) {
    videoUrl = await getSignedObjectUrl(user.kycVideoUrl);
  }

  return {
    userId: user.id,
    storageKey: user.kycVideoUrl,
    videoUrl,
    hasKycVideo: Boolean(user.kycVideoUrl),
  };
};

export default {
  uploadKycVideo,
  getMyKycVideo,
};