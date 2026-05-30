import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js';
import validate from '../../middlewares/validate.middleware.js';
import { uploadKycVideo, uploadStoryMedia, uploadVoiceNote, uploadReportEvidence } from '../../middlewares/upload.middleware.js';
import { uploadKycVideoHandler, getMyKycVideoHandler, } from './kyc.controller.js';
import { getPublicProfileHandler } from './publicProfile.controller.js';
import {
  updateProfileSchema,
  updateLocationSchema,
  updatePreferencesSchema,
  discoverToggleSchema,
  registerTokenSchema,
  unregisterTokenSchema,
} from './user.validation.js';
import {
  getMeHandler,
  updateProfileHandler,
  updateLocationHandler,
  updatePreferencesHandler,
  setDiscoverEnabledHandler,
  activateBoostHandler,
  getTopPicksHandler,
} from './user.controller.js';
import {
  registerDeviceTokenHandler,
  unregisterDeviceTokenHandler,
} from './notifications.controller.js';

import { getDiscoveryProfilesHandler } from './discovery.controller.js';
import { createSwipeHandler, backtrackSwipeHandler } from './swipe.controller.js';
import { getMyMatchesHandler } from './matches.controller.js';
import { 
  blockUserHandler, 
  unblockUserHandler, 
  getBlockedUsersHandler 
} from './block.controller.js';
import { 
  submitAppealHandler, 
  getMyAppealsHandler, 
  getAdminAppealsHandler, 
  reviewAppealHandler 
} from './appeal.controller.js';

import {
  sendDirectMessageHandler,
  editMessageHandler,
  deleteMessageHandler,
  markAsReadHandler,
  forwardMessageHandler,
  reactToMessageHandler,
  getMessageDownloadUrlHandler,
} from './messages.controller.js';

import { getConversationWithUserHandler } from './messages.read.controller.js';

import { getMyConversationsHandler } from './conversations.controller.js';

import {
  addFavoriteHandler,
  getMyFavoritesHandler,
  removeFavoriteHandler,
  bulkRemoveFavoritesHandler,
} from './favorites.controller.js';
import {
  createWishlistHandler,
  addToWishlistHandler,
  getMyWishlistsHandler,
  getWishlistDetailsHandler,
  getSharedWishlistHandler,
  updateWishlistSettingsHandler,
  deleteWishlistHandler,
} from './wishlist.controller.js';
import { createReportHandler } from './reports.controller.js';
import {
  getEmergencyContactsHandler,
  addEmergencyContactHandler,
  deleteEmergencyContactHandler,
  triggerPanicHandler,
  resolveAlertHandler,
} from './safety.controller.js';
import { getUserBadgesHandler } from './badges.controller.js';
import {
  uploadStoryHandler,
  getMyStoriesHandler,
  getFeedStoriesHandler,
  viewStoryHandler,
  reactToStoryHandler,
  deleteStoryHandler,
  getStoryViewersHandler,
} from './stories.controller.js';
import { 
  getActivityHistoryHandler,
  markActivityReadHandler,
} from './activity.controller.js';
import {
  upsertPromptHandler,
  getMyPromptsHandler,
  deletePromptHandler,
} from './prompts.controller.js';
import { getMyCallHistoryHandler } from './videoCall.controller.js';
import { uploadVoiceNoteHandler } from './voiceNotes.controller.js';

const router = Router();

/**
 * @swagger
 * /users/public/{userId}:
 *   get:
 *     summary: Get public profile of a user
 *     tags:
 *       - Users
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
 *         description: Public profile fetched successfully
 *       404:
 *         description: User not found
 */

router.get(
  '/public/:userId',
  getPublicProfileHandler,
);

// All user routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current logged-in user profile
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user fetched successfully
 *       401:
 *         description: Authentication required
 */

// GET  /api/v1/users/me
router.get('/me', getMeHandler);

/**
 * @swagger
 * /users/me/boost:
 *   post:
 *     summary: Activate a profile boost
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               durationHours:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Boost activated
 */
router.post('/me/boost', activateBoostHandler);

/**
 * @swagger
 * /users/top-picks:
 *   get:
 *     summary: Get top 10 AI-curated recommendations
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 */
router.get('/top-picks', getTopPicksHandler);

