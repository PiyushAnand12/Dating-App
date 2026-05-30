import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import prisma from '../config/prisma.js';

// ─── Dev user profiles ──────────────────────────────────────────────────────
// Canonical definitions for every dev/test token.
// The middleware will auto-create these in the DB on first use,
// so login never fails regardless of seed state.

const DEV_USERS = {
  'test-token': {
    id: 'dev-user-1',
    email: 'testuser@example.com',
    firstName: 'Dev',
    gender: 'MAN',
    role: 'USER',
    city: 'Delhi',
    latitude: 28.6139,
    longitude: 77.2090,
    bio: 'Just a dev testing things.',
    dateOfBirth: new Date('1990-01-01'),
    photoUrl: 'https://i.pravatar.cc/600?u=dev1'
  },
  'test-token-2': {
    id: 'dev-user-samantha',
    email: 'samantha@example.com',
    firstName: 'Samantha',
    gender: 'WOMAN',
    role: 'USER',
    city: 'Mumbai',
    latitude: 19.0760,
    longitude: 72.8777,
    bio: 'Lover of life, travel, and deep conversations.',
    dateOfBirth: new Date('1997-06-20'),
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
  },
  'test-token-banned': {
    id: 'banned-user-1',
    email: 'banned@example.com',
    firstName: 'Banned',
    gender: 'MAN',
    role: 'USER',
    city: 'Delhi',
    latitude: 28.6139,
    longitude: 77.2090,
    bio: 'Banned user for testing.',
    dateOfBirth: new Date('1990-01-01'),
  },
  'admin-test-token': {
    id: 'dev-admin-1',
    email: 'admin@example.com',
    firstName: 'Admin',
    role: 'ADMIN',
    city: 'Delhi',
    latitude: 28.6139,
    longitude: 77.2090,
    bio: 'Admin user for moderation.',
    dateOfBirth: new Date('1988-01-01'),
  },
};

/**
 * Ensure a dev user exists in the database.
 * Auto-creates or updates the user + preferences + photo.
 * This is atomic and prevents P2002 unique constraint errors.
 */
const ensureDevUserExists = async (profile) => {
  try {
    // Use upsert to be thread-safe and atomic
    await prisma.user.upsert({
      where: { id: profile.id },
      update: {
        // Refresh these fields on login to ensure consistency
        firstName: profile.firstName,
        email: profile.email,
        role: profile.role || 'USER',
        profileStatus: 'APPROVED',
        isProfileComplete: true,
        discoverEnabled: true,
        isOnboarded: true,
        kycVideoUrl: 'https://example.com/dev-kyc.mp4',
      },
      create: {
        id: profile.id,
        email: profile.email,
        firstName: profile.firstName,
        gender: profile.gender || 'MAN',
        role: profile.role || 'USER',
        city: profile.city || 'Delhi',
        latitude: profile.latitude || 28.6139,
        longitude: profile.longitude || 77.2090,
        bio: profile.bio || 'Dev user',
        dateOfBirth: profile.dateOfBirth || new Date('1990-01-01'),
        profileStatus: 'APPROVED',
        isProfileComplete: true,
        discoverEnabled: true,
        isOnboarded: true,
        firebaseUid: `fb_${profile.id}`,
        kycVideoUrl: 'https://example.com/dev-kyc.mp4',
        preferences: {
          create: {
            showMe: 'EVERYONE',
            minAge: 18,
            maxAge: 99,
            maxDistanceKm: 100,
            distanceUnit: 'KM',
          },
        },
        photos: {
          create: [
            {
              id: `photo-${profile.id}`,
              url: profile.photoUrl || `https://i.pravatar.cc/600?u=${profile.id}`,
              position: 0,
              status: 'APPROVED',
            }
          ],
        },
      },
    });
  } catch (err) {
    console.error(`[Auth] Failed to ensure dev user ${profile.id}:`, err.message);
    // Don't re-throw, let the authenticate middleware proceed to see if user exists anyway
  }
};

/**
 * Stub token verifier.
 * Until real JWT / Firebase / Auth0 verification is added,
 * any non-dev test token should be treated as unauthorized.
 */
const verifyToken = async (_token) => {
  throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED');
};

/**
 * Protect routes — verifies the token and attaches req.user.
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Missing or malformed authorization header', 401, 'UNAUTHORIZED');
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    throw new AppError('Missing bearer token', 401, 'UNAUTHORIZED');
  }

    // ─── Dev token bypass ────────────────────────────────
    const devProfile = DEV_USERS[token];
    if (devProfile) {
      // Ensure the dev user exists in the database for every request.
      // We removed the hardcoded JSON bypass to ensure we always test against the real DB.
      try {
        await ensureDevUserExists(devProfile);
      } catch (err) {
        console.error(`[Auth] CRITICAL: Dev user DB sync failed: ${err.message}`);
        throw new AppError('Database synchronization failed for dev user.', 500, 'DATABASE_ERROR');
      }

      req.user = {
        id: devProfile.id,
        username: devProfile.firstName.toLowerCase(),
        email: devProfile.email,
        role: devProfile.role,
      };
      return next();
    }

  // ─── Real token verification ─────────────────────────
  const decoded = await verifyToken(token);

  if (!decoded || !decoded.id) {
    throw new AppError('Invalid token payload', 401, 'UNAUTHORIZED');
  }

  req.user = {
    id: decoded.id,
    username: decoded.username || decoded.preferred_username || null,
    email: decoded.email || null,
    role: decoded.role || 'user',
  };

  next();
});

/**
 * Restrict access to specific roles.
 */
export const authorize = (...roles) =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user) {
      throw new AppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }

    next();
  });

/**
 * Specifically requires ADMIN role
 */
export const requireAdmin = authorize('ADMIN');

export default {
  authenticate,
  authorize,
  requireAdmin,
};