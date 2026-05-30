import prisma from '../../config/prisma.js';
import { verifyToken } from '../../config/authProviders.js';
import { generateTokenPair, verifyRefreshToken } from './auth.tokens.js';
import AppError from '../../utils/AppError.js';
import { grantBadge } from '../user/badges.service.js';

const findOrCreateUser = async ({ email, phone, firstName, firebaseUid }) => {
  if (!email && !phone) {
    throw new AppError(
      'Either email or phone is required to find or create a user.',
      400,
      'INVALID_INPUT',
    );
  }

  let user = null;

  if (email) {
    user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, firstName: true },
    });
  } else if (phone) {
    user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, role: true, firstName: true },
    });
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: email ?? null,
        phone: phone ?? null,
        firstName: firstName ?? null,
        firebaseUid: firebaseUid ?? null,
        isVerified: true,
        isActive: true,
        lastActiveAt: new Date(),
        lastLoginAt: new Date(),
      },
      select: {
        id: true,
        role: true,
        firstName: true,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(firstName && !user.firstName ? { firstName } : {}),
        ...(firebaseUid ? { firebaseUid } : {}),
        lastActiveAt: new Date(),
        lastLoginAt: new Date(),
      },
      select: {
        id: true,
        role: true,
        firstName: true,
      },
    });
  }

  // Grant Phone Verified badge if phone was used/verified
  if (phone) {
    await grantBadge(user.id, 'PHONE_VERIFIED');
  }

  return {
    id: user.id,
    role: user.role,
  };
};

export const loginWithGoogle = async ({ idToken }) => {
  if (!idToken || typeof idToken !== 'string') {
    throw new AppError('idToken is required.', 400, 'INVALID_INPUT');
  }

  const decoded = await verifyToken(idToken);

  const user = await findOrCreateUser({
    email: decoded.email ?? null,
    phone: null,
    firstName: decoded.name ?? null,
    firebaseUid: decoded.uid || decoded.sub || null,
  });

  return generateTokenPair(user);
};

export const loginWithPhone = async ({ phone, otp }) => {
  if (!phone || typeof phone !== 'string') {
    throw new AppError('phone is required.', 400, 'INVALID_INPUT');
  }

  if (!otp || typeof otp !== 'string') {
    throw new AppError('otp is required.', 400, 'INVALID_INPUT');
  }

  const decoded = await verifyToken(otp);

  const user = await findOrCreateUser({
    email: decoded.email ?? null,
    phone,
    firstName: decoded.name ?? null,
    firebaseUid: decoded.uid || decoded.sub || null,
  });

  return generateTokenPair(user);
};

export const refreshTokens = async ({ refreshToken }) => {
  if (!refreshToken || typeof refreshToken !== 'string') {
    throw new AppError('refreshToken is required.', 400, 'INVALID_INPUT');
  }

  const decoded = verifyRefreshToken(refreshToken);

  const user = {
    id: decoded.sub,
    role: 'USER',
  };

  return generateTokenPair(user);
};

export default {
  loginWithGoogle,
  loginWithPhone,
  refreshTokens,
};