/**
 * @swagger
 * /users/me:
 *   put:
 *     summary: Update current user profile
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Riya
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: 2000-01-01
 *               gender:
 *                 type: string
 *                 example: WOMAN
 *               bio:
 *                 type: string
 *                 example: Love music and travel
 *               height:
 *                 type: integer
 *                 example: 165
 *               jobTitle:
 *                 type: string
 *                 example: Designer
 *               company:
 *                 type: string
 *                 example: ABC Studio
 *               livingIn:
 *                 type: string
 *                 example: Kolkata
 *               relationshipGoal:
 *                 type: string
 *                 example: LONG_TERM_PARTNER
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Authentication required
 */

// PUT  /api/v1/users/me
router.put('/me', validate(updateProfileSchema), updateProfileHandler);

/**
 * @swagger
 * /users/location:
 *   post:
 *     summary: Update user location
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               latitude:
 *                 type: number
 *                 example: 22.5726
 *               longitude:
 *                 type: number
 *                 example: 88.3639
 *               city:
 *                 type: string
 *                 example: Kolkata
 *             required:
 *               - latitude
 *               - longitude
 *     responses:
 *       200:
 *         description: Location updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Authentication required
 */

// POST /api/v1/users/location
router.post('/location', validate(updateLocationSchema), updateLocationHandler);

/**
 * @swagger
 * /users/preferences:
 *   post:
 *     summary: Update user preferences
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               showMe:
 *                 type: string
 *                 example: WOMEN
 *               minAge:
 *                 type: integer
 *                 example: 21
 *               maxAge:
 *                 type: integer
 *                 example: 30
 *               maxDistanceKm:
 *                 type: integer
 *                 example: 50
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Authentication required
 */

// POST /api/v1/users/preferences
router.post('/preferences', validate(updatePreferencesSchema), updatePreferencesHandler);

/**
 * @swagger
 * /users/discover-toggle:
 *   post:
 *     summary: Enable or disable discovery
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               discoverEnabled:
 *                 type: boolean
 *                 example: true
 *             required:
 *               - discoverEnabled
 *     responses:
 *       200:
 *         description: Discovery setting updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Authentication required
 */

// POST /api/v1/users/discover-toggle
router.post('/discover-toggle', validate(discoverToggleSchema), setDiscoverEnabledHandler);

/**
 * @swagger
 * /users/kyc:
 *   get:
 *     summary: Get current user's KYC video info
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC video fetched successfully
 *       401:
 *         description: Authentication required
 */

router.get(
  '/kyc',
  authenticate,
  getMyKycVideoHandler,
);

/**
 * @swagger
 * /users/kyc/upload-video:
 *   post:
 *     summary: Upload KYC video
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               kycVideo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: KYC video uploaded successfully
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
  '/kyc/upload-video',
  authenticate,
  uploadKycVideo,
  uploadKycVideoHandler,
);

/**
 * @swagger
 * /users/discovery:
 *   get:
 *     summary: Get discovery profiles
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         required: false
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         required: false
 *         description: Number of profiles per page
 *     responses:
 *       200:
 *         description: Discovery profiles fetched successfully
 *       400:
 *         description: Invalid pagination input
 *       401:
 *         description: Authentication required
 */

router.get(
  '/discovery',
  authenticate,
  getDiscoveryProfilesHandler,
);

/**
 * @swagger
 * /users/swipes:
 *   post:
 *     summary: Swipe on a user
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetUserId:
 *                 type: string
 *                 example: dev-user-2
 *               direction:
 *                 type: string
 *                 example: LIKE
 *             required:
 *               - targetUserId
 *               - direction
 *     responses:
 *       201:
 *         description: Swipe saved successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Authentication required
 *       409:
 *         description: Duplicate swipe
 *       429:
 *         description: Too many swipe requests
 */

router.post(
  '/swipes',
  authenticate,
  createSwipeHandler,
);

/**
 * @swagger
 * /users/swipes/backtrack:
 *   post:
 *     summary: Backtrack (undo) the last swipe
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backtrack successful
 *       403:
 *         description: Upgrade required (Premium feature)
 *       404:
 *         description: No swipes found
 */
router.post(
  '/swipes/backtrack',
  authenticate,
  backtrackSwipeHandler,
);

/**
 * @swagger
 * /users/matches:
 *   get:
 *     summary: Get matched users
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Number of matches per page
 *     responses:
 *       200:
 *         description: Matches fetched successfully
 *       400:
 *         description: Invalid pagination input
 *       401:
 *         description: Authentication required
 */

