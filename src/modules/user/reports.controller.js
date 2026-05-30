import asyncHandler from '../../utils/asyncHandler.js';
import reportsService from './reports.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

/**
 * Handle user reporting another user
 */
export const createReportHandler = asyncHandler(async (req, res) => {
  const { targetId, reason, details } = req.body;
  const actorId = req.user.id;
  const file = req.file;

  const report = await reportsService.createReport(actorId, targetId, reason, details, file);

  sendSuccess(res, {
    statusCode: 201,
    message: 'Report submitted successfully. Our team will review it shortly.',
    data: report,
  });
});

/**
 * Handle fetching the moderation queue (Admin only)
 */
export const getReportsQueueHandler = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;

  const result = await reportsService.getReportsQueue({
    status,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });

  sendSuccess(res, {
    message: 'Moderation queue fetched successfully.',
    data: result,
  });
});

export default {
  createReportHandler,
  getReportsQueueHandler,
};
