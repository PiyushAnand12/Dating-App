import { jest } from '@jest/globals';
import crypto from 'crypto';

// Dynamic Imports for the application code
// These must be imported AFTER the setup file has run and registered mocks
const { default: request } = await import('supertest');
const { default: app } = await import('../src/app.js');
const { default: prisma } = await import('../src/config/prisma.js');

jest.setTimeout(30000);

describe('Payments & Subscriptions', () => {
  const userId = 'dev-user-1';

  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: userId },
      update: { subscriptionTier: 'FREE' },
      create: { 
        id: userId, 
        email: 'pay@example.com', 
        firstName: 'Payer',
        subscriptionTier: 'FREE'
      }
    });

    // Cleanup
    await prisma.payment.deleteMany({ where: { userId: userId } });
    await prisma.subscription.deleteMany({ where: { userId: userId } });
  });

  describe('POST /api/v1/payments/create-checkout-session', () => {
    test('should create a Razorpay subscription', async () => {
      const response = await request(app)
        .post('/api/v1/payments/create-checkout-session')
        .set('Authorization', 'Bearer test-token')
        .send({ tier: 'GOLD' });
      
      expect(response.status).toBe(200);
      expect(response.body.data.subscriptionId).toBe('sub_test_123');
    });
  });

  describe('POST /api/v1/payments/webhook', () => {
    test('should handle subscription.charged event', async () => {
      // Simulate Razorpay webhook
      const payload = {
        event: 'subscription.charged',
        payload: {
          subscription: {
            entity: {
              id: 'sub_test_123',
              customer_id: 'cust_123',
              status: 'active',
              current_start: Math.floor(Date.now() / 1000),
              current_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
              notes: { userId: userId, tier: 'GOLD' }
            }
          },
          payment: {
            entity: {
              id: 'pay_123',
              amount: 49900,
              currency: 'INR'
            }
          }
        }
      };

      const rawBody = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', 'test-webhook-secret')
        .update(rawBody)
        .digest('hex');

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);
      
      expect(response.status).toBe(200);

      // Verify DB update
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user.subscriptionTier).toBe('GOLD');
    });
  });

  describe('GET /api/v1/payments/invoice/:paymentId', () => {
    test('should download a PDF invoice', async () => {
      // Setup a payment record
      const payment = await prisma.payment.create({
        data: {
          id: 'pay_test_invoice',
          userId: userId,
          amount: 499,
          currency: 'INR',
          status: 'SUCCESS',
          gateway: 'RAZORPAY',
          gatewayPaymentId: 'pay_123',
          planType: 'GOLD'
        }
      });

      const response = await request(app)
        .get(`/api/v1/payments/invoice/${payment.id}`)
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(200);
      expect(response.header['content-type']).toBe('application/pdf');
    });
  });
});
