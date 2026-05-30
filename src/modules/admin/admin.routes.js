import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import requireAdmin from '../../middlewares/admin.middleware.js';
import {
  getPendingUsersHandler,
  getUserDetailsHandler,
  approveUserHandler,
  rejectUserHandler,
} from './admin.controller.js';
import { getAdminAnalyticsHandler } from './analytics.controller.js';

const router = Router();

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get admin review list of users
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           example: UNDER_REVIEW
 *         description: Filter users by status
 *     responses:
 *       200:
 *         description: Users fetched successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */

router.get('/users', authenticate, requireAdmin, getPendingUsersHandler);

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: Get full details of one user for admin review
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: dev-user-2
 *         description: User ID
 *     responses:
 *       200:
 *         description: User fetched successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 */

router.get('/users/:id', authenticate, requireAdmin, getUserDetailsHandler);

/**
 * @swagger
 * /admin/users/{id}/approve:
 *   post:
 *     summary: Approve a user profile
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: dev-user-2
 *         description: User ID
 *     responses:
 *       200:
 *         description: User approved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */

router.post('/users/:id/approve', authenticate, requireAdmin, approveUserHandler);

/**
 * @swagger
 * /admin/users/{id}/reject:
 *   post:
 *     summary: Reject a user profile
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: dev-user-2
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Incomplete profile
 *             required:
 *               - reason
 *     responses:
 *       200:
 *         description: User rejected successfully
 *       400:
 *         description: Rejection reason is required
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */

router.post('/users/:id/reject', authenticate, requireAdmin, rejectUserHandler);

/**
 * @swagger
 * /admin/analytics/revenue:
 *   get:
 *     summary: Get platform revenue KPIs and growth trends
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 */
router.get('/analytics/revenue', authenticate, requireAdmin, getAdminAnalyticsHandler);

export default router;

