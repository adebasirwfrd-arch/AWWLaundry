import { prisma } from '@aww/database';
import { periodRange, lastNDays, formatDayLabel, type DashboardPeriod } from '@/lib/date-buckets';
import { daysInRange } from '@/lib/report-periods';

export interface CashflowFilters {
  organizationId: string;
  branchId?: string;
  period?: DashboardPeriod;
  /** Override rentang tanggal (untuk laporan PDF terjadwal). */
  dateRange?: { start: Date; end: Date };
  /** Semua transaksi tanpa limit (untuk laporan email/CSV). */
  fullExport?: boolean;
  managerBranchId?: string;
}

function branchFilter(filters: CashflowFilters) {
  if (filters.managerBranchId) return { branchId: filters.managerBranchId };
  if (filters.branchId) return { branchId: filters.branchId };
  return { branch: { organizationId: filters.organizationId } };
}

function rowExpenseNet(row: {
  amount: number;
  discount?: number | null;
  netAmount?: number | null;
}) {
  if (row.netAmount != null && row.netAmount > 0) return row.netAmount;
  return Math.max(0, row.amount - (row.discount ?? 0));
}

function groupExpenseByKey<T extends { amount: number; discount?: number | null; netAmount?: number | null }>(
  rows: T[],
  keyFn: (row: T) => string,
  extraFn?: (row: T) => Record<string, string>
) {
  const map = new Map<string, { value: number; count: number; extra: Record<string, string> }>();
  for (const row of rows) {
    const key = keyFn(row);
    const cur = map.get(key) ?? { value: 0, count: 0, extra: extraFn?.(row) ?? {} };
    cur.value += rowExpenseNet(row);
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.entries()].map(([key, v]) => ({ key, value: v.value, count: v.count, extra: v.extra }));
}

