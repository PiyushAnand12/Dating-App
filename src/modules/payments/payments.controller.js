import paymentsService from './payments.service.js';
import invoiceService from './invoice.service.js';
import { logger } from '../../config/logger.js';
import asyncHandler from '../../utils/asyncHandler.js';

/**
 * Endpoint to start a subscription purchase (Razorpay)
 */
export const createCheckoutSessionHandler = asyncHandler(async (req, res) => {
  const { tier, duration } = req.body;
  const userId = req.user.id;

  const session = await paymentsService.createSubscriptionSession(userId, tier, duration);

  res.status(200).json({
    status: 'success',
    data: session,
  });
});

/**
 * Razorpay Webhook Handler
 */
export const razorpayWebhookHandler = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  
  try {
    await paymentsService.handleRazorpayWebhook(req.rawBody, signature);
    res.json({ received: true });
  } catch (err) {
    logger.error({ err }, 'Razorpay Webhook Processing Failed');
    res.status(500).json({ status: 'error', message: 'Internal server error while processing webhook' });
  }
};

/**
 * Download Invoice PDF
 */
export const downloadInvoiceHandler = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  const userId = req.user.id;

  const pdfBuffer = await invoiceService.generateInvoicePdf(paymentId, userId);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${paymentId}.pdf`);
  res.send(pdfBuffer);
});

/**
 * Create a one-time order (Order API)
 */
export const createOrderHandler = asyncHandler(async (req, res) => {
  const { amount, planType } = req.body;
  const userId = req.user.id;

  const order = await paymentsService.createOrder(userId, amount, { planType });

  res.status(200).json({
    status: 'success',
    data: order,
  });
});

/**
 * Verify payment signature
 */
export const verifyPaymentHandler = asyncHandler(async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, razorpay_subscription_id } = req.body;
  const userId = req.user.id;

  const payment = await paymentsService.verifyPayment(
    userId, 
    razorpay_payment_id, 
    razorpay_order_id || razorpay_subscription_id, 
    razorpay_signature
  );

  res.status(200).json({
    status: 'success',
    message: 'Payment verified and processed successfully',
    data: payment,
  });
});

/**
 * Get payment configuration (e.g., Razorpay Key ID)
 */
export const getConfigHandler = asyncHandler(async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey123',
    },
  });
});

/**
 * Cancel active subscription
 */
export const cancelSubscriptionHandler = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await paymentsService.cancelSubscription(userId);

  res.status(200).json({
    status: 'success',
    ...result,
  });
});

export default {
  createCheckoutSessionHandler,
  razorpayWebhookHandler,
  downloadInvoiceHandler,
  createOrderHandler,
  verifyPaymentHandler,
  getConfigHandler,
  cancelSubscriptionHandler,
};
