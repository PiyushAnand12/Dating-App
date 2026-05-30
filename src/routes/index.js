import { Router } from 'express';
import v1Router from './v1/index.js';

const router = Router();

// ─── Versioned API routes ───────────────────────────────
router.use('/v1', v1Router);

// TODO: mount future versions here, e.g.:
// import v2Router from './v2/index.js';
// router.use('/v2', v2Router);

export default router;
