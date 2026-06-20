import { prisma } from '@aww/database';
import {
  buildRatingChartData,
  buildRedeemChartData,
  buildRatingDistribution,
} from '@/lib/owner-metrics';
import { periodRange, sevenDaysAgo, type DashboardPeriod } from '@/lib/date-buckets';

export type PaymentFilter = 'ALL' | 'CASH' | 'BANK_TRANSFER' | 'QRIS';

export interface OwnerDashboardFilters {
  branchId?: string;
  period: DashboardPeriod;
  paymentMethod: PaymentFilter;
  organizationId: string;
}

const PRODUCTION_STATUSES = ['WASHING', 'DRYING', 'IRONING', 'FOLDING'] as const;

function orderWhere(filters: OwnerDashboardFilters, range: { start: Date; end: Date }) {
  const where: Record<string, unknown> = {
    branch: { organizationId: filters.organizationId },
    createdAt: { gte: range.start, lte: range.end },
  };
  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.paymentMethod !== 'ALL') {
    where.payments = { some: { method: filters.paymentMethod } };
  }
  return where;
}

function paymentWhere(filters: OwnerDashboardFilters, range: { start: Date; end: Date }) {
  const where: Record<string, unknown> = {
    branch: { organizationId: filters.organizationId },
    paidAt: { gte: range.start, lte: range.end },
  };
  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.paymentMethod !== 'ALL') where.method = filters.paymentMethod;
  return where;
}

export async function fetchOwnerDashboardData(filters: OwnerDashboardFilters) {
  const range = periodRange(filters.period);
  const chartSince = sevenDaysAgo();
  const orderFilter = orderWhere(filters, range);
  const chartOrderFilter = {
    ...orderWhere(filters, { start: chartSince, end: new Date() }),
  };

  const [
    ordersIn,
    ordersReady,
    ordersPickedUp,
    weightSum,
    pipeline,
    production,
    revenueAgg,
    unpaidAgg,
    recentOrders,
    reviews,
    redeemOrders,
    paymentBreakdown,
    chartOrders,
  ] = await Promise.all([
    prisma.order.count({ where: orderFilter }),
    prisma.order.count({
      where: {
        ...orderFilter,
        status: { in: ['READY', 'PICKED_UP', 'DELIVERED'] },
      },
    }),
    prisma.order.count({
      where: {
        ...orderFilter,
        status: { in: ['PICKED_UP', 'DELIVERED'] },
      },
    }),
    prisma.order.aggregate({ where: orderFilter, _sum: { weightKg: true } }),
    prisma.order.groupBy({
      by: ['status'],
      where: {
        ...orderFilter,
        status: { notIn: ['PICKED_UP', 'DELIVERED', 'CANCELLED'] },
      },
      _count: true,
    }),
    prisma.order.groupBy({
      by: ['status'],
      where: {
        ...orderFilter,
        status: { in: [...PRODUCTION_STATUSES] },
      },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: paymentWhere(filters, range),
      _sum: { amount: true },
    }),
    prisma.order.aggregate({
      where: {
        branch: { organizationId: filters.organizationId },
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
        paymentStatus: 'UNPAID',
        status: { not: 'CANCELLED' },
      },
      _sum: { total: true },
    }),
    prisma.order.findMany({
      where: orderFilter,
      include: { customer: true, serviceType: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.orderReview.findMany({
      where: {
        createdAt: { gte: chartSince },
        order: {
          branch: { organizationId: filters.organizationId },
          ...(filters.branchId ? { branchId: filters.branchId } : {}),
        },
      },
      select: { rating: true, createdAt: true },
    }),
    prisma.order.findMany({
      where: {
        ...chartOrderFilter,
        loyaltyPointsRedeemed: { gt: 0 },
      },
      select: { customerId: true, loyaltyPointsRedeemed: true, createdAt: true },
    }),
    prisma.payment.groupBy({
      by: ['method'],
      where: paymentWhere(filters, range),
      _sum: { amount: true },
      _count: true,
    }),
    prisma.order.findMany({
      where: chartOrderFilter,
      select: { createdAt: true, weightKg: true, total: true },
    }),
  ]);

  const ratingChart = buildRatingChartData(reviews);
  const redeemChart = buildRedeemChartData(redeemOrders);
  const ratingDistribution = buildRatingDistribution(reviews);

  const reviewStats = {
    total: reviews.length,
    avgRating:
      reviews.length > 0
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
        : 0,
  };

  const redeemStats = {
    uniqueUsers: new Set(redeemOrders.map((o) => o.customerId)).size,
    totalPoints: redeemOrders.reduce((s, o) => s + o.loyaltyPointsRedeemed, 0),
  };

  const productionPipeline = PRODUCTION_STATUSES.map((status) => ({
    status,
    count: production.find((p) => p.status === status)?._count ?? 0,
  }));

  const avg7d = {
    ordersPerDay: Math.round((chartOrders.length / 7) * 10) / 10,
    weightPerDay: Math.round((chartOrders.reduce((s, o) => s + o.weightKg, 0) / 7) * 10) / 10,
    revenuePerDay: Math.round((chartOrders.reduce((s, o) => s + o.total, 0) / 7)),
  };

  return {
    metrics: {
      ordersIn,
      ordersReady,
      ordersPickedUp,
      revenue: revenueAgg._sum.amount ?? 0,
      totalWeightIn: weightSum._sum.weightKg ?? 0,
      unpaidTotal: unpaidAgg._sum.total ?? 0,
    },
    pipeline,
    productionPipeline,
    paymentBreakdown: paymentBreakdown.map((p) => ({
      method: p.method,
      amount: p._sum.amount ?? 0,
      count: p._count,
    })),
    recentOrders,
    ratingChart,
    ratingDistribution,
    redeemChart,
    reviewStats,
    redeemStats,
    avg7d,
  };
}
