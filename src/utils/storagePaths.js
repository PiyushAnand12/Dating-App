/**
 * storagePaths.js
 *
 * Pure helper functions that build storage keys / paths for uploaded files.
 * Nothing here reads, writes, or uploads — it only constructs strings.
 *
 * Path spec:
 *   Profile photo  →  users/{username}/profile/
 *   Versioned card →  users/{username}/photos/{card}/v{version}.{ext}
 *   KYC video      →  users/{username}/kyc/video.{ext}
 *   Chat image     →  chat/{chatId}/images/{filename}
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strip leading/trailing whitespace and collapse any character that is not
 * alphanumeric, a hyphen, or an underscore so that user-supplied values
 * cannot inject path separators or unexpected segments.
 *
 * @param {string} value
 * @param {string} label  - Name of the field, used in the error message.
 * @returns {string}
 */
const sanitizeSegment = (value, label) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`storagePaths: "${label}" must be a non-empty string.`);
  }
  const sanitized = value.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  if (sanitized === '') {
    throw new Error(`storagePaths: "${label}" became empty after sanitization.`);
  }
  return sanitized;
};

/**
 * Normalise a file extension: strip a leading dot if present and lowercase.
 * e.g. ".JPG" → "jpg",  "mp4" → "mp4"
 *
 * @param {string} ext
 * @returns {string}
 */
const normalizeExt = (ext) => {
  if (typeof ext !== 'string' || ext.trim() === '') {
    throw new Error('storagePaths: "ext" must be a non-empty string.');
  }
  return ext.trim().replace(/^\./, '').toLowerCase();
};

// ─── Path builders ────────────────────────────────────────────────────────────

/**
 * Base directory for a user's profile photo slot.
 * Use this as the storage prefix when the filename is determined later
 * (e.g. after the upload completes and you know the final key).
 *
 * Pattern: users/{username}/profile/
 *
 * @param {string} username
 * Pattern: users/{userId}/profile/
 *
 * @param {string} userId
 * @returns {string}
 *
 * @example
 * userProfileDir('alice')
 * // → 'users/alice/profile/'
 */
export const userProfileDir = (userId) => {
  const u = sanitizeSegment(userId, 'userId');
  return `users/${u}/profile/`;
};

/**
 * Full path for a versioned photo card belonging to a user.
 *
 * Pattern: users/{userId}/photos/{card}/v{version}.{ext}
 *
 * @param {string} userId
 * @param {string} card     - Card identifier (e.g. "front", "back", "card-01")
 * @param {number} version  - Integer version number (e.g. 1, 2, 3)
 * @param {string} ext      - File extension without dot (e.g. "jpg", "webp")
 * @returns {string}
 *
 * @example
 * userPhotoCardPath('alice', 'front', 2, 'webp')
 * // → 'users/alice/photos/front/v2.webp'
 */
export const userPhotoCardPath = (userId, card, version, ext) => {
  const u = sanitizeSegment(userId, 'userId');
  const c = sanitizeSegment(card,     'card');
  const numericVersion = Number(version);
  const e = normalizeExt(ext);

  if (!Number.isInteger(numericVersion) || numericVersion < 1) {
    throw new Error('storagePaths: "version" must be a positive integer.');
  }

  const v = numericVersion;

  return `users/${u}/photos/${c}/v${v}.${e}`;
};

/**
 * Full path for a user's KYC video.
 *
 * Pattern: users/{userId}/kyc/video.{ext}
 *
 * @param {string} userId
 * @param {string} ext      - File extension without dot (e.g. "mp4")
 * @returns {string}
 *
 * @example
 * userKycVideoPath('alice', 'mp4')
 * // → 'users/alice/kyc/video.mp4'
 */
export const userKycVideoPath = (userId, ext) => {
  const u = sanitizeSegment(userId, 'userId');
  const e = normalizeExt(ext);
  return `users/${u}/kyc/video.${e}`;
};

/**
 * Full path for an image inside a chat thread.
 *
 * Pattern: chat/{chatId}/images/{filename}
 *
 * The filename is sanitized but retains its dot so that extensions like
 * "abc123.png" survive intact.
 *
 * @param {string} chatId
 * @param {string} filename  - e.g. "abc123.png"
 * @returns {string}
 *
 * @example
 * chatImagePath('room-42', 'abc123.png')
 * // → 'chat/room-42/images/abc123.png'
 */
export const chatImagePath = (chatId, filename) => {
  const id = sanitizeSegment(chatId, 'chatId');

  if (typeof filename !== 'string' || filename.trim() === '') {
    throw new Error('storagePaths: "filename" must be a non-empty string.');
  }
  // Allow dots in filenames; sanitize everything else
  const safeFilename = filename.trim().replace(/[^a-zA-Z0-9_.-]/g, '_');

  return `chat/${id}/images/${safeFilename}`;
};

/**
 * Full path for a voice note inside a chat thread.
 */
export const chatVoicePath = (chatId, filename) => {
  const id = sanitizeSegment(chatId, 'chatId');
  if (typeof filename !== 'string' || filename.trim() === '') {
    throw new Error('storagePaths: "filename" must be a non-empty string.');
  }
  const safeFilename = filename.trim().replace(/[^a-zA-Z0-9_.-]/g, '_');
  return `chat/${id}/voice/${safeFilename}`;
};

/**
 * Full path for a user story.
 * Pattern: users/{userId}/stories/{timestamp}.{ext}
 */
export const userStoryPath = (userId, timestamp, ext) => {
  const u = sanitizeSegment(userId, 'userId');
  const e = normalizeExt(ext);
  return `users/${u}/stories/${timestamp}.${e}`;
};

export default {
  userProfileDir,
  userPhotoCardPath,
  userKycVideoPath,
  chatImagePath,
  userStoryPath,
  chatVoicePath,
};
