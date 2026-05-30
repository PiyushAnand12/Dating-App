import Razorpay from 'razorpay';
import { config } from './env.js';
import { logger } from './logger.js';

let razorpay;

if (config.razorpay.keyId && config.razorpay.keySecret) {
  razorpay = new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
  });
  logger.info('Razorpay SDK initialized');
} else {
  logger.warn('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing. Payment features will fail.');
  // Mock interface for development
  razorpay = {
    subscriptions: {
      create: async () => ({ id: 'sub_mock_' + Date.now(), short_url: 'https://rzp.io/i/mock' }),
      cancel: async (id) => ({ id, status: 'cancelled' }),
    },
    orders: {
      create: async (params) => ({ 
        id: 'order_mock_' + Date.now(), 
        amount: params.amount, 
        currency: params.currency,
        status: 'created'
      }),
    },
    payments: {
      fetch: async (id) => ({ id, status: 'captured', amount: 50000 }),
    },
    webhooks: {
      // Mock validation
    }
  };
}

export default razorpay;
