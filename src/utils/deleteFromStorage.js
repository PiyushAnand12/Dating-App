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
 * Delete a file from a private Supabase Storage bucket.
 *
 * @param {string} storageKey
 * @returns {Promise<void>}
 */
export const deleteFromStorage = async (storageKey) => {
  if (typeof storageKey !== 'string' || storageKey.trim() === '') {
    throw new AppError(
      'deleteFromStorage: "storageKey" must be a non-empty string.',
      400,
      'INVALID_STORAGE_KEY',
    );
  }

  const supabase = getSupabaseAdmin();
  const bucket = process.env.SUPABASE_BUCKET_NAME || 'photos';

  console.log(`[Storage] Deleting file: ${storageKey} from bucket: ${bucket}`);

  const { error } = await supabase.storage
    .from(bucket)
    .remove([storageKey]);

  if (error) {
    console.warn(`[Storage] Deletion error (continuing anyway):`, error);
  } else {
    console.log(`[Storage] Deletion successful.`);
  }
};
