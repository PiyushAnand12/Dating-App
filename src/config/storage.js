import { S3Client } from '@aws-sdk/client-s3';
import { config } from './env.js';
import { logger } from './logger.js';

let storageClient = null;

/**
 * Returns a singleton S3Client configured for Cloudflare R2.
 *
 * @returns {S3Client}
 */
export const getStorageClient = () => {
  if (storageClient) return storageClient;

  const {
    accountId,
    accessKeyId,
    secretAccessKey,
    region,
    endpoint,
    bucketName,
  } = config.r2;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Cloudflare R2 credentials are not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.'
    );
  }

  if (!bucketName) {
    throw new Error(
      'Cloudflare R2 bucket is not configured. Set R2_BUCKET_NAME.'
    );
  }

  const resolvedEndpoint =
    endpoint || `https://${accountId}.r2.cloudflarestorage.com`;

  storageClient = new S3Client({
    region: region || 'auto',
    endpoint: resolvedEndpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  logger.info(
    { endpoint: resolvedEndpoint, bucketName },
    'Cloudflare R2 storage client initialised'
  );

  return storageClient;
};

/**
 * Reset the storage client (useful for testing).
 */
export const resetStorageClient = () => {
  storageClient = null;
};

export default {
  getStorageClient,
  resetStorageClient,
};
