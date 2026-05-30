import asyncHandler from '../../utils/asyncHandler.js';
import appealService from './appeal.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

/**
 * User submits an appeal
 */
export const submitAppealHandler = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const userId = req.user.id;

  const appeal = await appealService.submitAppeal(userId, reason);

  sendSuccess(res, {
    statusCode: 201,
    message: 'Appeal submitted successfully. We will review it within 48 hours.',
    data: appeal,
  });
});

/**
 * User views their appeal history
 */
export const getMyAppealsHandler = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit } = req.query;
  const result = await appealService.getMyAppeals(userId, { page, limit });

  sendSuccess(res, {
    message: 'Appeal history fetched successfully.',
    data: result,
  });
});

/**
 * Admin views all appeals
 */
export const getAdminAppealsHandler = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;

  const result = await appealService.getAllAppeals({
    status,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });

  sendSuccess(res, {
    message: 'Appeals queue fetched successfully.',
    data: result,
  });
});

/**
 * Admin reviews an appeal
 */
export const reviewAppealHandler = asyncHandler(async (req, res) => {
  const { appealId } = req.params;
  const { status, remarks } = req.body;
  const adminId = req.user.id;

  const appeal = await appealService.reviewAppeal(appealId, adminId, {
    status,
    remarks,
  });

  sendSuccess(res, {
    message: `Appeal ${status.toLowerCase()} successfully.`,
    data: appeal,
  });
});

export default {
  submitAppealHandler,
  getMyAppealsHandler,
  getAdminAppealsHandler,
  reviewAppealHandler,
};
