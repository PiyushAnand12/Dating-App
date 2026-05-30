import Stripe from 'stripe';
import { config } from './env.js';
import { logger } from './logger.js';

let stripe;

if (config.stripe.secretKey) {
  stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: '2023-10-16', // Ensure stable API version
    appInfo: {
      name: 'Dating App Backend',
      version: '1.0.0',
    },
  });
  logger.info('Stripe SDK initialized');
} else {
  logger.warn('STRIPE_SECRET_KEY is missing. Payment features will fail.');
  // Placeholder/Mock stripe object for development
  stripe = {
    checkout: {
      sessions: {
        create: async () => {
          logger.error('Stripe not configured: Returning mock session');
          return { url: 'https://checkout.stripe.com/mock' };
        }
      }
    },
    webhooks: {
      constructEvent: () => {
        throw new Error('Stripe Webhook Secret not configured');
      }
    }
  };
}

export default stripe;