router.get(
  '/matches',
  authenticate,
  getMyMatchesHandler,
);

/**
 * @swagger
 * /users/blocks:
 *   get:
 *     summary: Get list of blocked users
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 */
router.get('/blocks', authenticate, getBlockedUsersHandler);

/**
 * @swagger
 * /users/block:
 *   post:
 *     summary: Block a user
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetUserId:
 *                 type: string
 *                 example: dev-user-2
 *               reason:
 *                 type: string
 *                 example: Harassment
 *     responses:
 *       201:
 *         description: User blocked
 */
router.post('/block', authenticate, blockUserHandler);

/**
 * @swagger
 * /users/block/{targetUserId}:
 *   delete:
 *     summary: Unblock a user
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 */
router.delete('/block/:targetUserId', authenticate, unblockUserHandler);

/**
 * @swagger
 * /users/appeals:
 *   post:
 *     summary: Submit an appeal (for banned/rejected users)
 *     tags:
 *       - Appeals
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: I believe my profile was wrongly rejected.
 *     responses:
 *       201:
 *         description: Appeal submitted
 *   get:
 *     summary: Get my appeal history
 *     tags:
 *       - Appeals
 *     security:
 *       - bearerAuth: []
 */
router.post('/appeals', authenticate, submitAppealHandler);
router.get('/appeals', authenticate, getMyAppealsHandler);

/**
 * @swagger
 * /users/admin/appeals:
 *   get:
 *     summary: Get all appeals (Admin only)
 *     tags:
 *       - Appeals
 *     security:
 *       - bearerAuth: []
 */
router.get('/admin/appeals', authenticate, requireAdmin, getAdminAppealsHandler);

/**
 * @swagger
 * /users/admin/appeals/{appealId}/review:
 *   patch:
 *     summary: Review an appeal (Admin only)
 *     tags:
 *       - Appeals
 *     security:
 *       - bearerAuth: []
 */
router.patch('/admin/appeals/:appealId/review', authenticate, requireAdmin, reviewAppealHandler);

/**
 * @swagger
 * /users/messages:
 *   post:
 *     summary: Send a message to a matched user
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               receiverId:
 *                 type: string
 *                 example: dev-user-2
 *               type:
 *                 type: string
 *                 example: TEXT
 *               body:
 *                 type: string
 *                 example: Hello
 *             required:
 *               - receiverId
 *               - type
 *               - body
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Match required
 *       429:
 *         description: Too many message requests
 */

router.post(
  '/messages',
  authenticate,
  sendDirectMessageHandler,
);

/**
 * @swagger
 * /users/messages/{messageId}:
 *   patch:
 *     summary: Edit a message (within 5 minutes)
 *     tags:
 *       - Users
 *   delete:
 *     summary: Delete a message for everyone (within 5 minutes)
 *     tags:
 *       - Users
 */
router.patch('/messages/:messageId', authenticate, editMessageHandler);
router.delete('/messages/:messageId', authenticate, deleteMessageHandler);

/**
 * @swagger
 * /users/messages/{messageId}/forward:
 *   post:
 *     summary: Forward a message to another user
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 */
router.post('/messages/:messageId/forward', authenticate, forwardMessageHandler);
router.post('/messages/:messageId/react', authenticate, reactToMessageHandler);

/**
 * @swagger
 * /users/messages/read/{senderId}:
 *   patch:
 *     summary: Mark messages from a user as read
 *     tags:
 *       - Users
 */
router.patch('/messages/read/:senderId', authenticate, markAsReadHandler);

/**
 * @swagger
 * /users/messages/{otherUserId}:
 *   get:
 *     summary: Get conversation with a matched user
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: otherUserId
 *         required: true
 *         schema:
 *           type: string
 *           example: dev-user-2
 *         description: ID of the other user in the conversation
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Number of messages per page
 *     responses:
 *       200:
 *         description: Conversation fetched successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Match required
 */

router.get(
  '/messages/:otherUserId',
  authenticate,
  getConversationWithUserHandler,
);

/**
 * @swagger
 * /users/conversations:
 *   get:
 *     summary: Get all conversations for the logged-in user
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Number of conversations per page
 *     responses:
 *       200:
 *         description: Conversations fetched successfully
 *       400:
 *         description: Invalid pagination input
 *       401:
 *         description: Authentication required
 */

