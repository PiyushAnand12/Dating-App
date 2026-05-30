import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { uploadProfilePhoto } from '../../middlewares/upload.middleware.js';
import { uploadPhoto, getMyPhotosHandler, getApprovedPublicPhotosHandler, moderatePhotoHandler, deletePhotoHandler, } from './photos.controller.js';

const router = Router();

/**
 * POST /api/v1/media/upload-photo
 *
 * Multipart/form-data:
 * - field "avatar"  -> image file
 * - field "position" -> integer 0 to 8
 */

/**
 * @swagger
 * /media/my-photos:
 *   get:
 *     summary: Get current user's uploaded photos
 *     tags:
 *       - Media
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Photos fetched successfully
 *       401:
 *         description: Authentication required
 */

router.get(
  '/my-photos',
  authenticate,
  getMyPhotosHandler,
);

/**
 * @swagger
 * /media/public/{userId}/photos:
 *   get:
 *     summary: Get approved public photos of a user
 *     tags:
 *       - Media
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           example: dev-user-2
 *         description: User ID
 *     responses:
 *       200:
 *         description: Public photos fetched successfully
 *       404:
 *         description: User not found
 */

router.get(
  '/public/:userId/photos',
  getApprovedPublicPhotosHandler,
);

/**
 * @swagger
 * /media/moderate-photo:
 *   patch:
 *     summary: Moderate a photo
 *     tags:
 *       - Media
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               photoId:
 *                 type: string
 *                 example: cmnvpo220000111isnfu631cx
 *               status:
 *                 type: string
 *                 example: APPROVED
 *               reviewReason:
 *                 type: string
 *                 example: Blurry image
 *             required:
 *               - photoId
 *               - status
 *     responses:
 *       200:
 *         description: Photo moderated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */

router.patch(
  '/moderate-photo',
  authenticate,
  authorize('ADMIN'),
  moderatePhotoHandler,
);

/**
 * @swagger
 * /media/upload-photo:
 *   post:
 *     summary: Upload profile photo
 *     tags:
 *       - Media
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *               position:
 *                 type: integer
 *                 example: 0
 *             required:
 *               - avatar
 *     responses:
 *       201:
 *         description: Photo uploaded successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Authentication required
 *       413:
 *         description: File too large
 *       415:
 *         description: Unsupported file type
 *       429:
 *         description: Too many upload requests
 */

router.post(
  '/upload-photo',
  authenticate,
  uploadProfilePhoto,
  uploadPhoto,
);

router.delete(
  '/:photoId',
  authenticate,
  deletePhotoHandler,
);

router.delete(
  '/:photoId',
  authenticate,
  deletePhotoHandler,
);


export default router;