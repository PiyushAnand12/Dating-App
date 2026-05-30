import { jest } from '@jest/globals';

// Mock Config first to avoid required env var errors
jest.unstable_mockModule('../src/config/env.js', () => ({
  config: {
    app: { port: 5000, env: 'test', corsOrigin: '*' },
    database: { url: process.env.DATABASE_URL || 'mock-url' },
    redis: { url: 'mock-url' },
    jwt: { secret: 'test-secret', refreshSecret: 'test-refresh', expiresIn: '15m', refreshExpiresIn: '7d' },
    razorpay: {
      keyId: 'test-key',
      keySecret: 'test-secret',
      webhookSecret: 'test-webhook-secret',
    },
    subscriptions: {
      goldPlanId: 'plan_gold_test',
      platinumPlanId: 'plan_platinum_test',
    }
  },
  isDev: false,
  isProd: false,
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.RAZORPAY_KEY_ID = 'test-key';
process.env.RAZORPAY_KEY_SECRET = 'test-secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.RAZORPAY_GOLD_PLAN_ID = 'plan_gold_test';
process.env.RAZORPAY_PLATINUM_PLAN_ID = 'plan_platinum_test';

// Mock Redis
jest.unstable_mockModule('../src/config/redis.js', () => ({
  default: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
    status: 'ready'
  },
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  }
}));

// Mock Firebase
jest.unstable_mockModule('../src/config/firebase.js', () => ({
  sendToUser: jest.fn().mockResolvedValue({ success: true }),
  admin: {
    messaging: () => ({
      send: jest.fn().mockResolvedValue('test-message-id')
    })
  }
}));

// Mock Supabase Storage
jest.unstable_mockModule('../src/utils/uploadToStorage.js', () => ({
  uploadToStorage: jest.fn().mockResolvedValue({
    key: 'mock-key',
    bucket: 'mock-bucket',
    contentType: 'image/jpeg',
    size: 1024,
  }),
  default: {
    uploadToStorage: jest.fn()
  }
}));

// Mock Signed URLs
jest.unstable_mockModule('../src/utils/signedUrl.js', () => ({
  getSignedObjectUrl: jest.fn().mockResolvedValue('https://example.com/mock-signed-url'),
  default: {
    getSignedObjectUrl: jest.fn()
  }
}));
// Mock Razorpay Config
jest.unstable_mockModule('../src/config/razorpay.js', () => ({
  default: {
    subscriptions: {
      create: (params) => Promise.resolve({ id: 'sub_test_123', status: 'created', short_url: 'https://rzp.io/i/test' }),
      fetch: () => Promise.resolve({ id: 'sub_test_123', status: 'active' }),
    },
    orders: {
      create: () => Promise.resolve({ id: 'order_test_123', amount: 50000, status: 'created' }),
    },
    webhooks: {
      verifySignature: () => true,
    }
  }
}));

// Mock Razorpay NPM package (for safety)
jest.unstable_mockModule('razorpay', () => ({
  default: jest.fn().mockImplementation(() => ({
    subscriptions: {
      create: jest.fn().mockResolvedValue({ id: 'sub_test_123', status: 'created', short_url: 'https://rzp.io/i/test' }),
    }
  }))
}));