export async function fetchCashflowOverview(filters: CashflowFilters) {
  const period = filters.period ?? 'month';
  const range = filters.dateRange ?? periodRange(period);
  const bf = branchFilter(filters);
  const chartDays = filters.dateRange
    ? daysInRange(range.start, range.end)
    : lastNDays(period === 'year' ? 30 : period === 'month' ? 31 : period === 'week' ? 7 : 1);
  const chartStart = chartDays[0] ?? range.start;

  const paymentWhere = {
    ...bf,
    paidAt: { gte: range.start, lte: range.end },
    status: 'PAID' as const,
  };

  const expenseWhere = {
    ...bf,
    date: { gte: range.start, lte: range.end },
  };

  const [
    incomeAgg,
    orderCount,
    weightAgg,
    paymentsByMethod,
    paymentsByBranch,
    periodExpenses,
    chartExpenses,
    recentPayments,
    branches,
    heatmapPayments,
  ] = await Promise.all([
    prisma.payment.aggregate({ where: paymentWhere, _sum: { amount: true }, _count: true }),
    prisma.order.count({
      where: {
        ...bf,
        createdAt: { gte: range.start, lte: range.end },
        paymentStatus: 'PAID',
      },
    }),
    prisma.order.aggregate({
      where: {
        ...bf,
        createdAt: { gte: range.start, lte: range.end },
        paymentStatus: 'PAID',
      },
      _sum: { weightKg: true },
    }),
    prisma.payment.groupBy({
      by: ['method'],
      where: paymentWhere,
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.groupBy({
      by: ['branchId'],
      where: paymentWhere,
      _sum: { amount: true },
      _count: true,
    }),
    prisma.expense.findMany({
      where: expenseWhere,
      include: {
        branch: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.expense.findMany({
      where: {
        ...bf,
        date: { gte: chartStart, lte: range.end },
      },
    }),
    prisma.payment.findMany({
      where: paymentWhere,
      include: {
        order: {
          select: {
            orderNumber: true,
            weightKg: true,
            serviceType: { select: { name: true } },
            customer: { select: { name: true } },
          },
        },
        branch: { select: { name: true } },
        receivedBy: { select: { name: true } },
      },
      orderBy: { paidAt: 'desc' },
      ...(filters.fullExport ? {} : { take: 50 }),
    }),
    prisma.branch.findMany({
      where: { organizationId: filters.organizationId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    }),
    prisma.payment.findMany({
      where: {
        branch: { organizationId: filters.organizationId },
        paidAt: { gte: chartStart, lte: range.end },
        status: 'PAID',
        ...(filters.managerBranchId
          ? { branchId: filters.managerBranchId }
          : filters.branchId
            ? { branchId: filters.branchId }
            : {}),
      },
      select: { paidAt: true, amount: true, branchId: true },
    }),
  ]);

  const chartPayments = await prisma.payment.findMany({
    where: {
      ...bf,
      paidAt: { gte: chartStart, lte: range.end },
      status: 'PAID',
    },
    select: { paidAt: true, amount: true },
  });

  const totalIncome = incomeAgg._sum.amount ?? 0;
  const totalExpense = periodExpenses.reduce((s, e) => s + rowExpenseNet(e), 0);
  const totalCapex = periodExpenses
    .filter((e) => e.type === 'CAPEX')
    .reduce((s, e) => s + rowExpenseNet(e), 0);
  const totalOpex = periodExpenses
    .filter((e) => e.type === 'OPEX')
    .reduce((s, e) => s + rowExpenseNet(e), 0);
  const netCashflow = totalIncome - totalExpense;

  const branchMap = Object.fromEntries(branches.map((b) => [b.id, b.name]));

  const dailyTrend = chartDays.map((day) => {
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    const income = chartPayments
      .filter((p) => p.paidAt >= day && p.paidAt <= dayEnd)
      .reduce((s, p) => s + p.amount, 0);
    const expense = chartExpenses
      .filter((e) => e.date >= day && e.date <= dayEnd)
      .reduce((s, e) => s + rowExpenseNet(e), 0);
    return { date: formatDayLabel(day), income, expense, net: income - expense };
  });

  const incomeByBranch = paymentsByBranch.map((p) => ({
    branchId: p.branchId,
    branchName: branchMap[p.branchId] ?? p.branchId,
    amount: p._sum.amount ?? 0,
    count: p._count,
  }));

  const expenseDonut = groupExpenseByKey(
    periodExpenses,
    (e) => `${e.category}|${e.type}`,
    (e) => ({ category: e.category, type: e.type, name: `${e.category} (${e.type})` })
  ).map((g) => ({
    name: (g.extra.name as string) ?? g.key,
    type: (g.extra.type as string) ?? 'OPEX',
    category: (g.extra.category as string) ?? g.key,
    value: g.value,
    count: g.count,
  }));

  const capexOpexSplit = groupExpenseByKey(periodExpenses, (e) => e.type).map((g) => ({
    name: g.key,
    value: g.value,
    count: g.count,
  }));

  const heatmapBranches =
    filters.branchId || filters.managerBranchId
      ? branches.filter((b) => b.id === (filters.branchId || filters.managerBranchId))
      : branches;

  const heatmap = chartDays.map((day) => {
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    return {
      date: formatDayLabel(day),
      cells: heatmapBranches.map((b) => {
        const amount = heatmapPayments
          .filter((p) => p.branchId === b.id && p.paidAt >= day && p.paidAt <= dayEnd)
          .reduce((s, p) => s + p.amount, 0);
        return { branchId: b.id, branchName: b.name, amount };
      }),
    };
  });

  const maxHeat = Math.max(1, ...heatmap.flatMap((r) => r.cells.map((c) => c.amount)));

  return {
    summary: {
      totalIncome,
      totalExpense,
      totalCapex,
      totalOpex,
      netCashflow,
      orderCount,
      totalWeight: weightAgg._sum.weightKg ?? 0,
      paymentCount: incomeAgg._count,
      expenseCount: periodExpenses.length,
      avgOrderValue: orderCount > 0 ? Math.round(totalIncome / orderCount) : 0,
    },
    paymentMethods: paymentsByMethod.map((p) => ({
      method: p.method,
      amount: p._sum.amount ?? 0,
      count: p._count,
    })),
    incomeByBranch,
    expenseDonut,
    capexOpexSplit,
    dailyTrend,
    heatmap,
    maxHeat,
    incomeTable: recentPayments.map((p) => ({
      id: p.id,
      paidAt: p.paidAt.toISOString(),
      amount: p.amount,
      method: p.method,
      branchName: p.branch.name,
      orderNumber: p.order.orderNumber,
      customerName: p.order.customer.name,
      serviceName: p.order.serviceType.name,
      weightKg: p.order.weightKg,
      receivedBy: p.receivedBy.name,
    })),
    expenseTable: (filters.fullExport ? periodExpenses : periodExpenses.slice(0, 50)).map((e) => ({
      id: e.id,
      date: e.date.toISOString(),
      dueDate: e.dueDate?.toISOString() ?? null,
      proofUrl: e.proofUrl,
      type: e.type,
      category: e.category,
      title: e.title || e.category,
      vendor: e.vendor,
      paymentMethod: e.paymentMethod,
      amount: e.amount,
      discount: e.discount ?? 0,
      netAmount: rowExpenseNet(e),
      branchName: e.branch.name,
      createdBy: e.createdBy.name,
      description: e.description,
    })),
    branches,
  };
}

export async function fetchExpenseCategories(
  organizationId: string,
  type: 'CAPEX' | 'OPEX',
  branchId?: string
) {
  const rows = await prisma.expense.findMany({
    where: {
      type,
      branch: { organizationId },
      ...(branchId ? { branchId } : {}),
    },
    select: { category: true },
    distinct: ['category'],
  });
  return rows.map((r) => r.category);
}
