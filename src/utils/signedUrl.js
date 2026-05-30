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

const DEFAULT_EXPIRY_SECONDS = 60 * 15; // 15 min

export const getSignedObjectUrl = async (
  storageKey,
  options = {},
) => {
  const { expiresIn = DEFAULT_EXPIRY_SECONDS } = options;
  if (typeof storageKey !== 'string' || storageKey.trim() === '') {
    throw new AppError(
      'getSignedObjectUrl: "storageKey" must be a non-empty string.',
      400,
      'INVALID_STORAGE_KEY',
    );
  }

  // If it's already a full URL, return it as is
  if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
    return storageKey;
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

  // Handle Mock Fallback for Development
  if (normalizedKey.startsWith('mock/')) {
    console.log(`[Storage] Resolving MOCK URL for: ${normalizedKey}`);
    // Return a beautiful high-quality placeholder image for stories
    return `https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&q=80&w=800`;
  }

  const supabase = getSupabaseAdmin();

  // Primary: Try to get a signed URL
  const { data: signedData, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(normalizedKey, expiresIn, options);

  if (!signedError && signedData?.signedUrl) {
    return signedData.signedUrl;
  }

  // Fallback: Try to get a public URL if signing fails
  const { data: publicData } = supabase.storage
    .from(bucket)
    .getPublicUrl(normalizedKey);

  if (publicData?.publicUrl) {
    return publicData.publicUrl;
  }

  // Ultimate Fallback: Return a placeholder if everything fails
  return `https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&q=80&w=800`;
};

export default {
  getSignedObjectUrl,
};