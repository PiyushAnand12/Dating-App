import asyncHandler from '../../utils/asyncHandler.js';
import analyticsService from './analytics.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

/**
 * Handle revenue analytics request
 * GET /api/v1/admin/analytics/revenue
 */
export const getAdminAnalyticsHandler = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const [metrics, trends] = await Promise.all([
    analyticsService.getRevenueMetrics(),
    analyticsService.getGrowthTrends(Number(days))
  ]);

  sendSuccess(res, {
    summary: metrics,
    trends
  });
});

export default {
  getAdminAnalyticsHandler,
};
