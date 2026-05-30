import razorpay from '../../config/razorpay.js';
import prisma from '../../config/prisma.js';
import { config } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import AppError from '../../utils/AppError.js';
import crypto from 'crypto';

/**
 * Creates a Razorpay Subscription for the specific tier.
 */
export const createSubscriptionSession = async (userId, tier, duration = 'MONTHLY') => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, gatewayCustomerId: true },
  });

  if (!user) throw new AppError('User not found', 404);

  // Map tier + duration to Razorpay Plan ID
  let planId;
  const tierKey = tier.toLowerCase();
  const durationKey = duration.toLowerCase();

  // Try to find the plan ID from config
  // For backwards compatibility and simplicity, we'll check specific env vars or a nested structure
  if (tier === 'PREMIUM' || tier === 'GOLD') {
    if (duration === 'WEEKLY') planId = config.subscriptions.goldWeeklyPlanId || process.env.RAZORPAY_GOLD_WEEKLY_PLAN_ID;
    else if (duration === 'QUARTERLY') planId = config.subscriptions.goldQuarterlyPlanId || process.env.RAZORPAY_GOLD_QUARTERLY_PLAN_ID;
    else if (duration === 'YEARLY') planId = config.subscriptions.goldYearlyPlanId || process.env.RAZORPAY_GOLD_YEARLY_PLAN_ID;
    else planId = config.subscriptions.goldPlanId || process.env.RAZORPAY_GOLD_MONTHLY_PLAN_ID;
  } else if (tier === 'ELITE' || tier === 'PLATINUM') {
    if (duration === 'WEEKLY') planId = config.subscriptions.platinumWeeklyPlanId || process.env.RAZORPAY_PLATINUM_WEEKLY_PLAN_ID;
    else if (duration === 'QUARTERLY') planId = config.subscriptions.platinumQuarterlyPlanId || process.env.RAZORPAY_PLATINUM_QUARTERLY_PLAN_ID;
    else if (duration === 'YEARLY') planId = config.subscriptions.platinumYearlyPlanId || process.env.RAZORPAY_PLATINUM_YEARLY_PLAN_ID;
    else planId = config.subscriptions.platinumPlanId || process.env.RAZORPAY_PLATINUM_MONTHLY_PLAN_ID;
  } else {
    throw new AppError('Invalid subscription tier', 400);
  }

  // Fallback for development if no plan ID is found
  if (!planId && config.app.env === 'development') {
    planId = `plan_mock_${tierKey}_${durationKey}`;
    logger.warn({ tier, duration }, 'No Plan ID found, using mock ID for development');
  }

  if (!planId) {
    throw new AppError(`Razorpay Plan ID for ${tier} (${duration}) is not configured`, 500);
  }

  try {
    // Create Subscription in Razorpay
    logger.info({ planId, userId, hasSubscriptions: !!razorpay.subscriptions }, 'Calling Razorpay Subscriptions Create');
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 12, // For a year if monthly
      quantity: 1,
      notes: {
        userId: user.id,
        tier,
      },
    });

    logger.info({ subscription }, 'Razorpay Subscription Response');

    if (!subscription) {
      logger.error({ razorpaySubscriptions: razorpay.subscriptions }, 'SUBSCRIPTION IS UNDEFINED');
      throw new AppError('Razorpay subscription creation returned undefined', 500);
    }

    return {
      subscriptionId: subscription.id,
      shortUrl: subscription.short_url,
    };
  } catch (err) {
    throw err;
  }
};

/**
 * Handle Razorpay Webhooks
 */
