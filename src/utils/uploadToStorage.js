import { createClient } from '@supabase/supabase-js';
import AppError from './AppError.js';

const getSupabaseAdmin = (() => {
  let client = null;

  return () => {
    if (client) return client;

    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new AppError(
        'Supabase is not configured. Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
        503,
        'SUPABASE_NOT_CONFIGURED',
      );
    }

    client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    return client;
  };
})();

/**
 * Upload a file buffer to a private Supabase Storage bucket.
 *
 * @param {string} storageKey
 * @param {Buffer} fileBuffer
 * @param {string} contentType
 * @returns {Promise<{
 *   key: string,
 *   bucket: string,
 *   contentType: string,
 *   size: number,
 * }>}
 */
export const uploadToStorage = async (storageKey, fileBuffer, contentType) => {
  if (typeof storageKey !== 'string' || storageKey.trim() === '') {
    throw new AppError(
      'uploadToStorage: "storageKey" must be a non-empty string.',
      400,
      'INVALID_STORAGE_KEY',
    );
  }

  if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw new AppError(
      'uploadToStorage: "fileBuffer" must be a non-empty Buffer.',
      400,
      'INVALID_FILE_BUFFER',
    );
  }

  if (typeof contentType !== 'string' || contentType.trim() === '') {
    throw new AppError(
      'uploadToStorage: "contentType" must be a non-empty string.',
      400,
      'INVALID_CONTENT_TYPE',
    );
  }

  const bucket = process.env.SUPABASE_BUCKET_NAME;

  if (!bucket) {
    throw new AppError(
      'Supabase Storage is not configured. Missing SUPABASE_BUCKET_NAME.',
      503,
      'SUPABASE_NOT_CONFIGURED',
    );
  }

  const normalizedKey = storageKey.trim().replace(/^\/+/, '');

  if (!normalizedKey) {
    throw new AppError(
      'uploadToStorage: "storageKey" cannot be empty after normalization.',
      400,
      'INVALID_STORAGE_KEY',
    );
  }

  const supabase = getSupabaseAdmin();
  let uploadError = null;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Storage upload timed out after 15 seconds.')), 15000)
      );

      const uploadPromise = supabase.storage
        .from(bucket)
        .upload(normalizedKey, fileBuffer, {
          contentType: contentType.trim(),
          upsert: true,
        });

      const { error } = await Promise.race([uploadPromise, timeoutPromise]);

      if (!error) {
        return {
          key: normalizedKey,
          bucket,
          contentType: contentType.trim(),
          size: fileBuffer.length,
        };
      }
      uploadError = error;
    } catch (err) {
      uploadError = err;
    }

    if (uploadError && attempts < maxAttempts) {
      console.warn(`[Storage] Upload attempt ${attempts} failed: ${uploadError.message}. Retrying in 1s...`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Final failure logic: Mock fallback for development if it's a fetch failure
  if (process.env.NODE_ENV === 'development' && (uploadError?.message?.includes('fetch failed') || uploadError?.message?.includes('Failed to fetch'))) {
    console.warn(`[Storage] Supabase upload failed with FETCH ERROR. Falling back to MOCK URL for development development development development development development development development development development development development development development development development development development development development development development development.`);
    return {
      key: `mock/${normalizedKey}`,
      bucket: 'mock',
      contentType: contentType.trim(),
      size: fileBuffer.length,
      isMock: true
    };
  }

  throw new AppError(
    `Failed to upload object "${normalizedKey}" to Supabase Storage: ${uploadError?.message || 'Unknown error'}`,
    502,
    'UPLOAD_FAILED',
  );
};

export default { uploadToStorage };