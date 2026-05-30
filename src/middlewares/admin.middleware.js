import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

const requireAdmin = asyncHandler(async (req, _res, next) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401, 'UNAUTHORIZED');
  }

  const role = String(req.user.role || '').toUpperCase();

  if (role !== 'ADMIN') {
    throw new AppError('Admin access required', 403, 'FORBIDDEN');
  }

  next();
});

export default requireAdmin;