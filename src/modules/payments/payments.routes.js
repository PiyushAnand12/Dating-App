import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  createCheckoutSessionHandler,
  razorpayWebhookHandler,
  downloadInvoiceHandler,
  createOrderHandler,
  verifyPaymentHandler,
  getConfigHandler,
  cancelSubscriptionHandler,
} from './payments.controller.js';

const router = Router();

router.get('/config', authenticate, getConfigHandler);
router.delete('/cancel-subscription', authenticate, cancelSubscriptionHandler);

/**
 * @swagger
 * /payments/create-checkout-session:
 *   post:
 *     summary: Create a Razorpay Subscription session for a subscription
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tier:
 *                 type: string
 *                 enum: [GOLD, PLATINUM]
 *                 description: The subscription tier to purchase.
 *             required:
 *               - tier
 *     responses:
 *       200:
 *         description: Stripe Checkout session created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscriptionId:
 *                       type: string
 *                       example: sub_12345
 *                     shortUrl:
 *                       type: string
 *                       example: https://rzp.io/i/mock
 *       400:
 *         description: Invalid input or Price ID not configured.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: User already has an active subscription.
 */
router.post(
  '/create-checkout-session',
  authenticate,
  createCheckoutSessionHandler,
);

/**
 * Razorpay Webhook endpoint
 */
router.post(
  '/webhook',
  razorpayWebhookHandler,
);

/**
 * @swagger
 * /payments/invoice/{paymentId}:
 *   get:
 *     summary: Download PDF invoice
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/invoice/:paymentId',
  authenticate,
  downloadInvoiceHandler,
);

router.post(
  '/create-order',
  authenticate,
  createOrderHandler,
);

router.post(
  '/verify-payment',
  authenticate,
  verifyPaymentHandler,
);

export default router;
