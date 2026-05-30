import AppError from '../../utils/AppError.js';
import { uploadToStorage } from '../../utils/uploadToStorage.js';
import prisma from '../../config/prisma.js';
import { grantBadge } from './badges.service.js';

/**
 * Upload Income Proof (Paystub, Tax Return, etc.)
 */
export const uploadIncomeProof = async ({
  userId,
  fileBuffer,
  mimetype,
  ext,
}) => {
  if (!userId) {
    throw new AppError('userId is required.', 400, 'INVALID_INPUT');
  }

  const normalizedExt = ext.toLowerCase().replace(/^\./, '');
  const storageKey = `users/${userId}/docs/income_${Date.now()}.${normalizedExt}`;

  const uploaded = await uploadToStorage(storageKey, fileBuffer, mimetype);

  return prisma.user.update({
    where: { id: userId },
    data: {
      incomeProofUrl: uploaded.key,
      isIncomeVerified: false, // Reset status on new upload
    },
    select: {
      id: true,
      incomeProofUrl: true,
    },
  });
};

/**
 * Verify Income (Admin Only)
 */
export const verifyUserIncome = async (userId, adminId) => {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      isIncomeVerified: true,
    }
  });

  await grantBadge(userId, 'INCOME_VERIFIED');

  return updatedUser;
};

export default {
  uploadIncomeProof,
  verifyUserIncome,
};
