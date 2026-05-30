import prisma from '../../config/prisma.js';
import { TIER_PRICES } from '../../config/subscription_prices.js';

/**
 * Get high-level revenue KPIs
 */
export const getRevenueMetrics = async () => {
  const [activeCounts, canceledCount, last30DaysCanceled] = await Promise.all([
    // Group active subscriptions by tier
    prisma.subscription.groupBy({
      by: ['tier'],
      where: { status: 'ACTIVE' },
      _count: { _all: true }
    }),
    // Total canceled subscriptions
    prisma.subscription.count({
      where: { status: 'CANCELED' }
    }),
    // Canceled in last 30 days (for churn)
    prisma.subscription.count({
      where: {
        status: 'CANCELED',
        updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    })
  ]);

  // Calculate MRR
  let totalMRR = 0;
  const tiers = { GOLD: 0, PLATINUM: 0 };
  
  activeCounts.forEach(group => {
    const price = TIER_PRICES[group.tier] || 0;
    const count = group._count._all;
    totalMRR += price * count;
    if (tiers[group.tier] !== undefined) {
      tiers[group.tier] = count;
    }
  });

  const totalActive = Object.values(tiers).reduce((a, b) => a + b, 0);
  const churnRate = totalActive > 0 ? (last30DaysCanceled / totalActive) * 100 : 0;

  return {
    mrr: Number(totalMRR.toFixed(2)),
    activeSubscribers: totalActive,
    tierBreakdown: tiers,
    churn: {
      totalCanceled: canceledCount,
      last30Days: last30DaysCanceled,
      ratePercentage: Number(churnRate.toFixed(2))
    }
  };
};

/**
 * Get subscription growth time series (Last 30 Days)
 */
export const getGrowthTrends = async (days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [newSubs, canceledSubs] = await Promise.all([
    prisma.subscription.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, tier: true }
    }),
    prisma.subscription.findMany({
      where: { 
        status: 'CANCELED',
        updatedAt: { gte: startDate }
       },
      select: { updatedAt: true, tier: true }
    })
  ]);

  // bucket by date
  const trends = {};
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    trends[dateStr] = { new: 0, canceled: 0 };
  }

  newSubs.forEach(s => {
    const d = s.createdAt.toISOString().split('T')[0];
    if (trends[d]) trends[d].new++;
  });

  canceledSubs.forEach(s => {
    const d = s.updatedAt.toISOString().split('T')[0];
    if (trends[d]) trends[d].canceled++;
  });

  return Object.entries(trends)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export default {
  getRevenueMetrics,
  getGrowthTrends
};