router.get(
  '/conversations',
  authenticate,
  getMyConversationsHandler,
);

/**
 * @swagger
 * /users/favorites:
 *   post:
 *     summary: Add a user to favorites
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetUserId:
 *                 type: string
 *                 example: dev-user-2
 *             required:
 *               - targetUserId
 *     responses:
 *       201:
 *         description: Favorite added successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Authentication required
 */

router.post(
  '/favorites',
  authenticate,
  addFavoriteHandler,
);

/**
 * @swagger
 * /users/favorites:
 *   get:
 *     summary: Get favorite users
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Number of favorites per page
 *     responses:
 *       200:
 *         description: Favorites fetched successfully
 *       400:
 *         description: Invalid pagination input
 *       401:
 *         description: Authentication required
 */

router.get(
  '/favorites',
  authenticate,
  getMyFavoritesHandler,
);

/**
 * @swagger
 * /users/favorites/bulk-remove:
 *   delete:
 *     summary: Remove multiple users from favorites concurrently
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Users removed
 */
router.delete(
  '/favorites/bulk-remove',
  authenticate,
  bulkRemoveFavoritesHandler,
);

/**
 * @swagger
 * /users/favorites/{targetUserId}:
 *   delete:
 *     summary: Remove a user from favorites
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: targetUserId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User removed from favorites
 */
router.delete(
  '/favorites/:targetUserId',
  authenticate,
  removeFavoriteHandler,
);

/**
 * @swagger
 * /users/wishlists:
 *   get:
 *     summary: Get all wishlists
 *     tags:
 *       - Users
 *   post:
 *     summary: Create a new wishlist
 *     tags:
 *       - Users
 */
router.get('/wishlists', authenticate, getMyWishlistsHandler);
router.post('/wishlists', authenticate, createWishlistHandler);

/**
 * @swagger
 * /users/wishlists/items:
 *   post:
 *     summary: Add a user to a wishlist
 *     tags:
 *       - Users
 */
router.post('/wishlists/items', authenticate, addToWishlistHandler);

/**
 * @swagger
 * /users/wishlists/{wishlistId}:
 *   get:
 *     summary: Get items in a specific wishlist
 *     tags:
 *       - Users
 *   delete:
 *     summary: Delete a wishlist
 *     tags:
 *       - Users
 */
router.get('/wishlists/:wishlistId', authenticate, getWishlistDetailsHandler);

/**
 * @swagger
 * /users/wishlists/shared/{wishlistId}:
 *   get:
 *     summary: Get shared wishlist (Public)
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: wishlistId
 *         required: true
 */
router.get('/wishlists/shared/:wishlistId', getSharedWishlistHandler);

/**
 * @swagger
 * /users/wishlists/{wishlistId}/settings:
 *   patch:
 *     summary: Update wishlist visibility
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isPublic:
 *                 type: boolean
 */
router.patch('/wishlists/:wishlistId/settings', authenticate, updateWishlistSettingsHandler);
router.delete('/wishlists/:wishlistId', authenticate, deleteWishlistHandler);


/**
 * @swagger
 * /users/reports:
 *   post:
 *     summary: Report a user for inappropriate behavior
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetId:
 *                 type: string
 *               reason:
 *                 type: string
 *                 enum: [SPAM, FAKE_PROFILE, HARASSMENT, INAPPROPRIATE_CONTENT, UNDERAGE, OTHER]
 *               details:
 *                 type: string
 *             required:
 *               - targetId
 *               - reason
 *     responses:
 *       201:
 *         description: Report submitted successfully
 */
router.post(
  '/reports',
  authenticate,
  uploadReportEvidence,
  createReportHandler,
);


/**
 * @swagger
 * /users/notifications/token:
 *   post:
 *     summary: Register a device token for push notifications
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [FCM, APNS]
 *             required:
 *               - token
 *               - platform
 *     responses:
 *       200:
 *         description: Token registered successfully
 */
router.post(
  '/notifications/token',
  validate(registerTokenSchema),
  registerDeviceTokenHandler,
);

/**
 * @swagger
 * /users/notifications/token/unregister:
 *   post:
 *     summary: Unregister a device token
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *             required:
 *               - token
 *     responses:
 *       200:
 *         description: Token unregistered successfully
 */
