import prisma from '../../config/prisma.js';
import { getSignedObjectUrl } from '../../utils/signedUrl.js';
import AppError from '../../utils/AppError.js';
import {
  findUserById,
  updateUser,
  updateUserLocation,
  updateDiscoverEnabled,
  upsertUserPreferences,
} from './user.repository.js';

const ensureUserExists = async (userId) => {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  return user;
};

/**
 * Evaluate if profile is completed and update DB if changed.
 */
export const evaluateProfileCompleteness = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      dateOfBirth: true,
      isProfileComplete: true,
      _count: {
        select: {
          photos: true,
          interests: true,
        },
      },
    },
  });

  if (!user) return;

  const isComplete = Boolean(
    user.firstName &&
    user.dateOfBirth &&
    user._count.photos > 0 &&
    user._count.interests > 0
  );

  if (user.isProfileComplete !== isComplete) {
    await prisma.user.update({
      where: { id: userId },
      data: { isProfileComplete: isComplete },
    });
  }
};

/**
 * Get the authenticated user's profile.
 *
 * @param {string} userId
 * @returns {Promise<object>}
 */
export const getMe = async (userId) => {
  const user = await ensureUserExists(userId);

  // Sign photo URLs if they exist
  if (user.photos && Array.isArray(user.photos)) {
    user.photos = await Promise.all(
      user.photos.map(async (photo) => ({
        ...photo,
        id: photo.id, // Force explicit ID mapping
        imageUrl: await getSignedObjectUrl(photo.url),
      }))
    );
  }

  return user;
};

/**
 * Helper to notify all matches about a profile update
 */
const notifyMatchesOfUpdate = async (userId, type, message) => {
  try {
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }]
      }
    });

    if (matches.length === 0) return;

    const { sendNotificationToUser } = await import('./notifications.service.js');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true }
    });

    for (const match of matches) {
      const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
      await sendNotificationToUser(
        otherUserId,
        userId,
        { title: 'Match Update ✨', body: message.replace('{name}', user?.firstName || 'Your match') },
        type
      );
    }
  } catch (err) {
    console.error('Failed to notify matches of update', err);
  }
};

/**
 * Update the authenticated user's core profile fields.
 *
 * @param {string} userId
 * @param {object} data
 * @returns {Promise<object>}
 */
export const updateProfile = async (userId, data) => {
  await ensureUserExists(userId);
  const updated = await updateUser(userId, data);
  
  // Notify matches about profile change
  notifyMatchesOfUpdate(userId, 'PROFILE_UPDATED', '{name} updated their profile info!');
  
  return updated;
};

/**
 * External helper for photos/other services to trigger notifications
 */
export const notifyUserMatches = notifyMatchesOfUpdate;

/**
 * Update the authenticated user's location.
 *
 * @param {string} userId
 * @param {{ latitude: number, longitude: number, city?: string }} data
 * @returns {Promise<object>}
 */
export const updateLocation = async (userId, data) => {
  await ensureUserExists(userId);
  return updateUserLocation(userId, data);
};

/**
 * Upsert the authenticated user's discovery preferences.
 *
 * @param {string} userId
 * @param {object} data
 * @returns {Promise<object>}
 */
export const updatePreferences = async (userId, data) => {
  await ensureUserExists(userId);
  return upsertUserPreferences(userId, data);
};

/**
 * Set discoverEnabled for the authenticated user.
 *
 * @param {string} userId
 * @param {boolean} discoverEnabled
 * @returns {Promise<object>}
 */
export const setDiscoverEnabled = async (userId, discoverEnabled) => {
  await ensureUserExists(userId);
  return updateDiscoverEnabled(userId, discoverEnabled);
};
