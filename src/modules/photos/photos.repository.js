/**
 * photos.repository.js
 *
 * Prisma repository for the Photo model.
 * All DB access for user photos lives here — nothing else imports Prisma directly.
 *
 * Schema reference (photos table):
 *   id           String      @id @default(cuid())
 *   userId       String
 *   url          String
 *   position     Int         @default(0)
 *   version      Int         @default(1)
 *   status       PhotoStatus @default(PENDING)   — PENDING | APPROVED | REJECTED
 *   reviewedById String?
 *   reviewedAt   DateTime?
 *   reviewReason String?
 *   createdAt    DateTime    @default(now())
 *   updatedAt    DateTime    @updatedAt
 *
 * Important:
 * - `url` should store the permanent R2 object key/path, not a signed URL.
 * - Signed URLs are temporary and should be generated at read time.
 */

import prisma from '../../config/prisma.js';

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Count photo rows belonging to a user.
 *
 * Warning:
 * This counts every stored version as a separate row.
 * Do NOT use this alone to enforce the "max 9 photos" product rule
 * when versioning is enabled.
 *
 * @param {string} userId
 * @param {object} [filters]
 * @param {import('@prisma/client').PhotoStatus} [filters.status]
 * @returns {Promise<number>}
 */
export const countUserPhotos = (userId, { status } = {}) =>
  prisma.photo.count({
    where: {
      userId,
      ...(status ? { status } : {}),
    },
  });

/**
 * Count distinct occupied photo slots for a user.
 *
 * This is the correct helper to use for enforcing the "max 9 photos" rule
 * because versioned replacements in the same slot should still count as one slot.
 *
 * Example:
 * - position 0 version 1
 * - position 0 version 2
 * - position 1 version 1
 *
 * Distinct slot count = 2, not 3.
 *
 * @param {string} userId
 * @param {object} [filters]
 * @param {import('@prisma/client').PhotoStatus} [filters.status]
 *   Optional status filter, e.g. 'APPROVED' or 'PENDING'.
 * @returns {Promise<number>}
 */
export const countUserPhotoSlots = async (userId, { status } = {}) => {
  const grouped = await prisma.photo.groupBy({
    by: ['position'],
    where: {
      userId,
      ...(status ? { status } : {}),
    },
  });

  return grouped.length;
};

/**
 * Return all photo rows for a user ordered newest-first.
 * Suitable for admin views, moderation history, and audit trails.
 *
 * @param {string} userId
 * @param {object} [filters]
 * @param {import('@prisma/client').PhotoStatus} [filters.status]
 * @returns {Promise<import('@prisma/client').Photo[]>}
 */
export const findUserPhotos = (userId, { status } = {}) =>
  prisma.photo.findMany({
    where: {
      userId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

/**
 * Return all photo rows for a user in stable slot/version order.
 * Primary sort: position ASC
 * Secondary sort: version DESC
 *
 * Useful for reviewing slot history.
 * Note: this returns all versions, not just the latest visible gallery photo.
 *
 * @param {string} userId
 * @param {object} [filters]
 * @param {import('@prisma/client').PhotoStatus} [filters.status]
 * @returns {Promise<import('@prisma/client').Photo[]>}
 */
export const findUserPhotosOrdered = (userId, { status } = {}) =>
  prisma.photo.findMany({
    where: {
      userId,
      ...(status ? { status } : {}),
    },
    orderBy: [
      { position: 'asc' },
      { version: 'desc' },
    ],
  });

/**
 * Return the photo with the highest version number for a given user + position slot.
 * Returns null when no record exists yet.
 *
 * Use this before creating a new photo to determine the next version:
 *   const latest = await getLatestPhotoVersion(userId, position);
 *   const version = latest ? latest.version + 1 : 1;
 *
 * @param {string} userId
 * @param {number} position
 * @returns {Promise<import('@prisma/client').Photo | null>}
 */
export const getLatestPhotoVersion = (userId, position) =>
  prisma.photo.findFirst({
    where: { userId, position },
    orderBy: { version: 'desc' },
  });

/**
 * Return only the latest APPROVED photo per occupied position for a user.
 *
 * This is closer to what a public profile gallery usually needs:
 * one visible photo per slot, latest approved version only.
 *
 * @param {string} userId
 * @returns {Promise<import('@prisma/client').Photo[]>}
 */
export const findLatestApprovedPhotosByPosition = async (userId) => {
  const photos = await prisma.photo.findMany({
    where: {
      userId,
      status: 'APPROVED',
    },
    orderBy: [
      { position: 'asc' },
      { version: 'desc' },
    ],
  });

  const latestByPosition = new Map();

  for (const photo of photos) {
    if (!latestByPosition.has(photo.position)) {
      latestByPosition.set(photo.position, photo);
    }
  }

  return [...latestByPosition.values()].sort((a, b) => a.position - b.position);
};

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Insert a new photo record after a successful R2 upload.
 *
 * Important:
 * `url` should be the stable R2 object key/path, not a temporary signed URL.
 *
 * @param {object} data
 * @param {string} data.userId
 * @param {string} data.url          - Permanent R2 object key/path.
 * @param {number} [data.position=0] - Gallery slot index.
 * @param {number} [data.version=1]  - Version number within the slot.
 * @returns {Promise<import('@prisma/client').Photo>}
 */
export const createPhoto = ({ userId, url, position = 0, version = 1, status = 'PENDING', moderationMetadata = null }) =>
  prisma.photo.create({
    data: {
      userId,
      url,
      position,
      version,
      status,
      moderationMetadata: moderationMetadata ? JSON.stringify(moderationMetadata) : null
    },
  });

/**
 * Update the moderation status of a photo.
 * Records who reviewed it, when, and the reason.
 *
 * Note:
 * If your business rule requires a reason for REJECTED, enforce that in the service layer.
 *
 * @param {string} photoId
 * @param {object} data
 * @param {import('@prisma/client').PhotoStatus} data.status
 * @param {string|null} [data.reviewedById]
 * @param {string|null} [data.reviewReason]
 * @returns {Promise<import('@prisma/client').Photo>}
 */
export const updatePhotoStatus = (
  photoId,
  { status, reviewedById = null, reviewReason = null },
) =>
  prisma.photo.update({
    where: { id: photoId },
    data: {
      status,
      reviewedById,
      reviewReason,
      reviewedAt: new Date(),
    },
  });

export default {
  countUserPhotos,
  countUserPhotoSlots,
  findUserPhotos,
  findUserPhotosOrdered,
  getLatestPhotoVersion,
  findLatestApprovedPhotosByPosition,
  createPhoto,
  updatePhotoStatus,
};