export const handleRazorpayWebhook = async (rawBody, signature) => {
  if (!rawBody || !signature) {
    throw new AppError('Signature or body missing', 400);
  }

  // 1. Verify Signature using the raw buffer
  const expectedSignature = crypto
    .createHmac('sha256', config.razorpay.webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (expectedSignature !== signature) {
    logger.error('Invalid Razorpay Webhook Signature');
    throw new AppError('Invalid signature', 400);
  }

  // 2. Parse body now that we verified it
  let body;
  try {
    body = JSON.parse(rawBody.toString());
  } catch (err) {
    throw new AppError('Invalid JSON body', 400);
  }

  const { event, payload } = body;
  logger.info({ event }, 'Processing Razorpay Webhook');

  switch (event) {
    case 'subscription.charged': {
      const subscription = payload.subscription.entity;
      const payment = payload.payment.entity;
      const { userId, tier } = subscription.notes;

      await processSubscriptionUpdate(userId, tier, subscription);
      await grantMonthlyBoosts(userId, tier);
      break;
    }
    case 'subscription.cancelled':
    case 'subscription.halted': {
      const subscription = payload.subscription.entity;
      const { userId, tier } = subscription.notes;
      await processSubscriptionUpdate(userId, tier, subscription);
      break;
    }
    default:
      logger.debug({ event }, 'Ignored Razorpay event');
  }
};

/**
 * Sync Razorpay subscription state with our database
 */
async function processSubscriptionUpdate(userId, tier, rzpSub) {
  const statusMap = {
    created: 'INCOMPLETE',
    authenticated: 'TRIALING',
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    unactivated: 'INCOMPLETE',
    cancelled: 'CANCELED',
    expired: 'INCOMPLETE_EXPIRED',
    halted: 'UNPAID',
  };

  const status = statusMap[rzpSub.status] || 'INCOMPLETE';

  await prisma.$transaction(async (tx) => {
    // 1. Create or Update Subscription record
    const subscription = await tx.subscription.upsert({
      where: { providerId: rzpSub.id },
      create: {
        providerId: rzpSub.id,
        userId,
        tier,
        status,
        planId: rzpSub.plan_id,
        currentPeriodStart: new Date(rzpSub.current_start * 1000 || Date.now()),
        currentPeriodEnd: new Date(rzpSub.current_end * 1000 || (Date.now() + 30 * 24 * 60 * 60 * 1000)),
      },
      update: {
        status,
        currentPeriodStart: new Date(rzpSub.current_start * 1000),
        currentPeriodEnd: new Date(rzpSub.current_end * 1000),
      }
    });

    // 2. Update User record
    await tx.user.update({
      where: { id: userId },
      data: {
        subscriptionId: subscription.id,
        subscriptionTier: (status === 'ACTIVE' || status === 'TRIALING') ? tier : 'FREE',
        subscriptionStatus: status,
        subscriptionExpiresAt: new Date(rzpSub.current_end * 1000),
      }
    });
  });

  logger.info({ userId, status, tier }, 'Razorpay subscription processed');
}

/**
 * Create a one-time order (for Boosts, etc.)
 */
export const createOrder = async (userId, amount, notes = {}) => {
  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId,
        ...notes
      }
    });

    // Create a pending payment record in our DB
    await prisma.payment.create({
      data: {
        userId,
        amount,
        currency: 'INR',
        status: 'PENDING',
        gatewayOrderId: order.id,
        planType: notes.planType || 'BOOST'
      }
    });

    return order;
  } catch (err) {
    logger.error({ err, userId }, 'Failed to create Razorpay order');
    throw new AppError('Payment initiation failed', 500);
  }
};

/**
 * Verify Payment Signature and process the successful payment
 */
export const verifyPayment = async (userId, rzpPaymentId, rzpOrderId, rzpSignature) => {
  // 1. Verify Signature
  const secret = config.razorpay.keySecret;
  const signatureData = rzpOrderId ? (rzpOrderId + '|' + rzpPaymentId) : (rzpPaymentId + '|' + rzpOrderId); 
  // Wait, if it's a subscription, rzpOrderId is the subscriptionId.
  // The correct format for subscriptions is payment_id + | + subscription_id
  // The correct format for orders is order_id + | + payment_id
  
  let generatedSignature;
  if (rzpOrderId.startsWith('sub_')) {
    generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(rzpPaymentId + '|' + rzpOrderId)
      .digest('hex');
  } else {
    generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(rzpOrderId + '|' + rzpPaymentId)
      .digest('hex');
  }

  if (generatedSignature !== rzpSignature) {
    logger.error({ rzpOrderId, rzpPaymentId, generatedSignature, rzpSignature }, 'Signature verification failed');
    throw new AppError('Invalid payment signature', 400);
  }

  // 2. Update Payment Record
  const payment = await prisma.payment.update({
    where: { gatewayOrderId: rzpOrderId },
    data: {
      status: 'SUCCESS',
      gatewayPaymentId: rzpPaymentId
    }
  });

  // 3. Trigger Business Logic based on planType
  if (payment.planType === 'BOOST') {
    await applyBoostToUser(userId);
  }

  return payment;
};

async function applyBoostToUser(userId) {
  const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour boost
  await prisma.userBoost.create({
    data: {
      userId,
      expiresAt
    }
  });
  
  logger.info({ userId, expiresAt }, 'Boost applied to user');
}

/**
 * Cancel an active subscription
 */
export const cancelSubscription = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user.subscription || user.subscription.status === 'CANCELED') {
    throw new AppError('No active subscription found to cancel', 404);
  }

  try {
    await razorpay.subscriptions.cancel(user.subscription.providerId, {
      cancel_at_cycle_end: 1
    });
    
    // We update local status to CANCELED, but keep it active until period end
    await prisma.subscription.update({
      where: { id: user.subscription.id },
      data: { status: 'CANCELED', cancelAtPeriodEnd: true }
    });

    return { success: true, message: 'Subscription cancelled successfully' };
  } catch (err) {
    logger.error({ err, userId }, 'Failed to cancel Razorpay subscription');
    throw new AppError('Cancellation failed', 500);
  }
};

/**
 * Grant monthly boosts based on tier
 */
async function grantMonthlyBoosts(userId, tier) {
  const boostCount = tier === 'ELITE' ? 10 : (tier === 'PREMIUM' ? 5 : 0);
  if (boostCount === 0) return;

  logger.info({ userId, tier, boostCount }, 'Granting monthly boosts to user');
  // Implementation note: In a real app, you'd increment a 'boostBalance' field in the DB.
}

export default {
  createSubscriptionSession,
  handleRazorpayWebhook,
  createOrder,
  verifyPayment,
  cancelSubscription
};
