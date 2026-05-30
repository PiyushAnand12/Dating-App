import AppError from '../../utils/AppError.js';
import { uploadToStorage } from '../../utils/uploadToStorage.js';
import prisma from '../../config/prisma.js';

/**
 * Upload Government ID
 */
export const uploadGovernmentId = async ({
  userId,
  fileBuffer,
  mimetype,
  ext,
}) => {
  if (!userId) {
    throw new AppError('userId is required.', 400, 'INVALID_INPUT');
  }

  if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw new AppError('Valid file buffer is required.', 400, 'INVALID_INPUT');
  }

  const normalizedExt = ext.toLowerCase().replace(/^\./, '');
  const storageKey = `users/${userId}/docs/id_${Date.now()}.${normalizedExt}`;

  const uploaded = await uploadToStorage(storageKey, fileBuffer, mimetype);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      governmentIdUrl: uploaded.key,
    },
    select: {
      id: true,
      governmentIdUrl: true,
    },
  });

  return {
    userId: updatedUser.id,
    storageKey: updatedUser.governmentIdUrl,
  };
};

export default {
  uploadGovernmentId,
};
