import { Router } from 'express';
import healthRouter from '../../modules/health/health.routes.js';
import authRouter from '../../modules/auth/auth.routes.js';
import userRouter from '../../modules/user/user.routes.js';
import interestsRouter from '../../modules/interests/interests.routes.js';
import mediaRouter from '../../modules/photos/photos.routes.js';
import adminRouter from '../../modules/admin/admin.routes.js';
import paymentsRouter from '../../modules/payments/payments.routes.js';

const router = Router();

// ─── API v1 root / ping ─────────────────────────────────
router.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    version: 'v1',
  });
});

// ─── Feature routers ────────────────────────────────────
router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/interests', interestsRouter);
router.use('/users/interests', interestsRouter);
router.use('/media', mediaRouter);
router.use('/admin', adminRouter);
router.use('/payments', paymentsRouter);

export default router;