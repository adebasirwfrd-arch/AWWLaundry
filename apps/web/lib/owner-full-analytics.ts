import { prisma } from '@aww/database';
import {
  fetchOwnerDashboardData,
  type OwnerDashboardFilters,
  type PaymentFilter,
} from '@/lib/owner-analytics';
import { fetchCashflowOverview } from '@/lib/cashflow-analytics';
import { buildPaymentBehaviorAnalytics } from '@/lib/payment-behavior-analytics';
import {
  periodRange,
  lastNDays,
  formatDayLabel,
  sameCalendarDay,
  type DashboardPeriod,
} from '@/lib/date-buckets';

const PRODUCTION_STATUSES = ['WASHING', 'DRYING', 'IRONING', 'FOLDING'] as const;

function branchWhere(organizationId: string, branchId?: string) {
  return branchId ? { branchId } : { branch: { organizationId } };
}

function chartDayCount(period: DashboardPeriod) {
  if (period === 'year') return 30;
  if (period === 'month') return 31;
  if (period === 'week') return 7;
  return 1;
}

export type { OwnerDashboardFilters, PaymentFilter };

export async function fetchOwnerFullAnalytics(filters: OwnerDashboardFilters) {
  const range = periodRange(filters.period);
  const chartDays = lastNDays(chartDayCount(filters.period));
  const chartStart = chartDays[0] ?? range.start;
  const bw = branchWhere(filters.organizationId, filters.branchId);

  const orderWhereBase: Record<string, unknown> = {
    ...bw,
    createdAt: { gte: range.start, lte: range.end },
  };
  if (filters.paymentMethod !== 'ALL') {
    orderWhereBase.payments = { some: { method: filters.paymentMethod } };
  }

  const chartOrderWhere: Record<string, unknown> = {
    ...bw,
    createdAt: { gte: chartStart, lte: range.end },
  };
  if (filters.paymentMethod !== 'ALL') {
    chartOrderWhere.payments = { some: { method: filters.paymentMethod } };
  }

  const [dashboard, cashflow, branches, periodOrders, chartOrders, behaviorOrders, statusGroups, serviceGroups, productionOrders, inventoryItems, movements, newCustomers, topCustomerGroups, loyaltyTop, totalCustomers] =
    await Promise.all([
      fetchOwnerDashboardData(filters),
      fetchCashflowOverview({
        organizationId: filters.organizationId,
        branchId: filters.branchId,
        period: filters.period,
      }),
      prisma.branch.findMany({
        where: { organizationId: filters.organizationId, isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      prisma.order.findMany({
        where: orderWhereBase,
        select: { createdAt: true, total: true, weightKg: true, customerId: true },
      }),
      prisma.order.findMany({
        where: chartOrderWhere,
        select: { createdAt: true, total: true, weightKg: true, status: true },
      }),
      prisma.order.findMany({
        where: {
          ...bw,
          createdAt: { gte: range.start, lte: range.end },
          status: { not: 'CANCELLED' },
        },
        select: {
          fromApp: true,
          paymentStatus: true,
          total: true,
          notes: true,
          createdAt: true,
          payments: { select: { amount: true, status: true } },
        },
      }),
      prisma.order.groupBy({
        by: ['status'],
        where: orderWhereBase,
        _count: true,
      }),
      prisma.order.groupBy({
        by: ['serviceTypeId'],
        where: orderWhereBase,
        _count: true,
        _sum: { total: true },
      }),
      prisma.order.findMany({
        where: {
          ...bw,
          status: { in: [...PRODUCTION_STATUSES] },
          createdAt: { gte: chartStart, lte: range.end },
        },
        select: { createdAt: true, status: true },
      }),
      prisma.inventoryItem.findMany({
        where: bw,
        include: { branch: { select: { name: true } } },
      }),
      prisma.stockMovement.findMany({
        where: {
          item: bw,
          createdAt: { gte: range.start, lte: range.end },
        },
        select: { type: true, qty: true, createdAt: true },
      }),
      prisma.customer.findMany({
        where: {
          organizationId: filters.organizationId,
          createdAt: { gte: chartStart, lte: range.end },
        },
        select: { createdAt: true },
      }),
      prisma.order.groupBy({
        by: ['customerId'],
        where: orderWhereBase,
        _count: true,
        _sum: { total: true },
        orderBy: { _count: { customerId: 'desc' } },
        take: 10,
      }),
      prisma.customer.findMany({
        where: { organizationId: filters.organizationId },
        orderBy: { loyaltyPoints: 'desc' },
        take: 10,
        select: { name: true, loyaltyPoints: true, phone: true },
      }),
      prisma.customer.count({
        where: { organizationId: filters.organizationId },
      }),
    ]);

  const serviceTypeIds = serviceGroups.map((s) => s.serviceTypeId);
  const serviceTypes = serviceTypeIds.length
    ? await prisma.serviceType.findMany({
        where: { id: { in: serviceTypeIds } },
        select: { id: true, name: true },
      })
    : [];
  const serviceMap = Object.fromEntries(serviceTypes.map((s) => [s.id, s.name]));

  const customerIds = topCustomerGroups.map((g) => g.customerId);
  const topCustomerRows = customerIds.length
    ? await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, name: true },
      })
    : [];
  const customerMap = Object.fromEntries(topCustomerRows.map((c) => [c.id, c.name]));

  const dailyOrders = chartDays.map((day) => {
    const dayOrders = chartOrders.filter((o) => sameCalendarDay(new Date(o.createdAt), day));
    return {
      date: formatDayLabel(day),
      orders: dayOrders.length,
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      weight: Math.round(dayOrders.reduce((s, o) => s + o.weightKg, 0) * 10) / 10,
    };
  });

  const productionDaily = chartDays.map((day) => {
    const dayOrders = productionOrders.filter((o) => sameCalendarDay(new Date(o.createdAt), day));
    return {
      date: formatDayLabel(day),
      total: dayOrders.length,
      washing: dayOrders.filter((o) => o.status === 'WASHING').length,
      drying: dayOrders.filter((o) => o.status === 'DRYING').length,
      ironing: dayOrders.filter((o) => o.status === 'IRONING').length,
      folding: dayOrders.filter((o) => o.status === 'FOLDING').length,
    };
  });

  const orderStatusDonut = statusGroups.map((s) => ({
    name: s.status,
    count: s._count,
  }));

  const serviceDonut = serviceGroups.map((s) => ({
    name: serviceMap[s.serviceTypeId] ?? 'Lainnya',
    count: s._count,
    revenue: s._sum.total ?? 0,
  }));

  const categoryMap = new Map<string, { value: number; items: number }>();
  for (const item of inventoryItems) {
    const cur = categoryMap.get(item.category) ?? { value: 0, items: 0 };
    cur.value += item.currentStock * item.unitCost;
    cur.items += 1;
    categoryMap.set(item.category, cur);
  }
  const stockByCategory = [...categoryMap.entries()].map(([category, v]) => ({
    category,
    value: Math.round(v.value),
    items: v.items,
  }));

  const lowStockItems = inventoryItems
    .filter((i) => i.currentStock <= i.minStock)
    .map((i) => ({
      name: i.name,
      branchName: i.branch.name,
      current: i.currentStock,
      min: i.minStock,
      unit: i.unit,
    }))
    .sort((a, b) => a.current - b.current)
    .slice(0, 12);

  const branchStockMap = new Map<string, { branchName: string; value: number; items: number }>();
  for (const item of inventoryItems) {
    const cur = branchStockMap.get(item.branchId) ?? {
      branchName: item.branch.name,
      value: 0,
      items: 0,
    };
    cur.value += item.currentStock * item.unitCost;
    cur.items += 1;
    branchStockMap.set(item.branchId, cur);
  }
  const stockByBranch = [...branchStockMap.values()].map((b) => ({
    branchName: b.branchName,
    value: Math.round(b.value),
    items: b.items,
  }));

  const movementTypeMap = new Map<string, number>();
  for (const m of movements) {
    movementTypeMap.set(m.type, (movementTypeMap.get(m.type) ?? 0) + 1);
  }
  const movementByType = [...movementTypeMap.entries()].map(([type, count]) => ({ type, count }));

  const movementDaily = chartDays.map((day) => {
    const dayMoves = movements.filter((m) => sameCalendarDay(new Date(m.createdAt), day));
    return {
      date: formatDayLabel(day),
      in: dayMoves.filter((m) => m.type === 'IN').reduce((s, m) => s + m.qty, 0),
      out: dayMoves.filter((m) => m.type === 'OUT').reduce((s, m) => s + m.qty, 0),
      adjust: dayMoves.filter((m) => m.type === 'ADJUSTMENT').length,
    };
  });

  const newCustomersDaily = chartDays.map((day) => ({
    date: formatDayLabel(day),
    count: newCustomers.filter((c) => sameCalendarDay(new Date(c.createdAt), day)).length,
  }));

  const topCustomers = topCustomerGroups.map((g) => ({
    name: customerMap[g.customerId] ?? 'Pelanggan',
    orders: g._count,
    revenue: g._sum.total ?? 0,
  }));

  const activeCustomers = new Set(periodOrders.map((o) => o.customerId)).size;
  const newInPeriod = await prisma.customer.count({
    where: {
      organizationId: filters.organizationId,
      createdAt: { gte: range.start, lte: range.end },
    },
  });

  const paymentBehavior = buildPaymentBehaviorAnalytics(behaviorOrders, chartDays);

  return {
    ...dashboard,
    cashflow,
    branches,
    paymentBehavior,
    summary: {
      orders: periodOrders.length,
      revenue: cashflow.summary.totalIncome,
      netCashflow: cashflow.summary.netCashflow,
      outstandingTotal: dashboard.metrics.outstandingTotal,
      payLaterOutstanding: paymentBehavior.outstanding.payLater,
      dpOutstanding: paymentBehavior.outstanding.combinationDp,
      activeCustomers,
      newCustomers: newInPeriod,
      totalCustomers,
      avgRating: dashboard.reviewStats.avgRating,
      lowStockCount: lowStockItems.length,
      productionActive: dashboard.productionPipeline.reduce((s, p) => s + p.count, 0),
    },
    orders: {
      daily: dailyOrders,
      statusDonut: orderStatusDonut,
      serviceDonut,
    },
    production: {
      daily: productionDaily,
    },
    stock: {
      byCategory: stockByCategory,
      byBranch: stockByBranch,
      lowStock: lowStockItems,
      movementByType,
      movementDaily,
      totalItems: inventoryItems.length,
      totalValue: stockByCategory.reduce((s, c) => s + c.value, 0),
    },
    customers: {
      dailyNew: newCustomersDaily,
      top: topCustomers,
      loyaltyTop,
    },
  };
}
