import sharp from 'sharp';
import { logger } from '../config/logger.js';
import AppError from './AppError.js';

/**
 * Image Processor Utility
 * 
 * Handles bandwidth optimization by converting all uploads to WebP
 * and enforcing resolution limits for consistent mobile performance.
 */

// Max dimensions for dating app photos to balance quality and bandwidth
const MAX_DIMENSION = 1200; 
const DEFAULT_QUALITY = 80;

/**
 * Optimizes an image buffer for production.
 * 
 * @param {Buffer} buffer - Raw image content
 * @returns {Promise<{buffer: Buffer, info: object}>}
 */
export const optimizeImage = async (buffer) => {
  try {
    const pipeline = sharp(buffer)
      // Resize if larger than 1200px (either dimension)
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true
      })
      // Convert to WebP with metadata stripping (privacy)
      .webp({ quality: DEFAULT_QUALITY })
      .toBuffer({ resolveWithObject: true });

    return await pipeline;
  } catch (err) {
    logger.error({ err, nativeError: err.message }, 'Image optimization failed');
    throw new AppError('Failed to process image. Please ensure it is a valid format.', 400);
  }
};

export default {
  optimizeImage
};
