import prisma from '../../config/prisma.js';

// ─── Safe select — fields returned to the API consumer ──────────────────────
const userSelect = {
  id: true,
  email: true,
  phone: true,
  role: true,
  firstName: true,
  dateOfBirth: true,
  gender: true,
  bio: true,
  city: true,
  latitude: true,
  longitude: true,
  height: true,
  jobTitle: true,
  company: true,
  livingIn: true,
  relationshipGoal: true,
  avatarUrl: true,
  discoverEnabled: true,
  profileStatus: true,
  isVerified: true,
  isOnboarded: true,
  isProfileComplete: true,
  lastActiveAt: true,
  lastLoginAt: true,
  firebaseUid: true,
  createdAt: true,
  updatedAt: true,
  interests: {
    include: { interest: true }
  },
  photos: {
    orderBy: { position: 'asc' }
  },
};

/**
 * Find a user by their id.
 *
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export const findUserById = (id) =>
  prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });

/**
 * Update core profile fields for a user.
 *
 * @param {string} id
 * @param {object} data
 * @returns {Promise<object>}
 */
export const updateUser = (id, data) =>
  prisma.user.update({
    where: { id },
    data,
    select: userSelect,
  });

/**
 * Update latitude, longitude, and optionally city.
 *
 * @param {string} id
 * @param {{ latitude: number, longitude: number, city?: string }} data
 * @returns {Promise<object>}
 */
export const updateUserLocation = (id, data) =>
  prisma.user.update({
    where: { id },
    data: {
      latitude: data.latitude,
      longitude: data.longitude,
      ...(data.city !== undefined ? { city: data.city } : {}),
    },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      city: true,
      updatedAt: true,
    },
  });

/**
 * Toggle discoverEnabled for a user.
 *
 * @param {string} id
 * @param {boolean} discoverEnabled
 * @returns {Promise<object>}
 */
export const updateDiscoverEnabled = (id, discoverEnabled) =>
  prisma.user.update({
    where: { id },
    data: { discoverEnabled },
    select: {
      id: true,
      discoverEnabled: true,
      updatedAt: true,
    },
  });

/**
 * Upsert discovery / notification preferences for a user.
 *
 * @param {string} userId
 * @param {object} data
 * @returns {Promise<object>}
 */
export const upsertUserPreferences = async (userId, data) => {
  const relGoals = JSON.stringify(data.relationshipGoals || []);
  const intIds = JSON.stringify(data.interestIds || []);
  const now = new Date().toISOString();

  // Using a simpler approach that works on SQLite
  const existing = await prisma.userPreferences.findUnique({
    where: { userId }
  });

  if (existing) {
    return prisma.userPreferences.update({
      where: { userId },
      data: {
        showMe: data.showMe || 'EVERYONE',
        minAge: data.minAge || 18,
        maxAge: data.maxAge || 99,
        maxDistanceKm: data.maxDistanceKm || 50,
        minHeight: data.minHeight || null,
        maxHeight: data.maxHeight || null,
        relationshipGoals: relGoals,
        interestIds: intIds,
        activeWithinHours: data.activeWithinHours || null,
        sortBy: data.sortBy || 'RECENTLY_ACTIVE',
        distanceUnit: data.distanceUnit || 'KM',
        hideDistance: data.hideDistance || false,
        incognitoEnabled: data.incognitoEnabled || false
      }
    });
  } else {
    return prisma.userPreferences.create({
      data: {
        userId,
        showMe: data.showMe || 'EVERYONE',
        minAge: data.minAge || 18,
        maxAge: data.maxAge || 99,
        maxDistanceKm: data.maxDistanceKm || 50,
        minHeight: data.minHeight || null,
        maxHeight: data.maxHeight || null,
        relationshipGoals: relGoals,
        interestIds: intIds,
        activeWithinHours: data.activeWithinHours || null,
        sortBy: data.sortBy || 'RECENTLY_ACTIVE',
        distanceUnit: data.distanceUnit || 'KM',
        hideDistance: data.hideDistance || false,
        incognitoEnabled: data.incognitoEnabled || false
      }
    });
  }
};