router.post(
  '/notifications/token/unregister',
  validate(unregisterTokenSchema),
  unregisterDeviceTokenHandler,
);

// ─── Stories ───────────────────────────────────────────
/**
 * @swagger
 * /users/stories:
 *   post:
 *     summary: Upload a new story (Photo or Video)
 *     tags:
 *       - Stories
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               story:
 *                 type: string
 *                 format: binary
 *                 description: Photo or Video file (max 20MB)
 */
router.post('/stories', authenticate, uploadStoryMedia, uploadStoryHandler);

/**
 * @swagger
 * /users/stories/me:
 *   get:
 *     summary: Get my active stories
 *     tags:
 *       - Stories
 */
router.get('/stories/me', authenticate, getMyStoriesHandler);

/**
 * @swagger
 * /users/stories/feed:
 *   get:
 *     summary: Get story feed from matches/favorites
 *     tags:
 *       - Stories
 */
router.get('/stories/feed', authenticate, getFeedStoriesHandler);

/**
 * @swagger
 * /users/stories/{storyId}/view:
 *   post:
 *     summary: Mark a story as viewed
 *     tags:
 *       - Stories
 */
router.post('/stories/:storyId/view', authenticate, viewStoryHandler);


// ─── Profile Prompts ────────────────────────────────────
/**
 * @swagger
 * /users/prompts:
 *   post:
 *     summary: Add or update a profile prompt
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *                 example: "The way to my heart is..."
 *               answer:
 *                 type: string
 *                 example: "Through a lot of pizza."
 *             required:
 *               - question
 *               - answer
 *   get:
 *     summary: Get my profile prompts
 *     tags:
 *       - Profile
 */
router.post('/prompts', authenticate, upsertPromptHandler);
router.get('/prompts', authenticate, getMyPromptsHandler);

/**
 * @swagger
 * /users/prompts/{promptId}:
 *   delete:
 *     summary: Remove a prompt from profile
 *     tags:
 *       - Profile
 */
router.delete('/prompts/:promptId', authenticate, deletePromptHandler);

/**
 * @swagger
 * /users/calls/history:
 *   get:
 *     summary: Get my video call history
 *     tags:
 *       - Profile
 */
router.get('/calls/history', authenticate, getMyCallHistoryHandler);

/**
 * @swagger
 * /users/messages/voice:
 *   post:
 *     summary: Send a voice note in a chat
 *     tags:
 *       - Messaging
 */
router.post('/messages/voice', authenticate, uploadVoiceNote, uploadVoiceNoteHandler);

/**
 * @swagger
 * /users/activity:
 *   get:
 *     summary: Get my activity feed history
 *     tags:
 *       - Activity
 */
router.get('/activity', authenticate, getActivityHistoryHandler);

/**
 * @swagger
 * /users/activity/read:
 *   patch:
 *     summary: Mark activities as read
 *     tags:
 *       - Activity
 */
router.patch('/activity/read', authenticate, markActivityReadHandler);

/**
 * @swagger
 * /users/stories/{id}/react:
 *   post:
 *     summary: React to a story
 *     tags:
 *       - Stories
 */
router.post('/stories/:storyId/react', authenticate, reactToStoryHandler);

// ─── Safety & Emergency ──────────────────────────────
router.get('/safety/contacts', authenticate, getEmergencyContactsHandler);
router.post('/safety/contacts', authenticate, addEmergencyContactHandler);
router.delete('/safety/contacts/:contactId', authenticate, deleteEmergencyContactHandler);
router.post('/safety/panic', authenticate, triggerPanicHandler);
router.patch('/safety/alert/:alertId/resolve', authenticate, resolveAlertHandler);

router.delete('/stories/:storyId', authenticate, deleteStoryHandler);

/**
 * @swagger
 * /users/stories/{storyId}/viewers:
 *   get:
 *     summary: Get viewers of your story
 *     tags:
 *       - Stories
 *     security:
 *       - bearerAuth: []
 */
router.get('/stories/:storyId/viewers', authenticate, getStoryViewersHandler);

// ─── Voice Notes ────────────────────────────────────
router.post(
  '/messages/voice-note',
  authenticate,
  uploadVoiceNote,
  uploadVoiceNoteHandler
);

router.get(
  '/messages/:messageId/download',
  authenticate,
  getMessageDownloadUrlHandler
);

export default router;
