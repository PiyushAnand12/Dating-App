import 'dotenv/config';

const allowedEnvs = new Set(['development', 'test', 'production']);

const read = (key) => process.env[key];

const required = (key) => {
  const value = read(key)?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const optional = (key, fallback = undefined) => {
  const value = read(key);
  return value ?? fallback;
};

const parsePort = (value) => {
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT: ${value}`);
  }
  return port;
};

const env = optional('NODE_ENV', 'development');
if (!allowedEnvs.has(env)) {
  throw new Error(`Invalid NODE_ENV: ${env}`);
}

export const config = {
  app: {
    port: parsePort(optional('PORT', '3000')),
    env,
    corsOrigin: optional('CORS_ORIGIN', '*'),
  },
  database: {
    url: required('DATABASE_URL'),
    directUrl: optional('DIRECT_URL'),
  },
  redis: {
    url: required('REDIS_URL'),
  },
  jwt: {
    secret: required('JWT_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    expiresIn: optional('JWT_EXPIRES_IN', '15m'),
    refreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '7d'),
  },
  firebase: {
    projectId: optional('FIREBASE_PROJECT_ID'),
    clientEmail: optional('FIREBASE_CLIENT_EMAIL'),
    privateKey: optional('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
    apiKey: optional('FIREBASE_API_KEY'),
  },
  auth0: {
    domain: optional('AUTH0_DOMAIN'),
    clientId: optional('AUTH0_CLIENT_ID'),
    clientSecret: optional('AUTH0_CLIENT_SECRET'),
    audience: optional('AUTH0_AUDIENCE'),
  },
  r2: {
    accountId: optional('R2_ACCOUNT_ID'),
    accessKeyId: optional('R2_ACCESS_KEY_ID'),
    secretAccessKey: optional('R2_SECRET_ACCESS_KEY'),
    bucketName: optional('R2_BUCKET_NAME'),
    region: optional('R2_REGION', 'auto'),
    endpoint: optional('R2_ENDPOINT'),
  },
  razorpay: {
    keyId: optional('RAZORPAY_KEY_ID'),
    keySecret: optional('RAZORPAY_KEY_SECRET'),
    webhookSecret: optional('RAZORPAY_WEBHOOK_SECRET'),
  },
  subscriptions: {
    goldPlanId: optional('RAZORPAY_GOLD_PLAN_ID'),
    goldWeeklyPlanId: optional('RAZORPAY_GOLD_WEEKLY_PLAN_ID'),
    goldQuarterlyPlanId: optional('RAZORPAY_GOLD_QUARTERLY_PLAN_ID'),
    goldYearlyPlanId: optional('RAZORPAY_GOLD_YEARLY_PLAN_ID'),
    
    platinumPlanId: optional('RAZORPAY_PLATINUM_PLAN_ID'),
    platinumWeeklyPlanId: optional('RAZORPAY_PLATINUM_WEEKLY_PLAN_ID'),
    platinumQuarterlyPlanId: optional('RAZORPAY_PLATINUM_QUARTERLY_PLAN_ID'),
    platinumYearlyPlanId: optional('RAZORPAY_PLATINUM_YEARLY_PLAN_ID'),
  },
};

export const isDev = config.app.env === 'development';
export const isProd = config.app.env === 'production';
