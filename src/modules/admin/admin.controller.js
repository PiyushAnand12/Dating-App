import {
  getUsersByStatus,
  getUserByIdForAdmin,
  approveUserById,
  rejectUserById,
} from './admin.service.js';

import AppError from '../../utils/AppError.js';

import asyncHandler from '../../utils/asyncHandler.js';

export const getPendingUsersHandler = async (req, res) => {
  const status = req.query.status || 'UNDER_REVIEW';
  const users = await getUsersByStatus(status);

  res.status(200).json({
    status: 'success',
    message: 'Users fetched successfully.',
    data: users,
  });
};

export const getUserDetailsHandler = async (req, res) => {
  const user = await getUserByIdForAdmin(req.params.id);

  if (!user) {
    throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  }

  res.status(200).json({
    status: 'success',
    message: 'User fetched successfully.',
    data: user,
  });
};

export const approveUserHandler = async (req, res) => {
  const updatedUser = await approveUserById(req.params.id, req.user.id);

  res.status(200).json({
    status: 'success',
    message: 'User approved successfully.',
    data: updatedUser,
  });
};

export const rejectUserHandler = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  if (!reason || !String(reason).trim()) {
    throw new AppError('Rejection reason is required.', 400, 'REASON_REQUIRED');
  }

  const updatedUser = await rejectUserById(
    req.params.id,
    req.user.id,
    String(reason).trim()
  );

  res.status(200).json({
    status: 'success',
    message: 'User rejected successfully.',
    data: updatedUser,
  });
});